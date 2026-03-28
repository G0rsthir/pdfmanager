from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import Column, ForeignKey, Table, UniqueConstraint
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
    is_protected: Mapped[bool] = mapped_column(default=True)

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


class ORMUser(Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(unique=True)
    name: Mapped[str]
    # Password hash (nullable for non-local users)
    password_hash: Mapped[bytes | None]
    is_enabled: Mapped[bool] = mapped_column(default=True)

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

        if not self.password_hash:
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
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))

    parent: Mapped["ORMCollection | None"] = relationship(back_populates="children", remote_side="ORMCollection.id")
    children: Mapped[list["ORMCollection"]] = relationship(back_populates="parent", cascade="all, delete-orphan")
    folders: Mapped[list["ORMFolder"]] = relationship(back_populates="collection", cascade="all, delete-orphan")


class ORMFolder(Base):
    __tablename__ = "folders"

    name: Mapped[str]
    collection_id: Mapped[UUID | None] = mapped_column(ForeignKey("collections.id", ondelete="CASCADE"))
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))

    collection: Mapped["ORMCollection | None"] = relationship(back_populates="folders")


file_tags = Table(
    "file_tags",
    Base.metadata,
    Column("file_id", ForeignKey("files.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class ORMFile(Base):
    __tablename__ = "files"

    name: Mapped[str]
    description: Mapped[str | None]
    folder_id: Mapped[UUID | None] = mapped_column(ForeignKey("folders.id", ondelete="SET NULL"))
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    tags: Mapped[list["ORMTag"]] = relationship(secondary=file_tags, lazy="selectin")
    current_page: Mapped[int] = mapped_column(default=1)
    scale: Mapped[str] = mapped_column(default="1.0")
    file_storage: Mapped[str]
    is_favorite: Mapped[bool] = mapped_column(default=False)
    file_size: Mapped[int]
    file_hash: Mapped[str | None]
    page_count: Mapped[int] = mapped_column(default=1)


class ORMTag(Base):
    __tablename__ = "tags"
    __table_args__ = (UniqueConstraint("user_id", "name", name="unique_tag"),)

    name: Mapped[str]
    color: Mapped[str]
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    files: Mapped[list["ORMFile"]] = relationship(secondary=file_tags, back_populates="tags", lazy="noload")


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
