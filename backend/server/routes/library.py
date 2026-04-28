from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Form, HTTPException, Path, Query, Request, UploadFile, status
from fastapi.responses import FileResponse as FastAPIFileResponse

from server.const import ScopesEnum
from server.dependencies import (
    AccessSecurity,
    FileRepositoryDependency,
    LibraryServiceDependency,
    run_with_indexing_service,
)
from server.exceptions import DuplicateResourceError, FieldError, InvalidActionError
from server.routes._assemblers import build_file_response
from server.schemas.identity import UserSummaryResponse
from server.schemas.library import (
    AssignmentResponse,
    CollectionResponse,
    CollectionWithDetailsResponse,
    CreateCollectionRequest,
    FileResponse,
    FileStateResponse,
    LibraryTreeNode,
    ListFilesQueryParams,
    PatchFileStateRequest,
    ResourcePermissionResponse,
    TagWithDetailsResponse,
    UpdateCollectionRequest,
    UpdateFileRequest,
    UpdateTagRequest,
)
from server.schemas.security import AccessSessionContext

router = APIRouter(prefix="/library")


@router.get(path="/collections", operation_id="ListCollections", response_model=list[CollectionResponse])
async def list_collections(
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_READ])],
    library_service: LibraryServiceDependency,
):

    return await library_service.list_collections(user_id=access_session.user_id)


@router.post(path="/collections", operation_id="CreateCollection")
async def create_collection(
    data: CreateCollectionRequest,
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_WRITE])],
    library_service: LibraryServiceDependency,
):

    await library_service.create_collection(user_id=access_session.user_id, data=data)


@router.get(path="/collections/{id}", operation_id="GetCollection", response_model=CollectionWithDetailsResponse)
async def get_collection(
    collection_id: Annotated[UUID, Path(alias="id")],
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_READ])],
    library_service: LibraryServiceDependency,
):

    collection = await library_service.get_collection(user_id=access_session.user_id, collection_id=collection_id)
    files = await library_service.list_files(user_id=access_session.user_id, collection_id=collection_id)

    return CollectionWithDetailsResponse(
        id=collection.id,
        name=collection.name,
        parent_id=collection.parent_id,
        entity_type=collection.entity_type,
        files=[build_file_response(file) for file in files],
    )


@router.get(
    path="/collections/{id}/permissions",
    operation_id="GetCollectionPermissions",
    response_model=ResourcePermissionResponse,
)
async def get_collection_permissions(
    collection_id: Annotated[UUID, Path(alias="id")],
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_READ])],
    library_service: LibraryServiceDependency,
):

    collection = await library_service.get_collection(user_id=access_session.user_id, collection_id=collection_id)
    assignments = await library_service.list_collection_permissions(
        user_id=access_session.user_id, collection_id=collection_id
    )

    return ResourcePermissionResponse(
        entity_type=collection.entity_type,
        name=collection.name,
        assignments=[
            AssignmentResponse(
                user=UserSummaryResponse.model_validate(assign.user),
                permission=assign.permission.permission,
                inherited_from=assign.inherited_from,
            )
            for assign in assignments
        ],
    )


@router.put(path="/collections/{id}", operation_id="UpdateCollection")
async def update_collection(
    collection_id: Annotated[UUID, Path(alias="id")],
    data: UpdateCollectionRequest,
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_WRITE])],
    library_service: LibraryServiceDependency,
):
    try:
        await library_service.update_collection(
            user_id=access_session.user_id, collection_id=collection_id, name=data.name, parent_id=data.parent_id
        )
    except InvalidActionError as e:
        if e.rule == "collection_parent_self":
            raise FieldError(field="parent_id", msg=str(e)) from e
        raise


@router.delete(path="/collections/{id}", operation_id="DeleteCollection")
async def delete_collection(
    collection_id: Annotated[UUID, Path(alias="id")],
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_WRITE])],
    library_service: LibraryServiceDependency,
):

    await library_service.delete_collection(user_id=access_session.user_id, collection_id=collection_id)


@router.delete(path="/files/{id}", operation_id="DeleteFile")
async def delete_file(
    file_id: Annotated[UUID, Path(alias="id")],
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_WRITE])],
    library_service: LibraryServiceDependency,
):

    await library_service.delete_file(user_id=access_session.user_id, file_id=file_id)


@router.put(path="/files/{id}", operation_id="UpdateFile")
async def update_file(
    file_id: Annotated[UUID, Path(alias="id")],
    data: UpdateFileRequest,
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_WRITE])],
    library_service: LibraryServiceDependency,
):
    await library_service.update_file(
        user_id=access_session.user_id,
        file_id=file_id,
        name=data.name,
        description=data.description,
        tags=data.tags,
        collection_id=data.collection_id,
    )


@router.get(path="/files/{id}/state", response_model=list[FileStateResponse], operation_id="GetFileState")
async def get_file_state(
    file_id: Annotated[UUID, Path(alias="id")],
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_READ])],
    file_repo: FileRepositoryDependency,
):

    state = await file_repo.get_state_or_none(user_id=access_session.user_id, file_id=file_id)

    if not state:
        return FileStateResponse.with_defaults()

    return state


