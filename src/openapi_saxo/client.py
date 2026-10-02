"""HTTP client for Saxo OpenAPI gateways."""

from __future__ import annotations

from enum import Enum
from typing import Any, Self
from urllib.parse import urlsplit

import httpx


class SaxoEnvironment(Enum):
    """Saxo gateway environments."""

    SIMULATION = "simulation"
    LIVE = "live"

    @property
    def base_url(self) -> str:
        """Return the OpenAPI base URL for this environment."""
        if self is SaxoEnvironment.SIMULATION:
            return "https://gateway.saxobank.com/sim/openapi/"
        return "https://gateway.saxobank.com/openapi/"


class SaxoClient:
    """Send authenticated HTTP requests to a Saxo OpenAPI gateway.

    OAuth token acquisition and refresh are intentionally left to the calling application.
    """

    def __init__(
        self,
        access_token: str,
        environment: SaxoEnvironment = SaxoEnvironment.SIMULATION,
        *,
        timeout: float = 20.0,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        if not access_token or not access_token.strip():
            raise ValueError("access_token must not be empty")
        if timeout <= 0:
            raise ValueError("timeout must be greater than zero")

        self._http = httpx.Client(
            base_url=environment.base_url,
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
            timeout=timeout,
            transport=transport,
        )

    def request(self, method: str, path: str, **kwargs: Any) -> httpx.Response:
        """Send a request to a relative Saxo OpenAPI path."""
        parsed = urlsplit(path)
        normalized_path = parsed.path.lstrip("/")
        if parsed.scheme or parsed.netloc or not normalized_path:
            raise ValueError("path must be a non-empty relative API path")
        if any(segment == ".." for segment in normalized_path.split("/")):
            raise ValueError("path must not contain parent-directory segments")

        if parsed.query:
            kwargs.setdefault("params", parsed.query)
        return self._http.request(method, normalized_path, **kwargs)

    def get(self, path: str, **kwargs: Any) -> httpx.Response:
        """Send a GET request."""
        return self.request("GET", path, **kwargs)

    def post(self, path: str, **kwargs: Any) -> httpx.Response:
        """Send a POST request."""
        return self.request("POST", path, **kwargs)

    def close(self) -> None:
        """Close the underlying HTTP connection pool."""
        self._http.close()

    def __enter__(self) -> Self:
        return self

    def __exit__(self, *_: object) -> None:
        self.close()
