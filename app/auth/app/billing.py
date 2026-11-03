"""Card payments through Stripe Checkout.

The gateway is a small interface so the rest of the service (and its tests) never
talk to Stripe directly. Prices are created in the Stripe dashboard and referenced by
id.
"""

import json
import logging
from typing import Any, Protocol

import stripe

from app import domain
from app.envelope import ApiError

logger = logging.getLogger(__name__)


class SignatureError(Exception):
    """The webhook body was not signed by Stripe."""


class Billing(Protocol):
    def checkout_url(
        self,
        *,
        user_id: str,
        email: str,
        plan: str,
        interval: str,
        customer_id: str | None,
    ) -> str: ...

    def plans(self) -> list[dict]: ...

    def portal_url(self, customer_id: str) -> str: ...

    def parse_event(self, payload: bytes, signature: str) -> dict: ...

    def plan_for_price(self, price_id: str) -> str | None: ...


class DisabledBilling:
    """Used when no Stripe key is configured."""

    def _off(self) -> ApiError:
        return ApiError(503, "Payments are not available right now.")

    def checkout_url(self, **_: Any) -> str:
        raise self._off()

    def plans(self) -> list[dict]:
        return []

    def portal_url(self, customer_id: str) -> str:
        raise self._off()

    def parse_event(self, payload: bytes, signature: str) -> dict:
        raise self._off()

    def plan_for_price(self, price_id: str) -> str | None:
        return None


class StripeBilling:
    def __init__(
        self,
        secret_key: str,
        webhook_secret: str,
        prices: dict[str, dict[str, str]],
        app_url: str,
    ):
        self._client = stripe.StripeClient(secret_key)
        self._webhook_secret = webhook_secret
        # plan -> interval ("month" or "year") -> Stripe price id
        self._prices = {
            plan: {i: p for i, p in by_interval.items() if p}
            for plan, by_interval in prices.items()
        }
        self._plans = {
            price: plan
            for plan, by_interval in self._prices.items()
            for price in by_interval.values()
        }
        self._app_url = app_url.rstrip("/")
        self._catalog: list[dict] | None = None

    def checkout_url(
        self,
        *,
        user_id: str,
        email: str,
        plan: str,
        interval: str,
        customer_id: str | None,
    ) -> str:
        price = self._prices.get(plan, {}).get(interval)
        if price is None:
            raise ApiError(503, "This plan is not available for purchase yet.")
        meta = {"user_id": user_id, "plan": plan}
        params: dict[str, Any] = {
            "mode": "subscription",
            "line_items": [{"price": price, "quantity": 1}],
            "client_reference_id": user_id,
            "metadata": meta,
            "subscription_data": {"metadata": meta},
            "allow_promotion_codes": True,
            "success_url": f"{self._app_url}/subscribe?checkout=success",
            "cancel_url": f"{self._app_url}/subscribe?checkout=cancelled",
        }
        if customer_id:
            params["customer"] = customer_id
        else:
            params["customer_email"] = email
        session = self._client.checkout.sessions.create(params=params)
        return session.url

    def plans(self) -> list[dict]:
        """What each plan costs, as Stripe has it (amounts in the smallest unit)."""
        if self._catalog is None:
            catalog = []
            for plan, by_interval in self._prices.items():
                for interval, price_id in by_interval.items():
                    price = self._client.prices.retrieve(price_id)
                    catalog.append(
                        {
                            "plan": plan,
                            "interval": interval,
                            "amount": price.unit_amount,
                            "currency": price.currency,
                        }
                    )
            self._catalog = catalog
        return self._catalog

    def portal_url(self, customer_id: str) -> str:
        session = self._client.billing_portal.sessions.create(
            params={
                "customer": customer_id,
                "return_url": f"{self._app_url}/subscribe",
            }
        )
        return session.url

    def parse_event(self, payload: bytes, signature: str) -> dict:
        if not self._webhook_secret:
            raise ApiError(503, "Payments are not available right now.")
        try:
            stripe.Webhook.construct_event(payload, signature, self._webhook_secret)
        except (ValueError, stripe.SignatureVerificationError) as exc:
            raise SignatureError(str(exc)) from None
        return json.loads(payload)

    def plan_for_price(self, price_id: str) -> str | None:
        return self._plans.get(price_id)


PAID_PLANS = (domain.PLAN_PRO, domain.PLAN_PRO_PLUS)
