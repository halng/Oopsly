import json
from unittest.mock import MagicMock

import pytest

from app import avatars, deps
from app.main import app
from tests.conftest import INTERNAL_KEY, bearer, login
from tests.test_api import _user_id

BASE = "/api/auth"
UPLOAD = f"{BASE}/v1/user-profiles/avatar/upload-url"
CONFIRM = f"{BASE}/v1/user-profiles/avatar/confirm"


class FakeStorage:
    def __init__(self):
        self.objects: set[str] = set()
        self.deleted: list[str] = []

    def presign_upload(self, key, content_type):
        return {"url": "https://bucket.test", "fields": {"key": key}}

    def presign_get(self, key):
        return f"https://bucket.test/{key}?sig=1"

    def exists(self, key):
        return key in self.objects

    def delete(self, key):
        self.deleted.append(key)


@pytest.fixture
def storage(client):
    fake = FakeStorage()
    app.dependency_overrides[deps.get_avatar_storage] = lambda: fake
    return fake


def _upload(client, tokens, storage, content_type="image/png"):
    res = client.post(
        UPLOAD, json={"contentType": content_type}, headers=bearer(tokens)
    )
    assert res.status_code == 200, res.text
    key = res.json()["data"]["key"]
    storage.objects.add(key)
    return key


def test_upload_flow_sets_a_presigned_avatar(client, storage):
    tokens = login(client)
    uid = _user_id(client, tokens)
    res = client.post(UPLOAD, json={"contentType": "image/png"}, headers=bearer(tokens))
    data = res.json()["data"]
    assert data["key"].startswith(f"avatars/{uid}/") and data["key"].endswith(".png")
    assert data["url"] and data["maxBytes"] == avatars.MAX_BYTES

    storage.objects.add(data["key"])
    done = client.post(CONFIRM, json={"key": data["key"]}, headers=bearer(tokens))
    assert done.status_code == 200
    assert (
        done.json()["data"]["avatarUrl"] == f"https://bucket.test/{data['key']}?sig=1"
    )
    # Every later profile read is presigned again.
    again = client.get(f"{BASE}/v1/user-profiles", headers=bearer(tokens))
    assert again.json()["data"]["avatarUrl"].startswith("https://bucket.test/avatars/")


def test_replacing_the_avatar_deletes_the_old_object(client, storage):
    tokens = login(client)
    first = _upload(client, tokens, storage)
    client.post(CONFIRM, json={"key": first}, headers=bearer(tokens))
    second = _upload(client, tokens, storage, "image/webp")
    client.post(CONFIRM, json={"key": second}, headers=bearer(tokens))
    assert storage.deleted == [first]


def test_only_images_are_accepted(client, storage):
    tokens = login(client)
    for bad in ("image/svg+xml", "text/html", "application/pdf", ""):
        res = client.post(UPLOAD, json={"contentType": bad}, headers=bearer(tokens))
        assert res.status_code == 400


def test_confirm_rejects_foreign_missing_and_malformed_keys(client, storage):
    tokens = login(client)
    other = login(client, email="other@example.com", name="other")
    theirs = _upload(client, other, storage)
    for key in (theirs, "avatars/x/../y.png", "something-else.png", ""):
        res = client.post(CONFIRM, json={"key": key}, headers=bearer(tokens))
        assert res.status_code == 400, key
    mine = f"avatars/{_user_id(client, tokens)}/never-uploaded.png"
    missing = client.post(CONFIRM, json={"key": mine}, headers=bearer(tokens))
    assert missing.status_code == 400
    assert storage.deleted == []


def test_updating_the_profile_cannot_change_the_picture(client, storage):
    tokens = login(client)
    other = login(client, email="other@example.com", name="other")
    theirs = _upload(client, other, storage)
    res = client.patch(
        f"{BASE}/v1/user-profiles",
        json={"displayName": "Me", "bio": "", "pictureUrl": theirs},
        headers=bearer(tokens),
    )
    assert res.status_code == 200
    assert res.json()["data"]["avatarUrl"] == ""


def test_updating_the_profile_keeps_the_avatar_and_presigns_it(client, storage):
    tokens = login(client)
    key = _upload(client, tokens, storage)
    client.post(CONFIRM, json={"key": key}, headers=bearer(tokens))
    res = client.patch(
        f"{BASE}/v1/user-profiles",
        json={"displayName": "Me", "bio": "hi"},
        headers=bearer(tokens),
    )
    assert res.status_code == 200
    assert res.json()["data"]["avatarUrl"] == f"https://bucket.test/{key}?sig=1"


def test_internal_lookup_returns_presigned_pictures(client, storage):
    tokens = login(client)
    uid = _user_id(client, tokens)
    key = _upload(client, tokens, storage)
    client.post(CONFIRM, json={"key": key}, headers=bearer(tokens))
    res = client.post(
        f"{BASE}/internal/v1/users/lookup",
        json={"ids": [uid]},
        headers={"X-Internal-Key": INTERNAL_KEY},
    )
    assert res.json()["data"][0]["pictureUrl"] == f"https://bucket.test/{key}?sig=1"


def test_uploads_are_unavailable_without_a_bucket(client):
    app.dependency_overrides[deps.get_avatar_storage] = lambda: None
    tokens = login(client)
    res = client.post(UPLOAD, json={"contentType": "image/png"}, headers=bearer(tokens))
    assert res.status_code == 503
    assert (
        client.post(CONFIRM, json={"key": "x"}, headers=bearer(tokens)).status_code
        == 503
    )


def test_anonymous_calls_are_rejected(client, storage):
    assert client.post(UPLOAD, json={"contentType": "image/png"}).status_code in (
        401,
        403,
    )
    assert client.post(CONFIRM, json={"key": "x"}).status_code in (401, 403)


def test_s3_storage_signs_a_constrained_post_and_a_get(monkeypatch):
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "k")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "s")
    store = avatars.S3AvatarStorage(
        "bkt", "ap-southeast-1", 600, "http://minio:9000", "http://localhost:9000"
    )
    post = store.presign_upload("avatars/u/a.png", "image/png")
    assert post["url"].startswith("http://localhost:9000")
    assert post["fields"]["key"] == "avatars/u/a.png"
    policy = json.loads(
        __import__("base64").b64decode(post["fields"]["policy"]).decode()
    )
    assert ["content-length-range", 1, avatars.MAX_BYTES] in policy["conditions"]
    assert {"Content-Type": "image/png"} in policy["conditions"]
    assert "X-Amz-Expires=600" in store.presign_get("avatars/u/a.png")


def test_s3_storage_exists_and_delete(monkeypatch):
    from botocore.exceptions import ClientError

    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "k")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "s")
    store = avatars.S3AvatarStorage("bkt", "ap-southeast-1", 60)
    store._ops = MagicMock()
    assert store.exists("k") is True
    store._ops.head_object.side_effect = ClientError({"Error": {}}, "HeadObject")
    assert store.exists("k") is False
    store.delete("k")
    store._ops.delete_object.assert_called_once_with(Bucket="bkt", Key="k")
