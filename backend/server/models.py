from datetime import UTC, datetime
from typing import Literal
from uuid import UUID

from sqlalchemy import JSON, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from server.infrastructure.database.base import Base, DateTimeUTC


class ORMUserRole(Base):
    __tablename__ = "roles"

    name: Mapped[str] = mapped_column(unique=True)
    description: Mapped[str]
    scopes: Mapped[str]

    # Classification
    entity_type: Mapped[str] = mapped_column(default="role", server_default="role")
    is_protected: Mapped[bool] = mapped_column(default=True)

    def __repr__(self):
        return (
            f"ORMUserRole(id={self.id}, name={self.name}, description='{self.description}',"
            f"is_protected='{self.is_protected}', scopes='{self.scopes}')"
        )

    @property
    def scopes_list(self) -> list[str]:
        return [scope.strip() for scope in self.scopes.split(" ") if scope.strip()]


class ORMAuthProvider(Base):
    """
    Base database schema for auth providers.

    This ORM uses SQLAlchemy's polymorphic identity. The return type will be a subclass of the ORMAuthProvider.
    """

    __tablename__ = "auth_providers"

    name: Mapped[str] = mapped_column(unique=True)
    description: Mapped[str | None]
    is_enabled: Mapped[bool] = mapped_column(default=True)

    # Classification
    entity_type: Mapped[str]
    is_protected: Mapped[bool] = mapped_column(default=False)

    __mapper_args__ = {
        "polymorphic_on": "entity_type",
        "polymorphic_identity": "Base",
    }

    def __repr__(self):
        return (
            f"ORMAuthProvider(id={self.id}, name={self.name}, description='{self.description}',"
            f"is_enabled='{self.is_enabled}', entity_type='{self.entity_type}', is_protected='{self.is_protected}')"
        )

    def can_authenticate(self) -> bool:
        if not self.is_enabled:
            return False

        return True


class ORMAuthProviderLocal(ORMAuthProvider):
    """
    Local auth provider database model.
    """

    __mapper_args__ = {"polymorphic_identity": "LOCAL", "polymorphic_load": "inline"}


class ORMAuthProviderOidc(ORMAuthProvider):
    """
    OIDC auth provider database model.
    """

    client_id: Mapped[str] = mapped_column(nullable=True, use_existing_column=True)
    client_secret: Mapped[str] = mapped_column(nullable=True, use_existing_column=True)
    auto_discovery_url: Mapped[str] = mapped_column(nullable=True, use_existing_column=True)
    additional_scopes: Mapped[str] = mapped_column(nullable=True, use_existing_column=True)
    group_claim_name: Mapped[str] = mapped_column(nullable=True, use_existing_column=True)
    group_claim_rules: Mapped[list] = mapped_column(JSON, nullable=True, use_existing_column=True)
    auto_login: Mapped[bool] = mapped_column(default=False, use_existing_column=True, nullable=True)

    __base_required_scopes: str = "openid profile email"

    __mapper_args__ = {"polymorphic_identity": "OIDC", "polymorphic_load": "inline"}

    @property
    def is_valid(self) -> bool:
        return all(
            isinstance(value, str) and value.strip()
            for value in (
                self.client_id,
                self.client_secret,
                self.group_claim_name,
                self.auto_discovery_url,
            )
        )

    @property
    def required_scope_list(self) -> list[str]:
        required_scopes = self.__base_required_scopes.split(" ")
        if self.additional_scopes != "":
            required_scopes.extend(self.additional_scopes.split(" "))
        return required_scopes

    @property
    def required_scope_list_str(self) -> str:
        return " ".join(self.required_scope_list)


