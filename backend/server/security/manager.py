from collections.abc import Awaitable, Callable, Collection
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from fastapi import Request
from fastapi.security import OAuth2PasswordBearer, SecurityScopes
from pydantic import SecretBytes

from server.exceptions import (
    InsufficientPermissionsException,
    InvalidCredentialsException,
)

"""
Modified version of https://github.com/maxrdu/fastapi_login
"""


class AuthManager[T](OAuth2PasswordBearer):
    def __init__(
        self,
        secret: str | bytes,
        token_url: str,
        context_callback: Callable[[dict[str, Any]], Awaitable[T]],
        use_cookie=False,
        use_header=True,
        cookie_name: str = "access-token",
        not_authenticated_exception: Exception | None = None,
        default_expiry: timedelta = timedelta(minutes=15),
        scopes: dict[str, str] | None = None,
        out_of_scope_exception: Exception | None = None,
    ):
        """
        Initializes AuthManager

        Args:
            algorithm (str): Should be "HS256" or "RS256" used to decrypt the JWT
            token_url (str): The url where the user can login to get the token
            use_cookie (bool): Set if cookies should be checked for the token
            use_header (bool): Set if headers should be checked for the token
            cookie_name (str): Name of the cookie to check for the token
            not_authenticated_exception (Exception): Exception to raise when the user is not authenticated
            default_expiry (datetime.timedelta): The default expiry time of the token, defaults to 15 minutes
            scopes (Dict[str, str]): Scopes argument of OAuth2PasswordBearer for more information see
                `https://fastapi.tiangolo.com/advanced/security/oauth2-scopes/#oauth2-security-scheme`
            out_of_scope_exception (Exception): Exception to raise when the user is out of scopes
        """
        if use_cookie is False and use_header is False:
            raise AttributeError("use_cookie and use_header are both False one of them needs to be True")
        if isinstance(secret, str):
            secret = secret.encode()

        self.secret = SecretBytes(secret)
        self.oauth_scheme = None
        self.use_cookie = use_cookie
        self.use_header = use_header
        self.cookie_name = cookie_name
        self.default_expiry = default_expiry
        self.algorithm = "HS256"
        self.token_url = token_url

        # private
        self._context_callback = context_callback
        self._not_authenticated_exception = not_authenticated_exception
        self._out_of_scope_exception = out_of_scope_exception

        # we take over the exception raised possibly by setting auto_error to False
        super().__init__(tokenUrl=token_url, auto_error=False, scopes=scopes)

    @property
    def out_of_scope_exception(self):
        """
        Exception raised when the user is out of scope.
        """
        if self._out_of_scope_exception:
            return self._out_of_scope_exception
        return InsufficientPermissionsException

    @property
    def not_authenticated_exception(self):
        """
        Exception raised when no (valid) token is present.
        """
        if self._not_authenticated_exception:
            return self._not_authenticated_exception
        return InvalidCredentialsException

    @property
    def secret_value(self):
        return self.secret.get_secret_value()

    def _get_payload(self, token: str) -> dict[str, Any]:
        """
        Returns the decoded token payload.

        Args:
            token (str): The token to decode

        Returns:
            Payload of the token

        Raises:
            AuthManager.not_authenticated_exception: The token is invalid
        """
        try:
            payload = jwt.decode(token, self.secret_value, algorithms=[self.algorithm])
            return payload

        # This includes all errors raised by pyjwt
        except jwt.PyJWTError:
            raise self.not_authenticated_exception from None

    def _has_scopes(self, payload: dict[str, Any], required_scopes: SecurityScopes | None) -> bool:
        """
        Returns true if the required scopes are present in the token

        Args:
            payload (Dict[str, Any]): The decoded JWT payload
            required_scopes: The scopes required to access this route

        Returns:
            True if the required scopes are contained in the tokens payload
        """
        if required_scopes is None or not required_scopes.scopes:
            # According to RFC 6749, the scopes are optional
            return True

        # when the manager was invoked using fastapi.Security(manager, scopes=[...])
        # we have to check if all required scopes are contained in the token
        provided_scopes = payload.get("scopes", [])
        # Check if enough scopes are present
        if len(provided_scopes) < len(required_scopes.scopes):
            return False
        # Check if all required scopes are present
        elif any(scope not in provided_scopes for scope in required_scopes.scopes):
            return False

        return True

    async def _get_current_context(self, payload: dict[str, Any]):
        """
        Get parssed context

        Args:
            payload: The decoded JWT payload

        Returns:
            The context object returned by the instances `_context_callback`

        Raises:
            AuthManager.not_authenticated_exception: The token is invalid or None was returned by `_load_context`
        """

        context = await self._load_context(payload)
        if context is None:
            raise self.not_authenticated_exception

        return context

    async def _load_context(self, payload: dict[str, Any]):
        """
        This loads the context using the context_callback

        Args:
            payload: The payload expected by `_context_callback`

        Returns:
            The context object returned by `_context_callback` or None

        Raises:
            Exception: When no ``context_callback`` has been set
        """

        return await self._context_callback(payload)

    def create_access_token(
        self,
        *,
        data: dict,
        expires: timedelta | None = None,
        scopes: Collection[str] | None = None,
    ) -> str:
        """
        Helper function to create the encoded access token

        Args:
            data (dict): The data which should be stored in the token
            expires (datetime.timedelta):  An optional timedelta in which the token expires.
                Defaults to 15 minutes
            scopes (Collection): Optional scopes the token user has access to.

        Returns:
            The encoded JWT with the data and the expiry. The expiry is
            available under the 'exp' key
        """

        to_encode = data.copy()

        if expires:
            expires_in = datetime.now(UTC) + expires
        else:
            expires_in = datetime.now(UTC) + self.default_expiry

        to_encode.update({"exp": expires_in})

        if scopes is not None:
            unique_scopes = set(scopes)
            to_encode.update({"scopes": list(unique_scopes)})

        return jwt.encode(to_encode, self.secret_value, self.algorithm)

    def _token_from_cookie(self, request: Request) -> str | None:
        """
        Checks the requests cookies for cookies with the value of`self.cookie_name` as name

        Args:
            request (fastapi.Request): The request to the route, normally filled in automatically

        Returns:
            The access token found in the cookies of the request or None
        """
        return request.cookies.get(self.cookie_name) or None

    async def _get_token(self, request: Request):
        """
        Tries to extract the token from the request, based on self.use_header and self.use_cookie

        Args:
            request: The request containing the token

        Returns:
            The in the request contained encoded JWT token

        Raises:
            AuthManager.not_authenticated_exception if no token is present
        """
        token = None
        if self.use_cookie:
            token = self._token_from_cookie(request)

        if not token and self.use_header:
            token = await super().__call__(request)

        if not token:
            raise self.not_authenticated_exception

        return token

    async def __call__(
        self,
        request: Request,
        security_scopes: SecurityScopes = None,  # type: ignore
    ) -> T:
        """
        Provides the functionality to act as a Dependency

        Args:
            request:The incoming request, this is set automatically
                by FastAPI

        Returns:
            The context object or None

        Raises:
            AuthManager.not_authenticated_exception: If set by the context_callback and `self.auto_error` is set to False

        """
        token = await self._get_token(request)
        payload = self._get_payload(token)

        if not self._has_scopes(payload, security_scopes):
            raise self.out_of_scope_exception

        return await self._get_current_context(payload)
