from uuid import UUID

from pydantic import SecretStr

from server.const import AuthProviderTypesEnum, RolesEnum
from server.exceptions import ConfigurationError, FieldError, FieldValidationErrors, InvalidActionError
from server.models import ORMAuthProviderOidc, ORMUser
from server.repositories import AuthProviderRepository, RoleRepository, UserRepository
from server.schemas.identity import (
    AuthProviderOidcCreateRequest,
    AuthProviderOidcUpdateRequest,
    OidcGroupRule,
    SetupUser,
    UserCreateRequest,
    UserUpdateRequest,
)
from server.security.password import BcryptPasswordHasher


def validate_passwords(password: tuple[str, SecretStr], confirm: tuple[str, SecretStr]):
    """
    Raising FieldError is API responsibility, but to simplify code and avoid duplication, we can raise it from service layer.
    """
    password_field, password_value = password
    confirm_field, confirm_value = confirm

    if len(password_value.get_secret_value()) < 3:
        raise FieldError(field=password_field, msg="Password must be at least 3 characters long")

    if len(confirm_value.get_secret_value()) < 3:
        raise FieldError(field=confirm_field, msg="Password must be at least 3 characters long")

    if password_value != confirm_value:
        raise FieldValidationErrors(
            FieldError(field=password_field, msg="Passwords do not match"),
            FieldError(field=confirm_field, msg="Passwords do not match"),
        )


