from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from server.exceptions import AuthenticationError
from server.models import ORMSession, ORMUser
from server.repositories import AuthProviderRepository, RoleRepository, SessionRepository, UserRepository
from server.schemas.auth import (
    AuthenticateOidcRequest,
    AuthenticatePasswordRequest,
    AuthResult,
    RefreshResult,
    RefreshSessionRequest,
)
from server.security.password import BcryptPasswordHasher
from server.settings import AppEnvSettings


class AuthService:
    def __init__(
        self,
        user_repo: UserRepository,
        role_repo: RoleRepository,
        provider_repo: AuthProviderRepository,
        session_repo: SessionRepository,
        env: AppEnvSettings,
    ):
        self.password_hasher = BcryptPasswordHasher()
        self.user_repo = user_repo
        self.role_repo = role_repo
        self.provider_repo = provider_repo
        self.session_repo = session_repo
        self.env = env

    async def revoke_session(self, session_id: UUID):
        session = await self.session_repo.get_by_id(session_id)
        session.revoke()
        await self.session_repo.commit()

    def _resolve_role_from_groups(self, user_groups: list[str], rules: list[dict]) -> UUID | None:
        for rule in rules:
            if rule["group"] in user_groups:
                return UUID(rule["role_id"])
        return None

    async def authenticate_with_oidc(self, data: AuthenticateOidcRequest) -> AuthResult:
        provider = await self.provider_repo.get_oidc_by_id(data.auth_provider_id)

        if not provider.can_authenticate():
            raise AuthenticationError("Auth provider is disabled or does not support authentication")

        role_id = self._resolve_role_from_groups(data.groups, provider.group_claim_rules or [])
        if not role_id:
            raise AuthenticationError("User does not belong to any authorized group")

        role = await self.role_repo.get_by_id(role_id)

        user = await self.user_repo.get_by_email(data.email)

        if user:
            if not user.can_authenticate():
                raise AuthenticationError("User account is disabled")
            if not user.is_external:
                raise AuthenticationError("User account does not support OIDC authentication")

            user.role_id = role.id
            user.name = data.name
        else:
            user = ORMUser(
                id=uuid4(),
                email=data.email,
                name=data.name,
                password_hash=None,
                auth_provider_id=provider.id,
                role_id=role.id,
                is_external=True,
            )
            self.user_repo.create(user)
            await self.user_repo.flush()

        session_expires_delta = timedelta(minutes=self.env.REFRESH_JWT_LIFESPAN)
        session_expires_at = datetime.now(UTC) + session_expires_delta

        auth_session = ORMSession(
            id=uuid4(),
            user_id=user.id,
            expires_at=session_expires_at,
            auth_provider_id=provider.id,
        )

        self.session_repo.create(auth_session)
        await self.session_repo.commit()

        return AuthResult(
            session_id=auth_session.id,
            user_id=user.id,
            auth_provider_id=provider.id,
            role_id=role.id,
            session_expires_delta=session_expires_delta,
            session_revalidate_delta=timedelta(minutes=self.env.ACCESS_JWT_LIFESPAN),
            scopes=role.scopes_list,
        )

    async def authenticate_with_local_password(self, data: AuthenticatePasswordRequest) -> AuthResult:
        user = await self.user_repo.get_by_email(data.email)
        if not user:
            raise AuthenticationError("User not found")

        if not user.can_authenticate_by_local_password():
            raise AuthenticationError("User account is disabled or does not support local authentication")

        provider = await self.provider_repo.get_local_by_id(user.auth_provider_id)

        role = await self.role_repo.get_by_id(user.role_id)

        if not provider.can_authenticate():
            raise AuthenticationError("Auth provider is disabled or does not support authentication")

        is_valid = self.password_hasher.verify(data.password.get_secret_value(), user.password_hash)

        if not is_valid:
            raise AuthenticationError("Invalid credentials")

        session_expires_delta = timedelta(minutes=self.env.REFRESH_JWT_LIFESPAN)
        session_expires_at = datetime.now(UTC) + session_expires_delta

        auth_session = ORMSession(
            id=uuid4(),
            user_id=user.id,
            expires_at=session_expires_at,
            auth_provider_id=provider.id,
        )

        self.session_repo.create(auth_session)
        await self.session_repo.commit()

        return AuthResult(
            session_id=auth_session.id,
            user_id=user.id,
            auth_provider_id=provider.id,
            role_id=role.id,
            session_expires_delta=session_expires_delta,
            session_revalidate_delta=timedelta(minutes=self.env.ACCESS_JWT_LIFESPAN),
            scopes=role.scopes_list,
        )

    async def refresh_session(self, data: RefreshSessionRequest) -> RefreshResult:

        session = await self.session_repo.get_by_id(data.session_id)

        if not session.is_valid:
            raise AuthenticationError("Session is invalid or expired")

        user = await self.user_repo.get_by_id(session.user_id)

        if not user.can_authenticate():
            raise AuthenticationError("User account is disabled or does not support authentication")

        provider = await self.provider_repo.get_by_id(user.auth_provider_id)

        role = await self.role_repo.get_by_id(user.role_id)

        if not provider.can_authenticate():
            raise AuthenticationError("Auth provider is disabled or does not support authentication")

        session_expires_delta = timedelta(minutes=self.env.REFRESH_JWT_LIFESPAN)
        session_expires_at = datetime.now(UTC) + session_expires_delta

        # Check if session needs rotation
        if not session.is_elapsed(percentage=50):
            return RefreshResult(
                session_id=session.id,
                user_id=user.id,
                auth_provider_id=provider.id,
                role_id=role.id,
                session_expires_delta=session.expires_at - datetime.now(UTC),
                session_revalidate_delta=timedelta(minutes=self.env.ACCESS_JWT_LIFESPAN),
                is_rotated=False,
                scopes=role.scopes_list,
            )

        session.revoke()

        auth_session = ORMSession(
            id=uuid4(),
            user_id=user.id,
            expires_at=session_expires_at,
            auth_provider_id=provider.id,
        )

        self.session_repo.create(auth_session)
        await self.session_repo.commit()

        return RefreshResult(
            session_id=auth_session.id,
            user_id=user.id,
            auth_provider_id=provider.id,
            role_id=role.id,
            session_expires_delta=session_expires_delta,
            session_revalidate_delta=timedelta(minutes=self.env.ACCESS_JWT_LIFESPAN),
            is_rotated=True,
            scopes=role.scopes_list,
        )
