from datetime import UTC, date, datetime
from typing import Literal
from uuid import UUID, uuid4

from sqlalchemy import JSON, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from server.const import SessionTypeEnum
from server.infrastructure.database.base import AuditMixin, Base, DateTimeUTC
from server.schemas.types import Scopes


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


class ORMCollection(Base, AuditMixin):
    __tablename__ = "collections"

    name: Mapped[str]
    parent_id: Mapped[UUID | None] = mapped_column(ForeignKey("collections.id", ondelete="CASCADE"))

    parent: Mapped["ORMCollection | None"] = relationship(back_populates="children", remote_side="ORMCollection.id")
    children: Mapped[list["ORMCollection"]] = relationship(back_populates="parent", cascade="all, delete-orphan")

    # Classification
    entity_type: Mapped[Literal["folder", "group"]]

    def __repr__(self):
        return f"ORMCollection(id={self.id}, name='{self.name}' parent_id='{self.parent_id}')"


class ORMFile(Base, AuditMixin):
    __tablename__ = "files"

    name: Mapped[str]
    description: Mapped[str | None]
    storage_key: Mapped[str]
    thumbnail: Mapped[str]
    thumbnail_content_type: Mapped[str]
    content_type: Mapped[str]
    file_size: Mapped[int]
    file_hash: Mapped[str | None]
    page_count: Mapped[int] = mapped_column(default=1)
    published: Mapped[date | None] = mapped_column(default=None)

    # # Relationships
    collection_id: Mapped[UUID] = mapped_column(ForeignKey("collections.id", ondelete="CASCADE"))

    @property
    def is_pdf(self) -> bool:
        return self.content_type == "application/pdf"


class ORMAuthor(Base):
    __tablename__ = "authors"

    name: Mapped[str] = mapped_column(unique=True)


class ORMFileAuthor(Base):
    __tablename__ = "file_authors"

    file_id: Mapped[UUID] = mapped_column(ForeignKey("files.id", ondelete="CASCADE"), primary_key=True)
    author_id: Mapped[UUID] = mapped_column(ForeignKey("authors.id", ondelete="CASCADE"), primary_key=True)


class ORMFileState(Base, AuditMixin):
    __tablename__ = "file_states"

    current_page: Mapped[int] = mapped_column(default=1)
    scale: Mapped[str] = mapped_column(default="1.0")
    is_favorite: Mapped[bool] = mapped_column(default=False)

    last_read_at: Mapped[datetime | None] = mapped_column(type_=DateTimeUTC(timezone=True), default=None)

    # Relationships
    file_id: Mapped[UUID] = mapped_column(ForeignKey("files.id", ondelete="CASCADE"))
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))

    def __repr__(self):
        return f"ORMFileState(id={self.id}, user_id={self.user_id}, is_favorite={self.is_favorite} )"


class ORMAnnotation(Base, AuditMixin):
    __tablename__ = "annotations"

    page: Mapped[int]
    body: Mapped[str]
    excerpt: Mapped[str]
    color: Mapped[str]
    rects: Mapped[list] = mapped_column(JSON)

    # User-set identifier, used to cross-reference.
    label: Mapped[str | None] = mapped_column(default=None)

    # Relationships
    file_id: Mapped[UUID] = mapped_column(ForeignKey("files.id", ondelete="CASCADE"))
    author_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    def __repr__(self):
        return f"ORMAnnotation(id={self.id}, page={self.page}, excerpt='{self.excerpt}' )"


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

    def __repr__(self):
        return f"ORMResourcePermission(id={self.id}, user_id={self.user_id} permission='{self.permission}')"


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

    session_type: Mapped[str]
    expires_at: Mapped[datetime] = mapped_column(type_=DateTimeUTC(timezone=True))
    is_revoked: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTimeUTC(timezone=True),
        default=lambda: datetime.now(UTC),
    )
    revoked_at: Mapped[datetime | None] = mapped_column(type_=DateTimeUTC(timezone=True), default=None, nullable=True)

    description: Mapped[str | None] = mapped_column(default=None, nullable=True)
    scopes: Mapped[str | None] = mapped_column(default=None, nullable=True)

    # Classification
    entity_type: Mapped[str] = mapped_column(default="session", server_default="session")

    # Relationships
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    auth_provider_id: Mapped[UUID] = mapped_column(ForeignKey("auth_providers.id", ondelete="CASCADE"))

    def __repr__(self):
        return f"ORMSession(id={self.id}, user_id={self.user_id}, is_valid={self.is_revoked}, session_type='{self.session_type}')"

    @property
    def is_service(self) -> bool:
        return self.session_type == SessionTypeEnum.SERVICE

    @property
    def is_interactive(self) -> bool:
        return self.session_type == SessionTypeEnum.INTERACTIVE

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

    @classmethod
    def build_interactive(cls, *, user_id: UUID, auth_provider_id: UUID, expires_at: datetime):
        if expires_at < datetime.now(UTC):
            raise ValueError("Expiration date must be in the future")

        return cls(
            id=uuid4(),
            user_id=user_id,
            auth_provider_id=auth_provider_id,
            expires_at=expires_at,
            session_type=SessionTypeEnum.INTERACTIVE,
        )

    @classmethod
    def build_service(
        cls,
        *,
        user_id: UUID,
        auth_provider_id: UUID,
        expires_at: datetime,
        scopes: Scopes,
        description: str | None = None,
    ):
        if expires_at < datetime.now(UTC):
            raise ValueError("Expiration date must be in the future")

        return cls(
            id=uuid4(),
            user_id=user_id,
            auth_provider_id=auth_provider_id,
            expires_at=expires_at,
            session_type=SessionTypeEnum.SERVICE,
            description=description,
            scopes=scopes.to_str(),
        )
