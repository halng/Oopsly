import json
from datetime import UTC, datetime, timedelta

import jwt
import pytest

from app import billing, deps
from app.main import app
from tests.conftest import bearer, login

BASE = "/api/auth"
PRICES = {"price_pro": "PRO", "price_max": "PRO_PLUS"}


class FakeBilling:
    """Stands in for Stripe: signatures are valid when they say 'good'."""

    def __init__(self):
        self.checkouts = []
        self.portals = []

    def checkout_url(self, *, user_id, email, plan, interval, customer_id):
        self.checkouts.append((user_id, email, plan, interval, customer_id))
        return f"https://stripe.test/pay/{plan}"

    def plans(self):
        return [{"plan": "PRO", "interval": "month", "amount": 999, "currency": "usd"}]

    def portal_url(self, customer_id):
        self.portals.append(customer_id)
        return "https://stripe.test/portal"

    def parse_event(self, payload, signature):
        if signature != "good":
            raise billing.SignatureError("bad")
        return json.loads(payload)

    def plan_for_price(self, price_id):
        return PRICES.get(price_id)


@pytest.fixture
def stripe(client):
    fake = FakeBilling()
    app.dependency_overrides[deps.get_billing] = lambda: fake
    yield fake
    app.dependency_overrides.pop(deps.get_billing, None)


def user_id(tokens):
    return jwt.decode(tokens["access_token"], options={"verify_signature": False})["id"]


def send(client, event, signature="good"):
    return client.post(
        f"{BASE}/v1/billing/webhook",
        content=json.dumps(event),
        headers={"stripe-signature": signature},
    )


def plan_of(client, tokens):
    res = client.get(f"{BASE}/v1/subscriptions/me", headers=bearer(tokens))
    return res.json()["data"]


def paid(client, tokens, plan="PRO", customer="cus_1", sub="sub_1"):
    event = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "client_reference_id": user_id(tokens),
                "customer": customer,
                "subscription": sub,
                "metadata": {"user_id": user_id(tokens), "plan": plan},
            }
        },
    }
    assert send(client, event).status_code == 200


def test_checkout_needs_a_login_and_a_paid_plan(client, stripe):
    url = f"{BASE}/v1/billing/checkout"
    assert client.post(url, json={"plan": "PRO"}).status_code == 401
    tokens = login(client)
    for plan in ("FREE", "GOLD", ""):
        res = client.post(url, json={"plan": plan}, headers=bearer(tokens))
        assert res.status_code == 400
    assert stripe.checkouts == []


def test_checkout_returns_the_stripe_page(client, stripe):
    tokens = login(client)
    res = client.post(
        f"{BASE}/v1/billing/checkout", json={"plan": "PRO"}, headers=bearer(tokens)
    )
    assert res.status_code == 200
    assert res.json()["data"] == {"url": "https://stripe.test/pay/PRO"}
    assert stripe.checkouts == [
        (user_id(tokens), "test@quizi.dev", "PRO", "month", None)
    ]


def test_paying_upgrades_the_plan_and_remembers_the_stripe_ids(client, stripe):
    tokens = login(client)
    assert plan_of(client, tokens)["plan"] == "FREE"
    paid(client, tokens, "PRO")
    assert plan_of(client, tokens)["plan"] == "PRO"

    again = client.post(
        f"{BASE}/v1/billing/checkout", json={"plan": "PRO"}, headers=bearer(tokens)
    )
    assert again.status_code == 400  # already on it

    client.post(
        f"{BASE}/v1/billing/checkout", json={"plan": "PRO_PLUS"}, headers=bearer(tokens)
    )
    assert stripe.checkouts[-1][4] == "cus_1"  # reuses the Stripe customer


def test_a_new_login_carries_the_paid_plan(client, stripe):
    tokens = login(client)
    paid(client, tokens, "PRO_PLUS")
    claims = jwt.decode(
        login(client)["access_token"], options={"verify_signature": False}
    )
    assert claims["plan"] == "PRO_PLUS"


def test_renewal_sets_the_end_of_the_paid_period(client, stripe):
    tokens = login(client)
    paid(client, tokens, "PRO")
    end = int((datetime.now(UTC) + timedelta(days=30)).timestamp())
    event = {
        "type": "customer.subscription.updated",
        "data": {
            "object": {
                "id": "sub_1",
                "customer": "cus_1",
                "status": "active",
                "current_period_end": end,
                "items": {"data": [{"price": {"id": "price_max"}}]},
            }
        },
    }
    assert send(client, event).status_code == 200
    sub = plan_of(client, tokens)
    assert sub["plan"] == "PRO_PLUS"  # switched in the portal
    assert sub["expiresAt"] is not None


def test_a_lapsed_period_falls_back_to_free(client, stripe):
    tokens = login(client)
    paid(client, tokens, "PRO")
    old = int((datetime.now(UTC) - timedelta(days=10)).timestamp())
    event = {
        "type": "customer.subscription.updated",
        "data": {
            "object": {
                "id": "sub_1",
                "status": "active",
                "current_period_end": old,
                "items": {"data": [{"price": {"id": "price_pro"}}]},
            }
        },
    }
    send(client, event)
    assert plan_of(client, tokens)["plan"] == "FREE"


