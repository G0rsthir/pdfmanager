from uuid import UUID

from fastapi import Request, Response

from server.const import NotificationType
from server.infrastructure.opds.document import OpdsFeed, OpdsLinkType, OpdsRel, OpenSearchDescription
from server.infrastructure.opds.render import render_feed, render_opensearch
from server.models import ORMAnnotation, ORMAuthProviderOidc, ORMSession, ORMUser
from server.repositories import FileWithDetails
from server.schemas.identity import AuthProviderOidcResponse, UserSummaryResponse
from server.schemas.library import (
    AnnotationResponse,
    AuthorResponse,
    DuplicateFileGroupResponse,
    FileResponse,
    FileStateResponse,
    LibraryTreeNode,
    TagResponse,
)
from server.schemas.notifications import DuplicateFilesNotificationResponse, NotificationResponse
from server.schemas.security import ApiKeyResponse
from server.services.library import DuplicateFileGroup, LibraryTree
from server.services.notifications import DuplicateFilesNotification, Notification


def build_oidc_provider_response(provider: ORMAuthProviderOidc, request: Request) -> AuthProviderOidcResponse:
    """
    Adds additional attributes to the AuthProviderOIDCResponse
    """

    response = AuthProviderOidcResponse(
        **provider.__dict__,
        redirect_url=str(request.url_for("oidc_callback", id=provider.id)),
        authorize_url=str(request.url_for("oidc_authorize", id=provider.id)),
    )

    return response


def build_file_response(file_details: FileWithDetails, user_id: UUID) -> FileResponse:
    return FileResponse(
        **file_details.file.__dict__,
        state=FileStateResponse.model_validate(file_details.state)
        if file_details.state
        else FileStateResponse.with_defaults(),
        tags=[TagResponse.model_validate(tag) for tag in file_details.tags],
        authors=[AuthorResponse.model_validate(author) for author in file_details.authors],
        target_permission=file_details.target_resource_permission.permission,
    )


def build_duplicate_file_group_response(group: DuplicateFileGroup, user_id: UUID) -> DuplicateFileGroupResponse:
    return DuplicateFileGroupResponse(
        file_hash=group.file_hash,
        files=[build_file_response(file, user_id=user_id) for file in group.files],
    )


def build_notification_response(notification: Notification) -> NotificationResponse:
    match notification:
        case DuplicateFilesNotification():
            return DuplicateFilesNotificationResponse(
                type=NotificationType.DUPLICATE_FILES,
                count=notification.count,
                group_count=notification.group_count,
            )


def build_library_tree_response(tree: LibraryTree, user_id: UUID) -> list[LibraryTreeNode]:
    nodes = {
        c.id: LibraryTreeNode(
            id=c.id,
            name=c.name,
            entity_type=c.entity_type,
            parent_id=c.parent_id,
            children=[],
            target_user_id=tree.target_user_id,
        )
        for c in tree.collections
    }
    roots = []
    for n in nodes.values():
        parent = nodes.get(n.parent_id) if n.parent_id else None

        relevant_grants = tree.grants.get(n.id, [])
        n.target_permission = next((g.permission for g in relevant_grants if g.user_id == user_id), None)
        n.target_permission_count = len(relevant_grants)

        if parent:
            parent.children.append(n)
            n.target_parent = parent
        else:
            owner = tree.owners.get(n.id)
            n.owner = UserSummaryResponse.model_validate(owner) if owner else None
            n.is_root = True
            roots.append(n)
    return roots


def build_annotation_response(
    annotation: ORMAnnotation, authors: dict[UUID, ORMUser], current_user_id: UUID
) -> AnnotationResponse:

    author_name = None

    if annotation.author_id in authors:
        author_name = authors[annotation.author_id].name
    if annotation.author_id is None:
        author_name = "Unknown"
    if current_user_id == annotation.author_id:
        author_name = "You"

    return AnnotationResponse(**annotation.__dict__, author_name=author_name)


def build_api_key_response(session: ORMSession, user: ORMUser | None = None):

    return ApiKeyResponse(
        **session.__dict__,
        user=UserSummaryResponse.model_validate(user) if user else None,
    )


def build_opds_response(feed: OpdsFeed) -> Response:
    """
    Render OPDS Feed
    """
    self_link = next((link for link in feed.links if link.rel == OpdsRel.SELF), None)
    media_type = self_link.type if self_link else OpdsLinkType.ACQUISITION
    return Response(content=render_feed(feed), media_type=media_type)


def build_opds_opensearch_response(description: OpenSearchDescription) -> Response:
    """
    Render OPDS OpenSearch Description
    """

    return Response(
        content=render_opensearch(description),
        media_type=OpdsLinkType.OPENSEARCH,
    )
