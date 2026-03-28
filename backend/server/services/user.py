from pydantic import SecretStr

from server.const import AuthProviderTypesEnum, RolesEnum
from server.exceptions import ConfigurationError, FieldError, FieldValidationErrors, InvalidActionError
from server.models import ORMUser
from server.repositories import AuthProviderRepository, RoleRepository, UserRepository
from server.schemas.identity import SetupUser
from server.security.password import BcryptPasswordHasher


def validate_passwords(password: tuple[str, SecretStr], confirm: tuple[str, SecretStr]):

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
