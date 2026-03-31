from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Form, Path, Query, UploadFile
from fastapi.responses import FileResponse as FastAPIFileResponse

from server.const import ScopesEnum
from server.dependencies import (
    AccessSecurity,
    FileRepositoryDependency,
    LibraryServiceDependency,
    StorageServiceDependency,
)
from server.exceptions import FieldError, InvalidActionError
from server.schemas.library import (
    CollectionResponse,
    CreateCollectionRequest,
    CreateFolderRequest,
    FileResponse,
    FolderResponse,
    LibraryTreeNode,
    ListFilesQueryParams,
    PatchFileStateRequest,
    TagDetailResponse,
    UpdateCollectionRequest,
    UpdateFileRequest,
    UpdateFolderRequest,
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

    await library_service.create_collection(user_id=access_session.user_id, name=data.name, parent_id=data.parent_id)


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


@router.get(path="/folders/{id}", operation_id="GetFolder", response_model=FolderResponse)
async def get_folder(
    folder_id: Annotated[UUID, Path(alias="id")],
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_READ])],
    library_service: LibraryServiceDependency,
):

    folder = await library_service.get_folder(user_id=access_session.user_id, folder_id=folder_id)
    files = await library_service.list_files(user_id=access_session.user_id, folder_id=folder_id)

    return FolderResponse(
        id=folder.id,
        name=folder.name,
        parent_id=folder.collection_id,
        files=[FileResponse.model_validate(file) for file in files],
    )


@router.post(path="/folders", operation_id="CreateFolder")
async def create_folder(
    data: CreateFolderRequest,
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_WRITE])],
    library_service: LibraryServiceDependency,
):

    await library_service.create_folder(user_id=access_session.user_id, name=data.name, parent_id=data.parent_id)


@router.get(path="/folders", operation_id="ListFolders", response_model=list[FolderResponse])
async def list_folders(
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_READ])],
    library_service: LibraryServiceDependency,
):

    return await library_service.list_folders(user_id=access_session.user_id)


@router.put(path="/folders/{id}", operation_id="UpdateFolder")
async def update_folder(
    folder_id: Annotated[UUID, Path(alias="id")],
    data: UpdateFolderRequest,
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_WRITE])],
    library_service: LibraryServiceDependency,
):

    await library_service.update_folder(
        user_id=access_session.user_id, folder_id=folder_id, name=data.name, parent_id=data.parent_id
    )


@router.delete(path="/folders/{id}", operation_id="DeleteFolder")
async def delete_folder(
    folder_id: Annotated[UUID, Path(alias="id")],
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_WRITE])],
    library_service: LibraryServiceDependency,
):

    await library_service.delete_folder(user_id=access_session.user_id, folder_id=folder_id)


@router.delete(path="/files/{id}", operation_id="DeleteFile")
async def delete_file(
    file_id: Annotated[UUID, Path(alias="id")],
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_WRITE])],
    library_service: LibraryServiceDependency,
    storage_service: StorageServiceDependency,
    file_repo: FileRepositoryDependency,
):

    file = await library_service.get_file(user_id=access_session.user_id, file_id=file_id)

    file_count = await file_repo.count_by_storage(file.file_storage)
    await library_service.delete_file(user_id=access_session.user_id, file_id=file_id)

    if file_count <= 1:
        await storage_service.delete_file(file.file_storage)


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
        is_favorite=data.is_favorite,
        folder_id=data.folder_id,
    )


@router.patch(path="/files/{id}/state", operation_id="PatchFileState")
async def patch_file_state(
    file_id: Annotated[UUID, Path(alias="id")],
    data: PatchFileStateRequest,
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_WRITE])],
    library_service: LibraryServiceDependency,
):

    await library_service.update_file_state(
        user_id=access_session.user_id, file_id=file_id, scale=data.scale, current_page=data.current_page
    )


@router.get(path="/tree", operation_id="GetLibraryTree", response_model=list[LibraryTreeNode])
async def get_library_tree(
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_READ])],
    library_service: LibraryServiceDependency,
):

    return await library_service.get_library_tree(user_id=access_session.user_id)


@router.get(path="/tags", operation_id="ListTags", response_model=list[TagDetailResponse])
async def list_tags(
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_READ])],
    library_service: LibraryServiceDependency,
):

    tags = await library_service.list_tags_with_details(user_id=access_session.user_id)

    return [TagDetailResponse(id=tag.id, name=tag.name, color=tag.color, file_count=tag.file_count) for tag in tags]


@router.delete(path="/tags/{id}", operation_id="DeleteTag")
async def delete_tag(
    tag_id: Annotated[UUID, Path(alias="id")],
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_WRITE])],
    library_service: LibraryServiceDependency,
):

    await library_service.delete_tag(user_id=access_session.user_id, tag_id=tag_id)


@router.get(path="/files/uncategorized", operation_id="ListUncategorizedFiles", response_model=list[FileResponse])
async def list_uncategorized_files(
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_READ])],
    library_service: LibraryServiceDependency,
):
    return await library_service.list_files(user_id=access_session.user_id, folder_id=None)


@router.get(path="/files", operation_id="ListFiles", response_model=list[FileResponse])
async def list_files(
    query: Annotated[ListFilesQueryParams, Query()],
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_READ])],
    library_service: LibraryServiceDependency,
):

    return await library_service.list_files(
        user_id=access_session.user_id,
        is_favorite=query.is_favorite,
        tags=query.tags,
        text=query.text,
        names=query.names,
        descriptions=query.descriptions,
    )


@router.put(path="/tags/{id}", operation_id="UpdateTag")
async def update_tag(
    tag_id: Annotated[UUID, Path(alias="id")],
    data: UpdateTagRequest,
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_WRITE])],
    library_service: LibraryServiceDependency,
):

    try:
        await library_service.update_tag(
            user_id=access_session.user_id, tag_id=tag_id, name=data.name, color=data.color
        )
    except InvalidActionError as e:
        if e.rule != "tag_name_exists":
            raise
        raise FieldError(field="name", msg="Tag already exists") from e


@router.post(path="/files/upload", operation_id="UploadFile")
async def upload_file(
    file: UploadFile,
    name: Annotated[str, Form()],
    description: Annotated[str | None, Form(default_factory=lambda: "")],
    folder_id: Annotated[UUID, Form()],
    tags: Annotated[list[str], Form(default_factory=list)],
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_WRITE])],
    library_service: LibraryServiceDependency,
    storage_service: StorageServiceDependency,
):
    storage_file = await storage_service.save_pdf_upload(user_id=access_session.user_id, file=file)

    await library_service.create_file(
        name=name,
        description=description,
        file_storage=storage_file.location,
        user_id=access_session.user_id,
        file_size=storage_file.size,
        file_hash=storage_file.hash,
        folder_id=folder_id,
        tags=tags,
        page_count=storage_file.page_count,
    )


@router.get(path="/files/{id}", operation_id="GetFileDetails", response_model=FileResponse)
async def get_file_details(
    file_id: Annotated[UUID, Path(alias="id")],
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_READ])],
    library_service: LibraryServiceDependency,
):

    return await library_service.get_file(user_id=access_session.user_id, file_id=file_id)


@router.get(path="/files/{id}/download", operation_id="GetFile")
async def get_file(
    file_id: Annotated[UUID, Path(alias="id")],
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_READ])],
    library_service: LibraryServiceDependency,
    storage_service: StorageServiceDependency,
):
    file = await library_service.get_file(user_id=access_session.user_id, file_id=file_id)
    path = await storage_service.get_path(location=file.file_storage)

    return FastAPIFileResponse(path, media_type="application/pdf")
