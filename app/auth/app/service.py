"""Authentication, profile and subscription use cases."""

import hashlib
import logging
import re
import uuid
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

import jwt
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app import avatars, domain, features, mail, reminder
from app.envelope import ApiError, bad_request, not_found, unauthorized
from app.models import LoginTracker, Settings, Subscription, User
from app.otp import OtpService, OtpStatus
from app.tokens import TokenService

logger = logging.getLogger(__name__)

TOKEN_TYPE_BEARER = "Bearer"
MAX_LOOKUP_IDS = 200
MAX_DISPLAY_NAME, MAX_BIO = 50, 255
MIN_AGE, MAX_AGE = 1, 120
MIN_DAILY_GOAL, MAX_DAILY_GOAL = 1, 1000
MIN_RETENTION, MAX_RETENTION = 0.75, 0.97
# Request key -> Settings column, for the on/off switches (both spellings are accepted).
BOOL_SETTINGS = {
    "soundEffects": "sound_effects_enabled",
    "soundEffectsEnabled": "sound_effects_enabled",
    "hapticFeedback": "haptic_feedback_enabled",
    "hapticFeedbackEnabled": "haptic_feedback_enabled",
    "autoPlayAudio": "auto_play_audio",
    "allowReminders": "allow_reminders",
}
RETENTION_KEYS = ("targetRetentionRate", "fsrsTargetRetention")
MAX_DEVICE = 255
NO_ACCOUNT = "No account found for this email. Please sign up."

EMAIL_RE = re.compile(r"^[a-zA-Z0-9_!#$%&’*+/=?`{|}~^.-]+@[a-zA-Z0-9.-]+$")


def valid_email(email: str) -> bool:
    return bool(EMAIL_RE.match(email))


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def parse_uuid(value: str) -> uuid.UUID | None:
    try:
        return uuid.UUID(value)
    except (ValueError, AttributeError, TypeError):
        return None


def _auth_res(access: str, refresh: str) -> dict:
    return {"access_token": access, "refresh_token": refresh, "type": TOKEN_TYPE_BEARER}


def _validate_profile_fields(display_name: str, bio: str, age: int | None) -> None:
    if not display_name.strip():
        raise bad_request("Display name cannot be blank")
    if len(display_name) > MAX_DISPLAY_NAME:
        raise bad_request("Display name must not exceed 50 characters")
    if len(bio) > MAX_BIO:
        raise bad_request("Bio must not exceed 255 characters")
    if age is not None and age < MIN_AGE:
        raise bad_request("Age must be at least 1")
    if age is not None and age > MAX_AGE:
        raise bad_request("Age must not exceed 120")