@router.patch(path="/files/{id}/state", operation_id="PatchFileState")
async def patch_file_state(
    file_id: Annotated[UUID, Path(alias="id")],
    data: PatchFileStateRequest,
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_WRITE])],
    library_service: LibraryServiceDependency,
):

    await library_service.update_file_state(
        user_id=access_session.user_id,
        file_id=file_id,
        scale=data.scale,
        current_page=data.current_page,
        is_favorite=data.is_favorite,
    )


@router.get(path="/tree", operation_id="GetLibraryTree", response_model=list[LibraryTreeNode])
async def get_library_tree(
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_READ])],
    library_service: LibraryServiceDependency,
):

    return await library_service.get_library_tree(user_id=access_session.user_id)


@router.get(path="/files/uncategorized", operation_id="ListUncategorizedFiles", response_model=list[FileResponse])
async def list_uncategorized_files(
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_READ])],
    library_service: LibraryServiceDependency,
):

    files = await library_service.list_files(user_id=access_session.user_id, collection_id=None)

    return [build_file_response(file) for file in files]


@router.get(path="/files", operation_id="ListFiles", response_model=list[FileResponse])
async def list_files(
    query: Annotated[ListFilesQueryParams, Query()],
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_READ])],
    library_service: LibraryServiceDependency,
):
    files = await library_service.list_files(
        user_id=access_session.user_id,
        is_favorite=query.is_favorite,
        tags=query.tags,
        name=query.name,
        description=query.description,
    )

    return [build_file_response(file) for file in files]


@router.post(path="/files/upload", operation_id="UploadFile")
async def upload_file(
    file: UploadFile,
    name: Annotated[str, Form()],
    description: Annotated[str | None, Form(default_factory=lambda: None)],
    collection_id: Annotated[UUID, Form()],
    tags: Annotated[list[str], Form(default_factory=list)],
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_WRITE])],
    library_service: LibraryServiceDependency,
    background_tasks: BackgroundTasks,
    request: Request,
):

    try:
        file_record = await library_service.upload_pdf_file(
            user_id=access_session.user_id,
            file=file,
            name=name,
            collection_id=collection_id,
            tags=tags,
            description=description,
        )
    except DuplicateResourceError as e:
        raise FieldError(
            field="file",
            msg="File already exists. This can happen if you try to upload the same file multiple times.",
        ) from e

    async def index_file_pages(service):
        await service.index_file(file_id=file_record.id, storage_key=file_record.storage_key)

    if file_record.is_pdf:
        background_tasks.add_task(
            run_with_indexing_service, context=request.app.state.app_context, callback=index_file_pages
        )


@router.get(path="/files/{id}", operation_id="GetFileDetails", response_model=FileResponse)
async def get_file_details(
    file_id: Annotated[UUID, Path(alias="id")],
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_READ])],
    library_service: LibraryServiceDependency,
):

    file = await library_service.get_file(user_id=access_session.user_id, file_id=file_id)
    return build_file_response(file)


@router.get(path="/files/{id}/download", operation_id="GetFile")
async def download_file(
    file_id: Annotated[UUID, Path(alias="id")],
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_READ])],
    library_service: LibraryServiceDependency,
):
    view = await library_service.get_file(user_id=access_session.user_id, file_id=file_id)

    async with library_service.open_file(view.file.storage_key) as path:
        return FastAPIFileResponse(path, media_type=view.file.content_type)


@router.get(path="/files/{id}/thumbnail", operation_id="GetFileThumbnail")
async def get_file_thumbnail(
    file_id: Annotated[UUID, Path(alias="id")],
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_READ])],
    library_service: LibraryServiceDependency,
):
    view = await library_service.get_file(user_id=access_session.user_id, file_id=file_id)

    if not view.file.thumbnail:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thumbnail not available")

    async with library_service.open_file(view.file.thumbnail) as path:
        return FastAPIFileResponse(path, media_type="image/webp")


@router.get(path="/tags", operation_id="ListTags", response_model=list[TagWithDetailsResponse])
async def list_tags(
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_READ])],
    library_service: LibraryServiceDependency,
):

    tags = await library_service.list_tags_with_details(user_id=access_session.user_id)

    return [
        TagWithDetailsResponse(id=tag.id, name=tag.name, color=tag.color, file_count=tag.file_count) for tag in tags
    ]


@router.put(path="/tags/{id}", operation_id="UpdateTag")
async def update_tag(
    tag_id: Annotated[UUID, Path(alias="id")],
    data: UpdateTagRequest,
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_WRITE])],
    library_service: LibraryServiceDependency,
):

    try:
        await library_service.update_tag(user_id=access_session.user_id, tag_id=tag_id, color=data.color)
    except InvalidActionError as e:
        if e.rule != "tag_name_exists":
            raise
        raise FieldError(field="name", msg="Tag already exists") from e