class ORMUser(Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(unique=True)
    name: Mapped[str]
    # Password hash (nullable for non-local users)
    password_hash: Mapped[bytes | None]
    is_enabled: Mapped[bool] = mapped_column(default=True)
    is_external: Mapped[bool] = mapped_column(default=False)

    # Classification
    entity_type: Mapped[str] = mapped_column(default="user", server_default="user")

    # Relationships
    role_id: Mapped[UUID] = mapped_column(ForeignKey("roles.id"))
    role: Mapped["ORMUserRole"] = relationship(lazy="joined")
    auth_provider: Mapped["ORMAuthProvider"] = relationship(lazy="joined")
    auth_provider_id: Mapped[UUID] = mapped_column(ForeignKey("auth_providers.id", ondelete="CASCADE"))

    def can_authenticate(self) -> bool:
        if not self.is_enabled:
            return False

        return True

    def can_authenticate_by_local_password(self) -> bool:
        if not self.can_authenticate():
            return False

        if not self.password_hash or self.is_external:
            return False

        return True

    def __repr__(self):
        return (
            f"ORMUser(id={self.id}, email='{self.email}'"
            f"is_enabled='{self.is_enabled}', role_id={self.role_id}, role={self.role}"
            f"auth_provider={self.auth_provider}, auth_provider_id='{self.auth_provider_id}')"
        )


class ORMCollection(Base):
    __tablename__ = "collections"

    name: Mapped[str]
    parent_id: Mapped[UUID | None] = mapped_column(ForeignKey("collections.id", ondelete="CASCADE"))

    parent: Mapped["ORMCollection | None"] = relationship(back_populates="children", remote_side="ORMCollection.id")
    children: Mapped[list["ORMCollection"]] = relationship(back_populates="parent", cascade="all, delete-orphan")

    # Classification
    entity_type: Mapped[Literal["folder", "group"]]

    def __repr__(self):
        return f"ORMCollection(id={self.id}, name='{self.name}' parent_id='{self.parent_id}')"


class ORMFile(Base):
    __tablename__ = "files"

    name: Mapped[str]
    description: Mapped[str | None]
    storage_key: Mapped[str]
    thumbnail: Mapped[str | None] = mapped_column(default=None)
    content_type: Mapped[str]
    file_size: Mapped[int]
    file_hash: Mapped[str | None]
    page_count: Mapped[int] = mapped_column(default=1)

    # # Relationships
    collection_id: Mapped[UUID] = mapped_column(ForeignKey("collections.id", ondelete="CASCADE"))
    # TODO
    # created_by:

    @property
    def is_pdf(self) -> bool:
        return self.content_type == "application/pdf"


class ORMFileState(Base):
    __tablename__ = "file_states"

    current_page: Mapped[int] = mapped_column(default=1)
    scale: Mapped[str] = mapped_column(default="1.0")
    is_favorite: Mapped[bool] = mapped_column(default=False)

    # Relationships
    file_id: Mapped[UUID] = mapped_column(ForeignKey("files.id", ondelete="CASCADE"))
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))

    def __repr__(self):
        return f"ORMFileState(id={self.id}, user_id={self.user_id}, is_favorite={self.is_favorite} )"


class ORMResourcePermission(Base):
    __tablename__ = "resource_permissions"
    __table_args__ = (UniqueConstraint("resource_id", "user_id", name="unique_permission"),)

    resource_id: Mapped[UUID]
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    permission: Mapped[Literal["owner", "read", "modify"]]

    @property
    def can_modify(self):
        return self.permission in ("owner", "modify")

    @property
    def can_read(self):
        return True

    @property
    def is_owner(self) -> bool:
        return self.permission == "owner"


class ORMTag(Base):
    __tablename__ = "tags"

    name: Mapped[str] = mapped_column(unique=True)


class ORMFileTag(Base):
    __tablename__ = "file_tags"

    file_id: Mapped[UUID] = mapped_column(ForeignKey("files.id", ondelete="CASCADE"), primary_key=True)
    tag_id: Mapped[UUID] = mapped_column(ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)


class ORMUserTagPreference(Base):
    __tablename__ = "user_tag_preferences"

    tag_id: Mapped[UUID] = mapped_column(ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    color: Mapped[str]


class ORMSession(Base):
    __tablename__ = "sessions"

    expires_at: Mapped[datetime] = mapped_column(type_=DateTimeUTC(timezone=True))
    is_revoked: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTimeUTC(timezone=True),
        default=lambda: datetime.now(UTC),
    )

    # Classification
    entity_type: Mapped[str] = mapped_column(default="session", server_default="session")

    # Relationships
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    auth_provider_id: Mapped[UUID | None] = mapped_column(ForeignKey("auth_providers.id", ondelete="SET NULL"))

    def __repr__(self):
        return f"ORMSession(id={self.id}, user_id={self.user_id}, is_valid={self.is_revoked} )"

    @property
    def is_expired(self) -> bool:
        return self.expires_at < datetime.now(UTC)

    def revoke(self) -> None:
        if self.is_revoked:
            raise ValueError("Session is already revoked")

        self.is_revoked = True
        self.revoked_at = datetime.now(UTC)

    def is_elapsed(self, percentage: float) -> bool:
        if self.is_expired:
            return True

        total_lifetime = (self.expires_at - self.created_at).total_seconds()
        elapsed = (datetime.now(UTC) - self.created_at).total_seconds()

        return (elapsed / total_lifetime) >= (percentage / 100)

    @property
    def is_valid(self) -> bool:
        return not (self.is_revoked or self.is_expired)
