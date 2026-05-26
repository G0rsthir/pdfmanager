from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Form, HTTPException, Path, Query, Request, UploadFile, status
from fastapi.responses import FileResponse as FastAPIFileResponse

from server.const import UNSET, ScopesEnum
from server.dependencies import (
    AccessSecurity,
    FileRepositoryDependency,
    LibraryServiceDependency,
    PermissionDependency,
    UserRepositoryDependency,
    run_with_indexing_service,
)
from server.exceptions import DuplicateResourceError, FieldError, InvalidActionError
from server.routes._assemblers import build_annotation_response, build_file_response
from server.schemas.identity import UserSummaryResponse
from server.schemas.library import (
    AnnotationResponse,
    AssignmentResponse,
    CollectionResponse,
    CollectionWithDetailsResponse,
    CreateAnnotationRequest,
    CreateCollectionRequest,
    FileResponse,
    FileStateResponse,
    InviteToCollectionRequest,
    LibraryTreeNode,
    ListFilesQueryParams,
    PatchAnnotationRequest,
    PatchFileStateRequest,
    ResourcePermissionResponse,
    TagWithDetailsResponse,
    UpdateCollectionPermissionRequest,
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

    collections = await library_service.list_collections(user_id=access_session.user_id)

    return [
        CollectionResponse(
            id=collection.id,
            name=collection.name,
            parent_id=collection.parent_id,
            entity_type=collection.entity_type,
        )
        for collection in collections
    ]


@router.get(
    path="/collections/{id}/move-targets",
    operation_id="ListCollectionMoveTargets",
    response_model=list[CollectionResponse],
)
async def list_collection_move_targets(
    collection_id: Annotated[UUID, Path(alias="id")],
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_READ])],
    library_service: LibraryServiceDependency,
):
    targets = await library_service.list_move_targets_for_collection(
        user_id=access_session.user_id, source_id=collection_id
    )
    return [CollectionResponse(id=c.id, name=c.name, parent_id=c.parent_id, entity_type=c.entity_type) for c in targets]


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
    user_repo: UserRepositoryDependency,
    permissions: PermissionDependency,
):

    collection = await library_service.get_collection(user_id=access_session.user_id, collection_id=collection_id)
    files = await library_service.list_files(user_id=access_session.user_id, collection_id=collection_id)

    perm = await permissions.get_effective_for_collection(collection_id, access_session.user_id)
    perm = perm.permission if perm else None

    owner_perm = await permissions.get_effective_owner_for_collection(collection_id)
    owner = await user_repo.get_by_id(owner_perm.user_id) if owner_perm else None

    if not owner:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Owner of the collection not found"
        )

    return CollectionWithDetailsResponse(
        id=collection.id,
        name=collection.name,
        parent_id=collection.parent_id,
        entity_type=collection.entity_type,
        files=[build_file_response(file, user_id=access_session.user_id) for file in files],
        target_permission=perm,
        owner=UserSummaryResponse.model_validate(owner),
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
    grants = await library_service.list_collection_permissions(
        user_id=access_session.user_id, collection_id=collection_id
    )

    user_grant = next((g.permission for g in grants if g.permission.user_id == access_session.user_id), None)

    return ResourcePermissionResponse(
        id=collection.id,
        entity_type=collection.entity_type,
        name=collection.name,
        assignments=[
            AssignmentResponse(
                id=assign.permission.id,
                user=UserSummaryResponse.model_validate(assign.user),
                permission=assign.permission.permission,
                inherited_from=assign.inherited_from,
                target_user_id=access_session.user_id,
                target_permission=user_grant.permission if user_grant else None,
            )
            for assign in grants
        ],
    )


@router.post(path="/collections/{id}/permissions/invite", operation_id="InviteToCollection")
async def invite_to_collection(
    collection_id: Annotated[UUID, Path(alias="id")],
    data: InviteToCollectionRequest,
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_WRITE])],
    library_service: LibraryServiceDependency,
):

    try:
        await library_service.invite_to_collection(
            user_id=access_session.user_id,
            collection_id=collection_id,
            email=data.email,
            permission=data.permission,
        )
    except InvalidActionError as e:
        if e.rule == "user_not_found":
            raise FieldError(field="email", msg="User with this email does not exist") from e
        raise


@router.delete(path="/collections/{collection_id}/permissions/{id}", operation_id="DeleteCollectionPermission")
async def delete_collection_permission(
    collection_id: Annotated[UUID, Path()],
    permission_id: Annotated[UUID, Path(alias="id")],
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_WRITE])],
    library_service: LibraryServiceDependency,
):

    await library_service.delete_collection_permission(
        user_id=access_session.user_id,
        collection_id=collection_id,
        assignment_id=permission_id,
    )


