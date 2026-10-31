from datetime import datetime

from pydantic import BaseModel


class ValidateOtpReq(BaseModel):
    email: str = ""
    otp: str = ""
    name: str = ""


class RefreshReq(BaseModel):
    refresh_token: str = ""
    user_email: str = ""


class UpdateProfileReq(BaseModel):
    displayName: str = ""
    bio: str = ""
    age: int | None = None


class SetSubscriptionReq(BaseModel):
    plan: str = ""
    expiresAt: datetime | None = None


class LookupReq(BaseModel):
    ids: list[str] = []


class CommunityInviteNotificationReq(BaseModel):
    userId: str = ""
    communityName: str = ""
    inviterName: str = ""


class StudyReminderReq(BaseModel):
    days: list[int] = []
    time: str = ""
    timezone: str = ""


class AvatarUploadReq(BaseModel):
    contentType: str = ""


class AvatarConfirmReq(BaseModel):
    key: str = ""
