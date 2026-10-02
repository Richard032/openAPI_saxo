# openAPI_saxo

A small Python client foundation for Saxo OpenAPI. It handles the gateway URL and bearer-token
header; obtain and refresh OAuth tokens through the OAuth flow configured for your Saxo application.

## Requirements

- Python 3.12 or later
- [`uv`](https://docs.astral.sh/uv/)

## Set up

From the repository root:

```sh
UV_CACHE_DIR=/tmp/openapi-saxo-uv-cache uv sync --frozen --all-groups --link-mode=copy
```

## Use

Pass an access token supplied by your application at runtime. Do not commit tokens to the repository.

```python
from openapi_saxo import SaxoClient, SaxoEnvironment

with SaxoClient(access_token=token, environment=SaxoEnvironment.SIMULATION) as client:
    response = client.get("port/v1/accounts")
    response.raise_for_status()
    print(response.json())
```

Use `SaxoEnvironment.LIVE` only with an access token intended for the live environment. The client
does not implement OAuth authorization or refresh; those steps depend on your Saxo application
registration.

## Validate

```sh
UV_CACHE_DIR=/tmp/openapi-saxo-uv-cache uv run pytest
UV_CACHE_DIR=/tmp/openapi-saxo-uv-cache uv run ruff check .
UV_CACHE_DIR=/tmp/openapi-saxo-uv-cache uv build
```

The tests use an in-memory HTTP transport and do not contact Saxo or require credentials.