@router.put(path="/collections/{collection_id}/permissions/{id}", operation_id="UpdateCollectionPermission")
async def update_collection_permission(
    collection_id: Annotated[UUID, Path()],
    permission_id: Annotated[UUID, Path(alias="id")],
    data: UpdateCollectionPermissionRequest,
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_WRITE])],
    library_service: LibraryServiceDependency,
):

    await library_service.update_collection_permission(
        user_id=access_session.user_id,
        collection_id=collection_id,
        assignment_id=permission_id,
        permission=data.permission,
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


@router.get(
    path="/files/{id}/move-targets",
    operation_id="ListFileMoveTargets",
    response_model=list[CollectionResponse],
)
async def list_file_move_targets(
    file_id: Annotated[UUID, Path(alias="id")],
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_READ])],
    library_service: LibraryServiceDependency,
):
    targets = await library_service.list_move_targets_for_file(user_id=access_session.user_id, source_id=file_id)
    return [CollectionResponse(id=c.id, name=c.name, parent_id=c.parent_id, entity_type=c.entity_type) for c in targets]


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

    return [build_file_response(file, user_id=access_session.user_id) for file in files]


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

    return build_file_response(file, user_id=access_session.user_id)


@router.get(path="/files/{id}/download", response_class=FastAPIFileResponse, operation_id="GetFile")
async def download_file(
    file_id: Annotated[UUID, Path(alias="id")],
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_READ])],
    library_service: LibraryServiceDependency,
):
    view = await library_service.get_file(user_id=access_session.user_id, file_id=file_id)

    async with library_service.open_file(view.file.storage_key) as path:
        return FastAPIFileResponse(path, media_type=view.file.content_type)


@router.get(path="/files/annotations/labels", response_model=list[str], operation_id="ListAnnotationLabels")
async def list_annotation_labels(
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_READ])],
    library_service: LibraryServiceDependency,
):

    labels = await library_service.list_distinct_labels(user_id=access_session.user_id)
    return labels


@router.get(path="/files/{id}/annotations", response_model=list[AnnotationResponse], operation_id="ListAnnotations")
async def list_annotations(
    file_id: Annotated[UUID, Path(alias="id")],
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_READ])],
    library_service: LibraryServiceDependency,
    user_repo: UserRepositoryDependency,
):

    annotations = await library_service.list_annotations(user_id=access_session.user_id, file_id=file_id)
    author_ids = [annotation.author_id for annotation in annotations if annotation.author_id]
    authors = await user_repo.list_by_ids(author_ids)

    response = []
    for annotation in annotations:
        result = build_annotation_response(annotation, authors, access_session.user_id)
        response.append(result)
    return response


@router.post(path="/files/{id}/annotations", operation_id="CreateAnnotation")
async def create_annotation(
    file_id: Annotated[UUID, Path(alias="id")],
    data: CreateAnnotationRequest,
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_WRITE])],
    library_service: LibraryServiceDependency,
):

    return await library_service.create_annotation(
        user_id=access_session.user_id,
        file_id=file_id,
        rects=data.rects,
        excerpt=data.excerpt,
        label=data.label,
        page=data.page,
        body=data.body,
        color=data.color,
    )


@router.patch(path="/files/{file_id}/annotations/{id}", operation_id="PatchAnnotation")
async def patch_annotation(
    file_id: Annotated[UUID, Path()],
    annotation_id: Annotated[UUID, Path(alias="id")],
    data: PatchAnnotationRequest,
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_WRITE])],
    library_service: LibraryServiceDependency,
):

    label = data.label if "label" in data.model_fields_set else UNSET

    await library_service.patch_annotation(
        user_id=access_session.user_id,
        file_id=file_id,
        annotation_id=annotation_id,
        label=label,
        body=data.body,
        color=data.color,
    )


@router.delete(path="/files/{file_id}/annotations/{id}", operation_id="DeleteAnnotation")
async def delete__annotation(
    file_id: Annotated[UUID, Path()],
    annotation_id: Annotated[UUID, Path(alias="id")],
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_WRITE])],
    library_service: LibraryServiceDependency,
):

    await library_service.delete_annotation(
        user_id=access_session.user_id, file_id=file_id, annotation_id=annotation_id
    )


@router.get(path="/files/{id}/thumbnail", response_class=FastAPIFileResponse, operation_id="GetFileThumbnail")
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
