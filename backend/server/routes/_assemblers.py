from uuid import UUID

from fastapi import Request

from server.models import ORMAuthProviderOidc, ORMFileComment, ORMFileHighlight, ORMUser
from server.repositories import FileWithDetails
from server.schemas.identity import AuthProviderOidcResponse
from server.schemas.library import CommentResponse, FileResponse, FileStateResponse, HighlightResponse, TagResponse


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
        target_permission=permission,
    )


def build_comment_response(
    comment: ORMFileComment, authors: dict[UUID, ORMUser], current_user_id: UUID
) -> CommentResponse:

    author_name = None

    if comment.author_id in authors:
        author_name = authors[comment.author_id].name
    if comment.author_id is None:
        author_name = "Unknown"
    if current_user_id == comment.author_id:
        author_name = "You"

    return CommentResponse(**comment.__dict__, author_name=author_name)


def build_highlight_response(
    highlight: ORMFileHighlight, authors: dict[UUID, ORMUser], current_user_id: UUID
) -> HighlightResponse:

    author_name = None

    if highlight.author_id in authors:
        author_name = authors[highlight.author_id].name
    if highlight.author_id is None:
        author_name = "Unknown"
    if current_user_id == highlight.author_id:
        author_name = "You"

    return HighlightResponse(**highlight.__dict__, author_name=author_name)
