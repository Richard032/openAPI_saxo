import httpx
import pytest

from openapi_saxo import SaxoClient, SaxoEnvironment


@pytest.mark.parametrize(
    ("environment", "expected_url"),
    [
        (SaxoEnvironment.SIMULATION, "https://gateway.saxobank.com/sim/openapi/port/v1/accounts"),
        (SaxoEnvironment.LIVE, "https://gateway.saxobank.com/openapi/port/v1/accounts"),
    ],
)
def test_get_uses_environment_gateway_and_bearer_token(environment, expected_url):
    observed = {}

    def handler(request):
        observed["url"] = str(request.url)
        observed["authorization"] = request.headers["Authorization"]
        return httpx.Response(200, json={"Data": []})

    with SaxoClient("test-token", environment, transport=httpx.MockTransport(handler)) as client:
        response = client.get("/port/v1/accounts")

    assert response.json() == {"Data": []}
    assert observed == {"url": expected_url, "authorization": "Bearer test-token"}


def test_rejects_absolute_api_urls():
    with (
        SaxoClient("test-token", transport=httpx.MockTransport(lambda _: httpx.Response(200))) as client,
        pytest.raises(ValueError, match="relative API path"),
    ):
        client.get("https://example.com/port/v1/accounts")