class IdentityService:
    def __init__(
        self,
        user_repo: UserRepository,
        role_repo: RoleRepository,
        provider_repo: AuthProviderRepository,
    ):
        self.password_hasher = BcryptPasswordHasher()
        self.user_repo = user_repo
        self.role_repo = role_repo
        self.provider_repo = provider_repo

    async def create_initial_user(self, data: SetupUser):
        if await self.user_repo.is_initial_user_exists():
            raise InvalidActionError(msg="Initial user already created", rule="initial_user_already_created")

        role = await self.role_repo.get_by_name(role_name=RolesEnum.ADMIN)
        provider = await self.provider_repo.get_by_name(provider_name=AuthProviderTypesEnum.LOCAL)

        if role is None:
            raise ConfigurationError(f'Role "{RolesEnum.ADMIN}" not found')

        if provider is None:
            raise ConfigurationError(f'Auth provider "{AuthProviderTypesEnum.LOCAL}" not found')

        validate_passwords(
            password=("password", data.password),
            confirm=("password_confirm", data.password_confirm),
        )

        password_hash = self.password_hasher.hash(data.password.get_secret_value())

        new_user = ORMUser(
            name=data.name,
            email=data.email,
            password_hash=password_hash,
            auth_provider_id=provider.id,
            role_id=role.id,
        )

        self.user_repo.create(new_user)
        await self.user_repo.commit()

    async def patch_local_user_details(self, user_id: UUID, name: str | None = None, email: str | None = None):
        user = await self.user_repo.get_by_id(user_id)

        if user.is_external:
            raise InvalidActionError(
                rule="external_user_details_update_forbidden",
                msg="You cannot update details of an external user",
            )

        if name is not None:
            user.name = name

        if email is not None:
            user_wth_same_email = await self.user_repo.get_by_email(email=email)
            if user_wth_same_email and user_wth_same_email.id != user_id:
                raise InvalidActionError(rule="email_already_in_use", msg="Email is already in use")
            user.email = email

        await self.user_repo.commit()

    async def change_user_password(
        self, user_id: UUID, password_old: SecretStr, password_new: SecretStr, password_confirm: SecretStr
    ):
        user = await self.user_repo.get_by_id(user_id)

        if not user.can_authenticate_by_local_password():
            raise InvalidActionError(
                rule="account_does_not_support_local_authentication",
                msg="User account is disabled or does not support local authentication",
            )

        is_valid = self.password_hasher.verify(password_old.get_secret_value(), user.password_hash)

        if not is_valid:
            raise InvalidActionError(rule="invalid_old_password", msg="Invalid current password")

        validate_passwords(
            password=("password_new", password_new),
            confirm=("password_confirm", password_confirm),
        )

        user.password_hash = self.password_hasher.hash(password_new.get_secret_value())
        await self.user_repo.commit()

    async def reset_user_password(self, user_id: UUID, password: SecretStr, password_confirm: SecretStr):
        user = await self.user_repo.get_by_id(user_id)

        if not user.can_authenticate_by_local_password():
            raise InvalidActionError(
                rule="account_does_not_support_local_authentication",
                msg="User account is disabled or does not support local authentication",
            )

        validate_passwords(
            password=("password", password),
            confirm=("password_confirm", password_confirm),
        )

        user.password_hash = self.password_hasher.hash(password.get_secret_value())
        await self.user_repo.commit()

    async def delete_user(self, request_user_id: UUID, user_id: UUID):
        if user_id == request_user_id:
            raise InvalidActionError("You cannot delete your own account", rule="self_account_deletion_forbidden")

        user = await self.user_repo.get_by_id(user_id)
        await self.user_repo.delete(user)
        await self.user_repo.commit()

    async def create_local_user(self, data: UserCreateRequest):

        is_email_in_use = await self.user_repo.get_by_email(email=data.email)
        if is_email_in_use is not None:
            raise InvalidActionError(rule="email_already_in_use", msg="Email is already in use")

        role = await self.role_repo.get_by_id(data.role_id)
        provider = await self.provider_repo.get_by_name(provider_name=AuthProviderTypesEnum.LOCAL)

        if provider is None:
            raise ConfigurationError(f'Auth provider "{AuthProviderTypesEnum.LOCAL}" not found')

        validate_passwords(
            password=("password", data.password),
            confirm=("password_confirm", data.password_confirm),
        )

        password_hash = self.password_hasher.hash(data.password.get_secret_value())

        new_user = ORMUser(
            name=data.name,
            email=data.email,
            password_hash=password_hash,
            auth_provider_id=provider.id,
            role_id=role.id,
            is_enabled=data.is_enabled,
        )

        self.user_repo.create(new_user)
        await self.user_repo.commit()

    async def update_local_user(self, user_id: UUID, data: UserUpdateRequest):
        user = await self.user_repo.get_by_id(user_id)

        is_email_in_use = await self.user_repo.get_by_email(email=data.email)
        if is_email_in_use and is_email_in_use.id != user_id:
            raise InvalidActionError(rule="email_already_in_use", msg="Email is already in use")

        if not data.is_enabled:
            # Check if we are trying to disable the last admin account
            current_role = await self.role_repo.get_by_id(user.role_id)
            if current_role.name == RolesEnum.ADMIN:
                count = await self.user_repo.count_by_role_id(role_id=current_role.id, only_enabled=True)
                if count == 1:
                    raise InvalidActionError(
                        rule="last_admin_account_disable_forbidden",
                        msg="You cannot disable the last active admin account",
                    )

        role = await self.role_repo.get_by_id(data.role_id)

        user.name = data.name
        user.email = data.email
        user.role_id = role.id
        user.is_enabled = data.is_enabled
        await self.user_repo.commit()

    async def create_oidc_provider(self, data: AuthProviderOidcCreateRequest):
        """
        Creates an empty OIDC provider.

        We need to create empty provider first, because OIDC configuration can be tricky and we want to allow users to fill in correct data before enabling the provider.
        """
        provider = await self.provider_repo.get_by_name(provider_name=data.name)
        if provider is not None:
            raise InvalidActionError(rule="provider_name_already_in_use", msg="Provider name is already in use")

        roles = await self.role_repo.get_list()

        # Future: In future replace with proper implementation
        default_rules = [OidcGroupRule(group=f"PDF_{role.name}", role_id=role.id).model_dump() for role in roles]

        new_provider = ORMAuthProviderOidc(
            name=data.name,
            entity_type=AuthProviderTypesEnum.OIDC,
            is_enabled=False,
            client_id="",
            client_secret="",
            auto_discovery_url="",
            group_claim_name="groups",
            additional_scopes="",
            auto_login=False,
            group_claim_rules=default_rules,
        )

        self.provider_repo.create(new_provider)
        await self.provider_repo.commit()

    async def update_oidc_provider(self, provider_id: UUID, data: AuthProviderOidcUpdateRequest):
        provider = await self.provider_repo.get_oidc_by_id(provider_id)

        provider_with_same_name = await self.provider_repo.get_by_name(provider_name=data.name)
        if provider_with_same_name and provider_with_same_name.id != provider_id:
            raise InvalidActionError(rule="provider_name_already_in_use", msg="Provider name is already in use")

        if data.client_secret.get_secret_value() != "" and not data.client_secret.get_secret_value().startswith("****"):
            provider.client_secret = data.client_secret.get_secret_value()

        provider.name = data.name
        provider.is_enabled = data.is_enabled
        provider.client_id = data.client_id
        provider.auto_discovery_url = str(data.auto_discovery_url)
        provider.group_claim_name = data.group_claim_name
        provider.additional_scopes = data.additional_scopes
        provider.auto_login = data.auto_login
        provider.group_claim_rules = [rule.model_dump() for rule in data.group_claim_rules]

        if data.auto_login is True:
            if not provider.is_valid:
                raise InvalidActionError(
                    rule="invalid_provider_configuration",
                    msg="Provider configuration is invalid. Please fill in all required fields before enabling auto login.",
                )

            # Only one provider can have auto_login enabled, so we need to disable it for all other providers
            await self.provider_repo.disable_auto_login_for_all_providers(except_provider_id=provider_id)

        await self.provider_repo.commit()
