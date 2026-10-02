# openAPI_saxo

A read-only Saxo OpenAPI demo project. The TypeScript service in [`web/`](web/README.md) handles the
simulation OAuth flow and checks the authenticated connection. A small Python client foundation is
also retained in `src/openapi_saxo` for local API experiments.

## TypeScript demo service

See [`web/README.md`](web/README.md) for its setup, Saxo app settings, secure environment variables,
and Hostinger deployment requirements. The service currently supports Saxo simulation only and does
not place trades.

## Python client foundation

The Python client in `src/openapi_saxo` accepts an access token supplied by the calling application.
It does not implement OAuth authorization or refresh.

### Requirements

- Python 3.12 or later
- [`uv`](https://docs.astral.sh/uv/)

### Set up

From the repository root:

```sh
UV_CACHE_DIR=/tmp/openapi-saxo-uv-cache uv sync --frozen --all-groups --link-mode=copy
```

### Use

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

### Validate

```sh
UV_CACHE_DIR=/tmp/openapi-saxo-uv-cache uv run pytest
UV_CACHE_DIR=/tmp/openapi-saxo-uv-cache uv run ruff check .
UV_CACHE_DIR=/tmp/openapi-saxo-uv-cache uv build
```

The tests use an in-memory HTTP transport and do not contact Saxo or require credentials.
