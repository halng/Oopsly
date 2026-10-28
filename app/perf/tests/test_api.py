from contextlib import contextmanager

from oopsly_perf.api import Api


class FakeResponse:
    def __init__(self, status, body=None):
        self.status_code = status
        self._body = body
        self.outcome = None

    def json(self):
        if self._body is None:
            raise ValueError("no body")
        return self._body

    def success(self):
        self.outcome = "success"

    def failure(self, message):
        self.outcome = f"failure: {message}"


class FakeClient:
    def __init__(self, response):
        self.response = response
        self.calls = []

    @contextmanager
    def request(self, method, url, **kwargs):
        self.calls.append((method, url, kwargs))
        yield self.response


def run(response, **kwargs):
    client = FakeClient(response)
    data = Api(client).call("GET", "/v1/shelves/{id}", path={"id": "7"}, **kwargs)
    return client, data


def test_names_requests_after_the_template_and_sends_the_token():
    client, data = run(FakeResponse(200, {"isSuccess": True, "data": {"id": "1"}}), token="jwt")
    method, url, kwargs = client.calls[0]
    assert (method, url) == ("GET", "/v1/shelves/7")
    assert kwargs["name"] == "/v1/shelves/{id}"
    assert kwargs["headers"] == {"Authorization": "Bearer jwt"}
    assert data == {"id": "1"}


def test_unexpected_status_is_a_failure():
    response = FakeResponse(500, {"isSuccess": False})
    _, data = run(response)
    assert data is None
    assert response.outcome.startswith("failure: HTTP 500")


def test_expected_error_statuses_pass():
    response = FakeResponse(400, {"isSuccess": False, "message": "no coins"})
    _, data = run(response, expect=(200, 400))
    assert data is None
    assert response.outcome == "success"


def test_envelope_failure_on_a_2xx_is_a_failure():
    response = FakeResponse(200, {"isSuccess": False, "message": "nope"})
    _, data = run(response)
    assert data is None
    assert "isSuccess=false" in response.outcome


def test_non_json_bodies_are_fine():
    response = FakeResponse(200)
    _, data = run(response)
    assert data is None
    assert response.outcome == "success"
