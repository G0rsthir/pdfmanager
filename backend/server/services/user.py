from uuid import UUID

from pydantic import SecretStr

from server.const import AuthProviderTypesEnum, RolesEnum
from server.exceptions import ConfigurationError, FieldError, FieldValidationErrors, InvalidActionError
from server.models import ORMUser
from server.repositories import AuthProviderRepository, RoleRepository, UserRepository
from server.schemas.identity import SetupUser
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


class UserService:
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

    async def update_details(self, user_id: UUID, name: str | None = None, email: str | None = None):
        user = await self.user_repo.get_required(user_id)

        if name is not None:
            user.name = name

        if email is not None:
            user_wth_same_email = await self.user_repo.get_by_email(email=email)
            if user_wth_same_email and user_wth_same_email.id != user_id:
                raise InvalidActionError(rule="email_already_in_use", msg="Email is already in use")
            user.email = email

    async def change_password(
        self, user_id: UUID, password_old: SecretStr, password_new: SecretStr, password_confirm: SecretStr
    ):
        user = await self.user_repo.get_required(user_id)

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