def test_cancelling_returns_to_free(client, stripe):
    tokens = login(client)
    paid(client, tokens, "PRO")
    event = {
        "type": "customer.subscription.deleted",
        "data": {"object": {"id": "sub_1", "customer": "cus_1"}},
    }
    assert send(client, event).status_code == 200
    assert plan_of(client, tokens)["plan"] == "FREE"


def test_a_failed_card_keeps_the_plan_while_stripe_retries(client, stripe):
    tokens = login(client)
    paid(client, tokens, "PRO")
    event = {
        "type": "customer.subscription.updated",
        "data": {"object": {"id": "sub_1", "status": "past_due"}},
    }
    send(client, event)
    assert plan_of(client, tokens)["plan"] == "PRO"


def test_the_webhook_refuses_unsigned_calls_and_ignores_other_events(client, stripe):
    assert send(client, {"type": "x"}, signature="forged").status_code == 400
    assert send(client, {"type": "invoice.created", "data": {}}).status_code == 200
    # an event for nobody changes nothing and does not fail
    unknown = {
        "type": "checkout.session.completed",
        "data": {"object": {"client_reference_id": "nope", "metadata": {}}},
    }
    assert send(client, unknown).status_code == 200


def test_portal_is_for_people_who_have_paid(client, stripe):
    tokens = login(client)
    url = f"{BASE}/v1/billing/portal"
    assert client.post(url).status_code == 401
    assert client.post(url, headers=bearer(tokens)).status_code == 400
    paid(client, tokens)
    res = client.post(url, headers=bearer(tokens))
    assert res.json()["data"] == {"url": "https://stripe.test/portal"}
    assert stripe.portals == ["cus_1"]


def test_payments_are_off_without_a_stripe_key(client):
    app.dependency_overrides[deps.get_billing] = billing.DisabledBilling
    try:
        tokens = login(client)
        res = client.post(
            f"{BASE}/v1/billing/checkout",
            json={"plan": "PRO"},
            headers=bearer(tokens),
        )
        assert res.status_code == 503
    finally:
        app.dependency_overrides.pop(deps.get_billing, None)


def _signed(payload: bytes, secret: str) -> str:
    import hashlib
    import hmac
    import time

    ts = int(time.time())
    mac = hmac.new(
        secret.encode(), f"{ts}.".encode() + payload, hashlib.sha256
    ).hexdigest()
    return f"t={ts},v1={mac}"


def test_stripe_signatures_are_checked_for_real():
    gateway = billing.StripeBilling(
        "sk_test_x",
        "whsec_test",
        {"PRO": {"month": "price_pro", "year": ""}},
        "https://quizi.tech",
    )
    body = json.dumps({"type": "ping"}).encode()
    assert gateway.parse_event(body, _signed(body, "whsec_test")) == {"type": "ping"}
    with pytest.raises(billing.SignatureError):
        gateway.parse_event(body, _signed(body, "other_secret"))
    with pytest.raises(billing.SignatureError):
        gateway.parse_event(body + b" ", _signed(body, "whsec_test"))
    assert gateway.plan_for_price("price_pro") == "PRO"
    assert gateway.plan_for_price("price_x") is None


def test_yearly_billing_is_chosen_with_the_interval(client, stripe):
    tokens = login(client)
    url = f"{BASE}/v1/billing/checkout"
    res = client.post(
        url, json={"plan": "PRO", "interval": "year"}, headers=bearer(tokens)
    )
    assert res.status_code == 200
    assert stripe.checkouts[-1][3] == "year"
    bad = client.post(
        url, json={"plan": "PRO", "interval": "week"}, headers=bearer(tokens)
    )
    assert bad.status_code == 400


def test_plan_prices_are_public(client, stripe):
    data = client.get(f"{BASE}/v1/billing/plans").json()["data"]
    assert data["enabled"] is True
    assert data["plans"][0]["amount"] == 999


def test_plan_prices_are_empty_without_stripe(client):
    app.dependency_overrides[deps.get_billing] = billing.DisabledBilling
    try:
        data = client.get(f"{BASE}/v1/billing/plans").json()["data"]
        assert data == {"enabled": False, "plans": []}
    finally:
        app.dependency_overrides.pop(deps.get_billing, None)


def test_placeholder_or_missing_keys_leave_payments_off(monkeypatch):
    from app.config import settings

    deps.get_billing.cache_clear()
    for value in ("", "unset"):
        monkeypatch.setattr(settings, "stripe_secret_key", value)
        deps.get_billing.cache_clear()
        assert isinstance(deps.get_billing(), billing.DisabledBilling)
    monkeypatch.setattr(settings, "stripe_secret_key", "sk_test_123")
    monkeypatch.setattr(settings, "stripe_price_pro_monthly", "unset")
    monkeypatch.setattr(settings, "stripe_price_pro_yearly", "price_y")
    deps.get_billing.cache_clear()
    live = deps.get_billing()
    assert isinstance(live, billing.StripeBilling)
    assert live.plan_for_price("unset") is None
    assert live.plan_for_price("price_y") == "PRO"
    deps.get_billing.cache_clear()