class AuthService:
    def __init__(
        self,
        db: Session,
        tokens: TokenService,
        otp: OtpService,
        sender: mail.Sender,
        run_async: Callable[[Callable[[], None]], Any],
        now: Callable[[], datetime] = lambda: datetime.now(UTC),
        avatar_storage: avatars.AvatarStorage | None = None,
    ):
        self.db = db
        self.tokens = tokens
        self.otp = otp
        self.sender = sender
        self.run_async = run_async
        self.now = now
        self.avatar_storage = avatar_storage

    # --- authentication ---

    def send_otp(self, email: str, signup: bool = False, username: str = "") -> None:
        """Creates and mails a code.

        Logging in with an address that has no account is refused with a 404 so the web
        app can send the person to sign up; `signup` skips that check (an existing
        account simply logs in).
        """

        _username = username.strip()
        if not valid_email(email):
            raise bad_request("Invalid Email Format")

        if signup:
            if _username == "":
                raise bad_request("Username must be provided when signing up.")

        else:
            user = self._find_user_by_email(email)
            if user is None:
                raise not_found(NO_ACCOUNT)

            _username = user.name

        code = self.otp.issue(email)
        self._send_async(
            "OTP email", email, lambda: self.sender.send_otp(email, code, _username)
        )

    def verify_otp(self, email: str, code: str, name: str, device: str = "") -> dict:
        """Validates the code and, on success, creates the user if needed."""
        if not valid_email(email) or len(code) < 6:
            raise bad_request("Invalid request body")
        user = self._find_user_by_email(email)
        name = name.strip()
        # An unknown address needs a name to sign up with. Refuse before the code is
        # used up, so the person can go back, sign up and still use it.
        if user is None and not name:
            raise not_found(NO_ACCOUNT)
        status = self.otp.verify(email, code)
        if status is not OtpStatus.VALID:
            logger.warning("OTP rejected for %s: %s", mail.mask(email), status.value)
        if status is OtpStatus.INVALID:
            raise bad_request("OTP is invalid. Please try again.")
        if status is OtpStatus.EXPIRED:
            raise not_found("OTP has expired. Please request a new one.")
        if status is OtpStatus.INVALIDATED:
            raise ApiError(
                429,
                "OTP has been invalidated due to too many failed attempts. "
                "Try again after 5 minutes.",
            )
        if user is None:
            user = self._create_user(email, name[:MAX_DISPLAY_NAME])
            logger.info("user %s signed up", mail.mask(email))
            welcome_name = user.name
            self._send_async(
                "welcome email",
                email,
                lambda: self.sender.send_welcome(email, welcome_name),
            )
        logger.info("user %s logged in", mail.mask(email))
        return self._open_session(user, device)

    def refresh(self, refresh_token: str, email: str) -> dict:
        """Swaps a valid refresh token for a new access and refresh token pair."""
        if not refresh_token:
            raise bad_request("Refresh token is required")
        if not valid_email(email):
            raise bad_request("Invalid email format")
        try:
            claims = self.tokens.parse(refresh_token)
        except jwt.PyJWTError:
            claims = None
        if claims is None or claims.get("sub", "").lower() != email.lower():
            logger.warning("refresh rejected for %s: bad token", mail.mask(email))
            raise unauthorized("Invalid or expired refresh token")
        user = self._find_user_by_email(email)
        if user is None:
            raise unauthorized("User not found with email: " + email)
        session = self.db.scalars(
            select(LoginTracker).where(
                LoginTracker.user_id == user.id,
                LoginTracker.hashed_token == _hash(refresh_token),
            )
        ).first()
        now = self.now()
        if session is None or domain.utc(session.expires_at) <= now:
            logger.warning("refresh rejected for %s: token revoked", mail.mask(email))
            raise unauthorized("Invalid refresh token")
        renewed = self.tokens.refresh_token(user.email)
        session.hashed_token = _hash(renewed)
        session.expires_at = now + self.tokens.refresh_ttl
        self.db.commit()
        return _auth_res(self._access_token(user, session.id), renewed)

    def logout(self, user_id: str, session_id: str | None) -> None:
        """Ends this device's session (every session for a token without one)."""
        revoke = delete(LoginTracker).where(LoginTracker.user_id == parse_uuid(user_id))
        if session_id:
            revoke = revoke.where(LoginTracker.id == parse_uuid(session_id))
        self.db.execute(revoke)
        self.db.commit()
        logger.info("user %s logged out", user_id)

    def validate_token(self, user_id: str) -> None:
        """Confirms the token's user still exists."""
        self._current_user(user_id)

    def _open_session(self, user: User, device: str) -> dict:
        """Starts a session for this device and returns its first tokens."""
        now = self.now()
        self.db.execute(
            delete(LoginTracker).where(
                LoginTracker.user_id == user.id, LoginTracker.expires_at <= now
            )
        )
        refresh = self.tokens.refresh_token(user.email)
        session = LoginTracker(
            id=uuid.uuid4(),
            user_id=user.id,
            device=device[:MAX_DEVICE],
            hashed_token=_hash(refresh),
            created_at=now,
            expires_at=now + self.tokens.refresh_ttl,
        )
        self.db.add(session)
        self.db.commit()
        return _auth_res(self._access_token(user, session.id), refresh)

    def _access_token(self, user: User, session_id: uuid.UUID) -> str:
        plan = self._effective_subscription(user.id)[0]
        return self.tokens.access_token(
            str(user.id), user.email, user.role, plan, str(session_id)
        )

    def _effective_subscription(
        self, user_id: uuid.UUID | None
    ) -> tuple[str, str, datetime | None]:
        sub = self.db.get(Subscription, user_id) if user_id else None
        return domain.effective_subscription(
            sub.plan if sub else None,
            sub.status if sub else None,
            sub.expires_at if sub else None,
            self.now(),
        )

    # --- users ---

    def _send_async(self, what: str, to: str, deliver: Callable[[], None]) -> None:
        """Runs a send in the background; a failure is logged, never raised."""

        def run() -> None:
            try:
                deliver()
            except Exception:
                logger.exception("failed to send %s to %s", what, mail.mask(to))

        self.run_async(run)

    def _find_user_by_email(self, email: str) -> User | None:
        return self.db.scalars(
            select(User).where(func.lower(User.email) == email.lower(), ~User.deleted)
        ).first()

    def _create_user(self, email: str, name: str) -> User:
        user = User(email=email, name=name, display_name=name, role=domain.ROLE_USER)
        self.db.add(user)
        self.db.flush()
        self.db.add(Subscription(user_id=user.id, plan=domain.NEW_USER_PLAN))
        self.db.commit()
        return user

    def _find_user(self, user_id: str) -> User | None:
        parsed = parse_uuid(user_id)
        user = self.db.get(User, parsed) if parsed else None
        return None if user is None or user.deleted else user

    def _current_user(self, user_id: str) -> User:
        user = self._find_user(user_id)
        if user is None:
            raise unauthorized("User not found")
        return user

    # --- profile ---

    def _picture(self, stored: str | None) -> str:
        """A displayable URL for the stored picture (presigned for our own keys)."""
        if not avatars.is_key(stored):
            return stored or ""
        return self.avatar_storage.presign_get(stored) if self.avatar_storage else ""

    def _require_avatars(self) -> avatars.AvatarStorage:
        if self.avatar_storage is None:
            raise ApiError(503, "Profile picture uploads are not available")
        return self.avatar_storage

    def request_avatar_upload(self, user_id: str, content_type: str) -> dict:
        """A short-lived form the browser posts the image to, straight to S3."""
        storage = self._require_avatars()
        if content_type not in avatars.ALLOWED_TYPES:
            raise bad_request("Picture must be a JPEG, PNG or WebP image")
        user = self._current_user(user_id)
        key = avatars.new_key(str(user.id), content_type)
        upload = storage.presign_upload(key, content_type)
        return {**upload, "key": key, "maxBytes": avatars.MAX_BYTES}

    def confirm_avatar(self, user_id: str, key: str) -> dict:
        """Makes an uploaded object the user's picture and drops the previous one."""
        storage = self._require_avatars()
        user = self._current_user(user_id)
        if not key.startswith(avatars.user_prefix(str(user.id))):
            raise bad_request("Invalid picture")
        if not storage.exists(key):
            raise bad_request("Picture was not uploaded")
        previous = user.picture_url
        user.picture_url = key
        user.updated_at = self.now()
        self.db.commit()
        if avatars.is_key(previous) and previous != key:
            try:
                storage.delete(previous)
            except Exception:
                logger.warning("could not delete previous avatar", exc_info=True)
        return self.profile(user_id)

    def _ensure_settings(self, user_id: uuid.UUID) -> Settings:
        settings = self.db.scalars(
            select(Settings).where(Settings.user_id == user_id)
        ).first()
        if settings is None:
            settings = Settings(user_id=user_id)
            self.db.add(settings)
            self.db.commit()
        return settings

    def profile(self, user_id: str) -> dict:
        user = self._current_user(user_id)
        st = self._ensure_settings(user.id)
        # Progress fields are placeholders: real progress is owned by the API service.
        return {
            "name": user.name or "",
            "email": user.email,
            "displayName": user.display_name or "",
            "avatarUrl": self._picture(user.picture_url),
            "bio": user.bio or "",
            "settings": {
                "theme": st.theme,
                "language": domain.language_code(st.language),
                "dailyGoal": st.daily_goal,
                "soundEffects": st.sound_effects_enabled,
                "hapticFeedback": st.haptic_feedback_enabled,
                "autoPlayAudio": st.auto_play_audio,
                "fsrsTargetRetention": st.target_retention_rate,
                "targetRetentionRate": st.target_retention_rate,
                "allowReminders": st.allow_reminders,
                "isNewComer": st.is_new_comer,
            },
            "xp": 100,
            "streakDays": 5,
            "totalCardsStudied": 200,
            "totalReviews": 50,
            "retentionRate": 0.85,
            "league": "GOLD",
        }

    def update_profile(
        self, user_id: str, display_name: str, bio: str, age: int | None
    ) -> dict:
        _validate_profile_fields(display_name, bio, age)
        user = self._current_user(user_id)
        user.display_name, user.bio, user.age = display_name, bio, age
        user.updated_at = self.now()
        self.db.commit()
        return self.profile(user_id)

    def update_settings(self, user_id: str, req: dict) -> dict:
        """Saves whichever settings the request carries and ignores the rest."""
        changes: dict[str, Any] = {}
        if "theme" in req:
            theme = (
                domain.parse_theme(req["theme"])
                if isinstance(req["theme"], str)
                else None
            )
            if theme is None:
                raise bad_request("Invalid theme: " + str(req["theme"]))
            changes["theme"] = theme
        if "language" in req:
            language = (
                domain.parse_language(req["language"])
                if isinstance(req["language"], str)
                else None
            )
            if language is None:
                raise bad_request("Invalid language: " + str(req["language"]))
            changes["language"] = language
        if "dailyGoal" in req:
            goal = req["dailyGoal"]
            if (
                isinstance(goal, bool)
                or not isinstance(goal, int)
                or not MIN_DAILY_GOAL <= goal <= MAX_DAILY_GOAL
            ):
                raise bad_request(
                    f"Daily goal must be between {MIN_DAILY_GOAL} and {MAX_DAILY_GOAL}"
                )
            changes["daily_goal"] = goal
        for key, column in BOOL_SETTINGS.items():
            if key in req:
                if not isinstance(req[key], bool):
                    raise bad_request(f"{key} must be true or false")
                changes[column] = req[key]
        for key in RETENTION_KEYS:
            if key in req:
                value = req[key]
                if (
                    isinstance(value, bool)
                    or not isinstance(value, int | float)
                    or not MIN_RETENTION <= value <= MAX_RETENTION
                ):
                    raise bad_request(
                        f"{key} must be between {MIN_RETENTION} and {MAX_RETENTION}"
                    )
                changes["target_retention_rate"] = float(value)
        if not changes:
            raise bad_request("No settings to update")
        user = self._current_user(user_id)
        st = self._ensure_settings(user.id)
        for field, value in changes.items():
            setattr(st, field, value)
        st.updated_at = self.now()
        self.db.commit()
        return self.profile(user_id)

    def study_reminder_ics(self, days: list[int], time: str, timezone: str) -> str:
        """The recurring study event as an iCalendar file body."""
        try:
            return reminder.build_ics(days, time, timezone, self.now())
        except reminder.InvalidReminder as e:
            raise bad_request(str(e)) from None

    def send_study_reminder(
        self, user_id: str, days: list[int], time: str, timezone: str
    ) -> None:
        """Emails the user a recurring calendar event for their study days."""
        ics = self.study_reminder_ics(days, time, timezone)
        user = self._current_user(user_id)
        to, name = user.email, user.name or ""
        self._send_async(
            "study reminder",
            to,
            lambda: self.sender.send_study_reminder(to, name, ics),
        )

    def notify_community_invite(
        self, user_id: str, community_name: str, inviter_name: str
    ) -> None:
        """Tells a user they were added to a community; unknown users are skipped."""
        user = self._find_user(user_id)
        if user is None:
            return
        to, name = user.email, user.name or ""
        self._send_async(
            "community invite",
            to,
            lambda: self.sender.send_community_invite(
                to, name, community_name, inviter_name
            ),
        )

    def set_theme(self, user_id: str, theme: str) -> dict:
        """Remembers the visual theme the user picked, for every device they use."""
        theme = domain.parse_theme(theme)
        if theme is None:
            raise bad_request("Invalid theme")
        user = self._current_user(user_id)
        st = self._ensure_settings(user.id)
        st.theme, st.updated_at = theme, self.now()
        self.db.commit()
        return self.profile(user_id)

    def mark_not_newcomer(self, user_id: str) -> None:
        user = self._current_user(user_id)
        st = self.db.scalars(
            select(Settings).where(Settings.user_id == user.id)
        ).first()
        if st is None:
            raise bad_request(f"Setting not found for user: {user.id}")
        st.is_new_comer, st.updated_at = False, self.now()
        self.db.commit()

    # --- subscription ---

    @staticmethod
    def _subscription_view(plan, status, expires_at) -> dict:
        return {"plan": plan, "status": status, "expiresAt": expires_at}

    def subscription(self, user_id: str) -> dict:
        return self._subscription_view(
            *self._effective_subscription(parse_uuid(user_id))
        )

    def features(self, user_id: str | None) -> dict:
        plan = self.subscription(user_id)["plan"] if user_id else None
        return {
            "plan": plan,
            "features": {f.key: features.resolve(f, plan) for f in features.FEATURES},
        }

    def feature(self, user_id: str | None, key: str) -> dict:
        feature = features.find(key)
        if feature is None:
            raise not_found("Feature not found: " + key)
        plan = self.subscription(user_id)["plan"] if user_id else None
        return {"key": key, **features.resolve(feature, plan), "plan": plan}

    def set_subscription(
        self, user_id: str, plan: str, expires_at: datetime | None
    ) -> dict:
        parsed = parse_uuid(user_id)
        if parsed is None:
            raise bad_request("Invalid user id")
        if not domain.valid_plan(plan):
            raise bad_request("Invalid plan: " + plan)
        user = self.db.get(User, parsed)
        if user is None or user.deleted:
            raise not_found("User not found")
        sub = self.db.get(Subscription, parsed)
        now = self.now()
        if sub is None:
            sub = Subscription(user_id=parsed, started_at=now)
            self.db.add(sub)
        elif sub.plan != plan:
            sub.started_at = now
        sub.plan, sub.status, sub.expires_at = plan, domain.STATUS_ACTIVE, expires_at
        self.db.commit()
        return self._subscription_view(plan, domain.STATUS_ACTIVE, expires_at)

    # --- internal lookup ---

    def lookup_users(self, ids: list[str]) -> list[dict]:
        if not ids:
            return []
        if len(ids) > MAX_LOOKUP_IDS:
            raise bad_request("Too many ids (max 200)")
        parsed = []
        for raw in ids:
            value = parse_uuid(raw)
            if value is None:
                raise bad_request("Invalid id: " + str(raw))
            parsed.append(value)
        rows = self.db.execute(
            select(User, Settings.daily_goal)
            .outerjoin(Settings, Settings.user_id == User.id)
            .where(User.id.in_(parsed), ~User.deleted)
        ).all()
        return [
            {
                "id": str(user.id),
                "name": user.name or "",
                "displayName": user.display_name or "",
                "pictureUrl": self._picture(user.picture_url),
                "dailyGoal": goal if goal is not None else 20,
            }
            for user, goal in rows
        ]
