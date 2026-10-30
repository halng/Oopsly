"""Profile pictures live in a private S3 bucket and are handed out as short-lived
presigned URLs. The database stores only the object key."""

import uuid
from typing import Protocol

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

KEY_PREFIX = "avatars/"
MAX_BYTES = 2 * 1024 * 1024
# content type -> file extension
ALLOWED_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


def user_prefix(user_id: str) -> str:
    return f"{KEY_PREFIX}{user_id}/"


def new_key(user_id: str, content_type: str) -> str:
    return f"{user_prefix(user_id)}{uuid.uuid4().hex}.{ALLOWED_TYPES[content_type]}"


def is_key(value: str | None) -> bool:
    """True when a stored picture value is one of our object keys, not a URL."""
    return bool(value) and value.startswith(KEY_PREFIX)


class AvatarStorage(Protocol):
    def presign_upload(self, key: str, content_type: str) -> dict: ...

    def presign_get(self, key: str) -> str: ...

    def exists(self, key: str) -> bool: ...

    def delete(self, key: str) -> None: ...


class S3AvatarStorage:
    def __init__(
        self,
        bucket: str,
        region: str,
        url_ttl_seconds: int,
        endpoint_url: str = "",
        public_endpoint_url: str = "",
    ):
        self.bucket = bucket
        self.ttl = url_ttl_seconds
        config = Config(signature_version="s3v4", s3={"addressing_style": "path"})

        def client(endpoint: str):
            return boto3.client(
                "s3",
                region_name=region or None,
                endpoint_url=endpoint or None,
                config=config,
            )

        # Presigning is offline, so the signer can use the address browsers reach
        # (e.g. localhost for MinIO) while object calls use the internal one.
        self._ops = client(endpoint_url)
        self._signer = client(public_endpoint_url or endpoint_url)

    def presign_upload(self, key: str, content_type: str) -> dict:
        post = self._signer.generate_presigned_post(
            self.bucket,
            key,
            Fields={"Content-Type": content_type},
            Conditions=[
                {"Content-Type": content_type},
                ["content-length-range", 1, MAX_BYTES],
            ],
            ExpiresIn=300,
        )
        return {"url": post["url"], "fields": post["fields"]}

    def presign_get(self, key: str) -> str:
        return self._signer.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=self.ttl,
        )

    def exists(self, key: str) -> bool:
        try:
            self._ops.head_object(Bucket=self.bucket, Key=key)
        except ClientError:
            return False
        return True

    def delete(self, key: str) -> None:
        self._ops.delete_object(Bucket=self.bucket, Key=key)
