import logging

from fastapi import APIRouter, Body, Depends, Request
from fastapi.responses import JSONResponse

from app.deps import (
    Principal,
    authenticate,
    get_key_store,
    get_service,
    internal_only,
    optional_principal,
)
from app.envelope import bad_request, ok, respond
from app.keys import KeyStore
from app.schemas import (
    AvatarConfirmReq,
    AvatarUploadReq,
    LookupReq,
    RefreshReq,
    SetSubscriptionReq,
    StudyReminderReq,
    UpdateProfileReq,
    ValidateOtpReq,
)
from app.service import AuthService

CONTEXT_PATH = "/api/auth"
JWKS_PATH = "/.well-known/pub.json"
JWKS_MAX_AGE_SECONDS = 300
MAX_PATCH_BYTES = 1 << 20

logger = logging.getLogger(__name__)

router = APIRouter(prefix=CONTEXT_PATH)
# Served at the root as well: verifiers are configured with a plain host.
root_router = APIRouter()


def _health():
    return {"status": "UP"}


root_router.add_api_route("/actuator/health", _health, tags=["health"])
router.add_api_route("/actuator/health", _health, tags=["health"])


@root_router.get(JWKS_PATH, tags=["jwks"])
@router.get(JWKS_PATH, tags=["jwks"])
def jwks(keys: KeyStore = Depends(get_key_store)):
    """Public keys of every signing key whose tokens may still be valid."""
    document = keys.jwks()
    logger.info(
        "JWKS served: %d key(s) %s",
        len(document["keys"]),
        [k["kid"] for k in document["keys"]],
    )
    return JSONResponse(
        document,
        headers={"Cache-Control": f"public, max-age={JWKS_MAX_AGE_SECONDS}"},
    )


# --- public ---


@router.post("/v1/otp", tags=["otp"])
def create_otp(email: str = "", svc: AuthService = Depends(get_service)):
    svc.send_otp(email)
    return ok("OTP sent successfully to " + email)


@router.post("/v1/otp/validate", tags=["otp"])
def validate_otp(req: ValidateOtpReq, svc: AuthService = Depends(get_service)):
    return ok(
        "Authentication successful.", svc.verify_otp(req.email, req.otp, req.name)
    )


@router.post("/v1/users/refresh-token", tags=["users"])
def refresh_token(req: RefreshReq, svc: AuthService = Depends(get_service)):
    return ok(
        "Token refreshed successfully",
        svc.refresh(req.refresh_token, req.user_email),
    )


# --- authenticated ---


@router.post("/v1/users/logout", tags=["users"])
def logout(
    me: Principal = Depends(authenticate), svc: AuthService = Depends(get_service)
):
    svc.logout(me.user_id)
    return ok("Logged out successfully")


@router.get("/v1/users/validate", tags=["users"])
def validate(
    me: Principal = Depends(authenticate), svc: AuthService = Depends(get_service)
):
    svc.validate_token(me.user_id)
    return ok("Token is valid", {"valid": True})


@router.get("/v1/user-profiles", tags=["profiles"])
def get_profile(
    me: Principal = Depends(authenticate), svc: AuthService = Depends(get_service)
):
    return ok("Profile retrieved successfully", svc.profile(me.user_id))


@router.patch("/v1/user-profiles", tags=["profiles"])
def update_profile(
    req: UpdateProfileReq,
    me: Principal = Depends(authenticate),
    svc: AuthService = Depends(get_service),
):
    res = svc.update_profile(me.user_id, req.displayName, req.bio, req.age)
    return ok("Profile retrieved successfully", res)


@router.patch("/v1/user-profiles/settings", tags=["profiles"])
def update_settings(
    req: dict = Body(...),
    me: Principal = Depends(authenticate),
    svc: AuthService = Depends(get_service),
):
    return ok("Profile retrieved successfully", svc.update_settings(me.user_id, req))


@router.post("/v1/user-profiles/avatar/upload-url", tags=["profiles"])
def avatar_upload_url(
    req: AvatarUploadReq,
    me: Principal = Depends(authenticate),
    svc: AuthService = Depends(get_service),
):
    return ok(
        "Upload URL created", svc.request_avatar_upload(me.user_id, req.contentType)
    )


@router.post("/v1/user-profiles/avatar/confirm", tags=["profiles"])
def avatar_confirm(
    req: AvatarConfirmReq,
    me: Principal = Depends(authenticate),
    svc: AuthService = Depends(get_service),
):
    return ok("Profile picture updated", svc.confirm_avatar(me.user_id, req.key))


@router.post("/v1/user-profiles/study-reminder", tags=["profiles"])
def study_reminder(
    req: StudyReminderReq,
    me: Principal = Depends(authenticate),
    svc: AuthService = Depends(get_service),
):
    svc.send_study_reminder(me.user_id, req.days, req.time, req.timezone)
    return ok("Study reminder sent. Check your inbox to add it to your calendar.")


@router.post("/v1/user-profiles/study-reminder/calendar", tags=["profiles"])
def study_reminder_calendar(
    req: StudyReminderReq,
    me: Principal = Depends(authenticate),
    svc: AuthService = Depends(get_service),
):
    ics = svc.study_reminder_ics(req.days, req.time, req.timezone)
    return ok(
        "Study reminder calendar generated",
        {"filename": "oopsly-study-reminder.ics", "ics": ics},
    )


@router.patch("/v1/user-profiles/settings/newcomer", tags=["profiles"])
def newcomer(
    me: Principal = Depends(authenticate), svc: AuthService = Depends(get_service)
):
    svc.mark_not_newcomer(me.user_id)
    return ok("Updated isNewComer status successfully")


@router.patch("/v1/user-profiles/profile/updates", tags=["profiles"])
async def patch_profile(
    request: Request,
    me: Principal = Depends(authenticate),
    svc: AuthService = Depends(get_service),
):
    if not request.headers.get("content-type", "").startswith(
        "application/json-patch+json"
    ):
        return respond(415, "Content-Type must be application/json-patch+json")
    body = await request.body()
    if len(body) > MAX_PATCH_BYTES:
        raise bad_request("Invalid request body")
    res = svc.patch_profile(me.user_id, body)
    return ok("User profile updated successfully", res)


@router.get("/v1/subscriptions/me", tags=["subscriptions"])
def my_subscription(
    me: Principal = Depends(authenticate), svc: AuthService = Depends(get_service)
):
    return ok("Subscription retrieved successfully", svc.subscription(me.user_id))


@router.get("/v1/features", tags=["features"])
def list_features(
    me: Principal | None = Depends(optional_principal),
    svc: AuthService = Depends(get_service),
):
    return ok("Features retrieved successfully", svc.features(me and me.user_id))


@router.get("/v1/features/{key}", tags=["features"])
def get_feature(
    key: str,
    me: Principal | None = Depends(optional_principal),
    svc: AuthService = Depends(get_service),
):
    return ok("Feature retrieved successfully", svc.feature(me and me.user_id, key))


# --- service-to-service ---


@router.post(
    "/internal/v1/users/lookup",
    tags=["internal"],
    dependencies=[Depends(internal_only)],
)
def lookup(req: LookupReq, svc: AuthService = Depends(get_service)):
    return ok("Users retrieved successfully", svc.lookup_users(req.ids))


@router.put(
    "/internal/v1/subscriptions/{user_id}",
    tags=["internal"],
    dependencies=[Depends(internal_only)],
)
def set_subscription(
    user_id: str, req: SetSubscriptionReq, svc: AuthService = Depends(get_service)
):
    return ok(
        "Subscription updated successfully",
        svc.set_subscription(user_id, req.plan, req.expiresAt),
    )
