from uuid import UUID

from fastapi import Request, Response

from server.infrastructure.opds.document import OpdsFeed, OpdsLinkType, OpdsRel, OpenSearchDescription
from server.infrastructure.opds.render import render_feed, render_opensearch
from server.models import ORMAnnotation, ORMAuthProviderOidc, ORMSession, ORMUser
from server.repositories import FileWithDetails
from server.schemas.identity import AuthProviderOidcResponse, UserSummaryResponse
from server.schemas.library import (
    AnnotationResponse,
    AuthorResponse,
    FileResponse,
    FileStateResponse,
    TagResponse,
)
from server.schemas.security import ApiKeyResponse


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
    permission = file_details.get_effective_permission(user_id)
    return FileResponse(
        **file_details.file.__dict__,
        state=FileStateResponse.model_validate(file_details.state)
        if file_details.state
        else FileStateResponse.with_defaults(),
        tags=[TagResponse.model_validate(tag) for tag in file_details.tags],
        authors=[AuthorResponse.model_validate(author) for author in file_details.authors],
        target_permission=permission,
    )


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
