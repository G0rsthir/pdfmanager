import {
  createCollectionMutation,
  deleteCollectionMutation,
  deleteCollectionPermissionMutation,
  getCollectionPermissionsOptions,
  getLibraryTreeOptions,
  inviteToCollectionMutation,
  listCollectionMoveTargetsOptions,
  listCollectionsOptions,
  updateCollectionMutation,
  updateCollectionPermissionMutation,
} from "@/api/@tanstack/react-query.gen";
import {
  AccessScope,
  ResourcePermissionCapability,
  type InviteToCollectionRequest,
  type LibraryTreeNode,
  type ResourcePermissionResponse,
} from "@/api/types.gen";
import { useCan, useHasScopes } from "@/common/auth/hooks";
import { parseAPIError } from "@/common/error";
import { GenericIconButton } from "@/components/ui/button";
import { QueryView } from "@/components/ui/feedback";
import { Form } from "@/components/ui/form/container";
import { SubscribeFormError } from "@/components/ui/form/fields";
import { FormModal } from "@/components/ui/form/modal";
import { ConfirmModal } from "@/components/ui/modal";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@/components/ui/toaster";
import { useFormMutation } from "@/hooks/form";
import { useAPIMutation, useAPIQuery } from "@/hooks/query";
import { useGlobalStore } from "@/store";
import {
  Alert,
  Button,
  CloseButton,
  Combobox,
  createListCollection,
  createTreeCollection,
  Dialog,
  Field,
  Group,
  Input,
  Link,
  Menu,
  Portal,
  Select,
  Stack,
  Text,
  TreeView,
  useCombobox,
  useDisclosure,
  useFilter,
  useListCollection,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import {
  LuChevronRight,
  LuFolderOpen,
  LuLibrary,
  LuLink2,
} from "react-icons/lu";
import { useNavigate, useParams } from "react-router";
import { useShallow } from "zustand/shallow";
import { PermissionsView } from "../library/shared/permissions";

const ROOT_NODE: LibraryTreeNode = {
  id: "ROOT",
  name: "",
  children: [],
  entity_type: "group",
  capabilities: [
    ResourcePermissionCapability.READ,
    ResourcePermissionCapability.WRITE,
  ],
  is_shared: false,
};

export function Library() {
  const query = useAPIQuery({
    ...getLibraryTreeOptions(),
  });

  return (
    <QueryView query={query}>{(data) => <LibraryTree data={data} />}</QueryView>
  );
}

export function LibraryTree({ data }: { data: LibraryTreeNode[] }) {
  const navigate = useNavigate();

  const state = useGlobalStore(
    useShallow((state) => ({
      expandedLibraryNodes: state.expandedLibraryNodes,
      setExpandedLibraryNodes: state.setExpandedLibraryNodes,
    })),
  );

  const { open, onClose, onOpen } = useDisclosure();

  const collection = useMemo(
    () =>
      createTreeCollection<LibraryTreeNode>({
        nodeToValue: (node) => node.id,
        nodeToString: (node) => node.id,
        rootNode: {
          ...ROOT_NODE,
          children: data,
        },
      }),
    [data],
  );

  const { folderid } = useParams();

  const can = useCan(ROOT_NODE);

  const canModify = can(ResourcePermissionCapability.WRITE);

  return (
    <>
      <TreeView.Root
        collection={collection}
        expandedValue={state.expandedLibraryNodes}
        onExpandedChange={(e) => state.setExpandedLibraryNodes(e.expandedValue)}
        maxW="sm"
        animateContent
        selectedValue={folderid ? [folderid] : []}
      >
        <Group justify="space-between" mr="0.7rem">
          <Text fontWeight="semibold">Library</Text>
          <LibraryActions />
        </Group>
        <TreeView.Tree>
          <TreeView.Node
            indentGuide={<TreeView.BranchIndentGuide />}
            render={({ node, indexPath }) => {
              if (node.entity_type == "folder")
                return (
                  <TreeView.Item onClick={() => navigate("folder/" + node.id)}>
                    <LuFolderOpen />
                    <TreeView.ItemText>{node.name}</TreeView.ItemText>
                    <SharedIndicator shared={node.is_shared} />
                    <TreeNodeActions node={node} indexPath={indexPath} />
                  </TreeView.Item>
                );

              if (node.children?.length)
                return (
                  <TreeView.BranchControl>
                    <TreeView.BranchIndicator asChild>
                      <LuChevronRight />
                    </TreeView.BranchIndicator>
                    <TreeView.BranchText>{node.name}</TreeView.BranchText>
                    <SharedIndicator shared={node.is_shared} />
                    <TreeNodeActions node={node} indexPath={indexPath} />
                  </TreeView.BranchControl>
                );

              return (
                <TreeView.Item>
                  <LuLibrary />
                  <TreeView.ItemText>{node.name}</TreeView.ItemText>
                  <SharedIndicator shared={node.is_shared} />
                  <TreeNodeActions node={node} indexPath={indexPath} />
                </TreeView.Item>
              );
            }}
          />
        </TreeView.Tree>
      </TreeView.Root>
      {data.length == 0 && (
        <Text textStyle="xs">
          No folders yet.
          <Link
            variant="underline"
            colorPalette="teal"
            onClick={onOpen}
            cursor="pointer"
            ms={2}
          >
            Create one
          </Link>
        </Text>
      )}
      <CreateNodeDialog
        type="folder"
        open={open}
        onClose={onClose}
        readonly={!canModify}
      />
    </>
  );
}

function SharedIndicator({ shared }: { shared?: boolean }) {
  if (!shared) return null;
  return (
    <LuLink2 size={12} title="Shared" style={{ opacity: 0.6, flexShrink: 0 }} />
  );
}

type NodeType = LibraryTreeNode["entity_type"];

type NodeDialog = {
  type: "create" | "edit" | "delete" | "permissions";
  nodeType: NodeType;
} | null;

function TreeNodeActions({
  node,
}: TreeView.NodeProviderProps<LibraryTreeNode>) {
  const isGroup = node.entity_type == "group";

  const [dialog, setDialog] = useState<NodeDialog>(null);
  const onClose = () => setDialog(null);

  const can = useCan(node);

  const canModify = can(ResourcePermissionCapability.WRITE);

  const canAssignPermissions = can(
    ResourcePermissionCapability.MANAGE_PERMISSIONS,
  );

  return (
    <>
      <TreeNodeMenu opacitySelector=".css-wurrfy:hover &">
        {isGroup && (
          <Menu.Item
            disabled={!canModify}
            value="createGroup"
            onClick={(e) => {
              e.stopPropagation();
              if (!canModify) return;
              setDialog({ type: "create", nodeType: "group" });
            }}
          >
            Create collection
          </Menu.Item>
        )}
        {isGroup && (
          <Menu.Item
            value="createFolder"
            disabled={!canModify}
            onClick={(e) => {
              e.stopPropagation();
              if (!canModify) return;
              setDialog({ type: "create", nodeType: "folder" });
            }}
          >
            Create folder
          </Menu.Item>
        )}
        <Menu.Item
          value="edit"
          onClick={(e) => {
            e.stopPropagation();
            setDialog({ type: "edit", nodeType: node.entity_type });
          }}
        >
          Edit
        </Menu.Item>
        <Menu.Item
          value="permissions"
          onClick={(e) => {
            e.stopPropagation();
            setDialog({ type: "permissions", nodeType: node.entity_type });
          }}
        >
          Manage access
        </Menu.Item>
        <Menu.Item
          value="delete"
          color="fg.error"
          _hover={{ bg: "bg.error", color: "fg.error" }}
          disabled={!canModify}
          onClick={(e) => {
            e.stopPropagation();
            if (!canModify) return;
            setDialog({ type: "delete", nodeType: node.entity_type });
          }}
        >
          Delete
        </Menu.Item>
      </TreeNodeMenu>
      <CreateNodeDialog
        type={dialog?.nodeType ?? "group"}
        open={dialog?.type == "create"}
        onClose={onClose}
        parent_id={node.id}
        readonly={!canModify}
      />
      <EditNodeDialog
        open={dialog?.type == "edit"}
        onClose={onClose}
        node={node}
        readonly={!canModify}
      />
      <DeleteNodeDialog
        type={dialog?.nodeType ?? "group"}
        open={dialog?.type == "delete"}
        onClose={onClose}
        node={node}
      />
      <PermissionsDialog
        open={dialog?.type == "permissions"}
        onClose={onClose}
        resourceId={node.id}
        resourceName={node.name}
        readonly={!canAssignPermissions}
      />
    </>
  );
}

function TreeNodeMenu({
  children,
  opacitySelector = ".css-wurrfy:hover &",
}: {
  children: React.ReactNode;
  opacitySelector: string;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <GenericIconButton
          position="sticky"
          right="0"
          top="0"
          scale="0.8"
          css={{
            opacity: 0,
            [opacitySelector]: { opacity: 1 },
          }}
          size="xs"
          variant="ghost"
          height={0}
          onClick={(e) => e.stopPropagation()}
        >
          <BsThreeDotsVertical />
        </GenericIconButton>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content>{children}</Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}

function LibraryActions() {
  const [dialog, setDialog] = useState<NodeDialog>(null);
  const onClose = () => setDialog(null);

  const canWrite = useHasScopes(AccessScope.LIBRARY_WRITE);

  return (
    <>
      <TreeNodeMenu opacitySelector=".chakra-group:hover &">
        <Menu.Item
          value="createGroup"
          onClick={() => setDialog({ type: "create", nodeType: "group" })}
        >
          Create collection
        </Menu.Item>
        <Menu.Item
          value="createFolder"
          onClick={() => setDialog({ type: "create", nodeType: "folder" })}
        >
          Create folder
        </Menu.Item>
      </TreeNodeMenu>
      <CreateNodeDialog
        type={dialog?.nodeType ?? "group"}
        open={dialog?.type == "create"}
        onClose={onClose}
        readonly={!canWrite}
      />
    </>
  );
}

function containsNode(node: LibraryTreeNode, targetId: string): boolean {
  if (node.id == targetId) return true;
  return node.children?.some((child) => containsNode(child, targetId)) ?? false;
}

function nodeLabel(type: NodeType) {
  return type == "group" ? "Collection" : "Folder";
}

function CreateNodeDialog(props: {
  type: NodeType;
  open: boolean;
  onClose: () => void;
  parent_id?: string;
  readonly?: boolean;
}) {
  const { type, open, onClose, parent_id, readonly } = props;

  const label = nodeLabel(type);

  const { form } = useFormMutation({
    formOptions: {
      defaultValues: {
        name: "",
        parent_id: parent_id,
        entity_type: type,
      },
    },
    mutationOptions: createCollectionMutation,
    onMutate: (value) => ({ body: value }),
    successMessage: `${label} created successfully`,
    onSuccess: onClose,
  });

  const handleClose = useCallback(() => {
    form.reset();
    onClose();
  }, [onClose, form]);

  return (
    <FormModal
      open={open}
      close={handleClose}
      title={`New ${label}`}
      onSubmit={() => form.handleSubmit()}
      confirmBtnText="Create"
      disabled={readonly}
      submitOnEnter
    >
      <form.Field
        name="name"
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root
            invalid={!fieldState.meta.isValid}
            required
            disabled={readonly}
          >
            <Field.Label>
              Name <Field.RequiredIndicator />
            </Field.Label>
            <Input
              value={fieldState.value}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={handleBlur}
            />
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />
      <SubscribeFormError form={form} />
    </FormModal>
  );
}

interface CollectionSelectProps {
  onValueChange: (values?: string) => void;
  defaultValue?: string;
  onBlur: () => void;
  required?: boolean;
  allowedCollectionIds?: string[];
}

export function CollectionSelect(props: CollectionSelectProps) {
  const {
    onValueChange,
    defaultValue,
    required,
    allowedCollectionIds = [],
    onBlur,
  } = props;

  const hydrated = useRef(false);

  const { contains } = useFilter({ sensitivity: "base" });

  const { collection, filter, set } = useListCollection<{
    label: string;
    value: string;
  }>({
    initialItems: [],
    filter: contains,
  });

  const combobox = useCombobox({
    collection,
    onInputValueChange: (e) =>
      filter(
        e.reason === "item-select" || e.reason === undefined
          ? ""
          : e.inputValue,
      ),
    onValueChange: ({ value }) => onValueChange(value?.[0]),
    openOnClick: true,
    defaultValue: defaultValue ? [defaultValue] : [],
    onInteractOutside: () => onBlur(),
    required: required,
  });

  const query = useAPIQuery({
    ...listCollectionsOptions(),
  });

  useEffect(() => {
    if (query.isSuccess) {
      set(
        query.data.map((item) => ({
          label: item.name,
          value: item.id,
          disabled: !allowedCollectionIds.includes(item.id),
        })),
      );
    }
  }, [query.data, query.isSuccess, allowedCollectionIds, set]);

  useEffect(() => {
    if (combobox.value.length && collection.size && !hydrated.current) {
      combobox.syncSelectedItems();
      hydrated.current = true;
    }
  }, [combobox, collection.size]);

  return (
    <Combobox.RootProvider value={combobox}>
      <Combobox.Label>Collection</Combobox.Label>
      <Combobox.Control>
        <Combobox.Input placeholder="Type to search" />
        <Combobox.IndicatorGroup>
          <Combobox.ClearTrigger />
          <Combobox.Trigger />
        </Combobox.IndicatorGroup>
      </Combobox.Control>
      <Portal>
        <Combobox.Positioner>
          <Combobox.Content maxH="300px" overflowY="auto">
            <Combobox.Empty>No items found</Combobox.Empty>
            {collection.items.map((item) => (
              <Combobox.Item item={item} key={item.value}>
                {item.label}
                <Combobox.ItemIndicator />
              </Combobox.Item>
            ))}
          </Combobox.Content>
        </Combobox.Positioner>
      </Portal>
    </Combobox.RootProvider>
  );
}

function EditNodeDialog(props: {
  open: boolean;
  onClose: () => void;
  node: LibraryTreeNode;
  readonly?: boolean;
}) {
  const { open, onClose, node, readonly } = props;

  const label = nodeLabel(node.entity_type);

  const moveTargetsQ = useAPIQuery({
    ...listCollectionMoveTargetsOptions({
      path: {
        id: node.id,
      },
    }),
    enabled: open,
  });

  const { form } = useFormMutation({
    formOptions: {
      defaultValues: {
        name: node.name,
        parent_id: node.parent_id,
      },
    },
    mutationOptions: updateCollectionMutation,
    onMutate: (value) => ({ path: { id: node.id }, body: value }),
    successMessage: `${label} updated successfully`,
    onSuccess: onClose,
  });

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <FormModal
      open={open}
      close={handleClose}
      title={`Edit ${label}`}
      onSubmit={() => form.handleSubmit()}
      confirmBtnText="Update"
      disabled={readonly}
    >
      <form.Field
        name="name"
        validators={{
          onChange: ({ value }) => (!value ? "Name is required" : undefined),
        }}
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root
            invalid={!fieldState.meta.isValid}
            required
            disabled={readonly}
          >
            <Field.Label>
              Name <Field.RequiredIndicator />
            </Field.Label>
            <Input
              value={fieldState.value}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={handleBlur}
            />
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />
      <form.Field
        name="parent_id"
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root
            invalid={!fieldState.meta.isValid}
            required
            disabled={readonly}
          >
            <CollectionSelect
              defaultValue={fieldState.value ?? ""}
              onValueChange={handleChange}
              onBlur={handleBlur}
              allowedCollectionIds={moveTargetsQ.data?.map((c) => c.id)}
            />
            <Field.HelperText>
              Only collections you can write to are selectable
            </Field.HelperText>
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />
      <SubscribeFormError form={form} />
    </FormModal>
  );
}

function DeleteNodeDialog(props: {
  type: NodeType;
  open: boolean;
  onClose: () => void;
  node: LibraryTreeNode;
}) {
  const { type, open, onClose, node } = props;

  const label = nodeLabel(type);

  const { folderid } = useParams();
  const navigate = useNavigate();

  const { mutate: deleteRequest } = useAPIMutation({
    ...deleteCollectionMutation(),
    onSuccess() {
      showSuccessNotification(`${label} deleted successfully`);
      onClose();
      if (folderid && containsNode(node, folderid)) {
        navigate("/", { replace: true });
      }
    },
    onError(error) {
      showErrorNotification(
        `${label} deletion failed`,
        parseAPIError(error).message,
      );
    },
  });

  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      title="Are you sure?"
      onConfirm={() => deleteRequest({ path: { id: node.id } })}
      confirmBtnText="Delete"
      confirmBtnPalette="red"
    >
      This action cannot be undone. This will permanently delete this
      {type == "group" ? " and nested collections" : " folder"}.
    </ConfirmModal>
  );
}

export function PermissionsDialog(props: {
  open: boolean;
  onClose: () => void;
  resourceId: string;
  resourceName?: string;
  readonly?: boolean;
}) {
  const { open, onClose, resourceId, resourceName, readonly } = props;

  const query = useAPIQuery({
    ...getCollectionPermissionsOptions({
      path: {
        id: resourceId,
      },
    }),
    enabled: open,
  });

  return (
    <Dialog.Root open={open} size="md" onOpenChange={() => onClose()}>
      <Portal>
        <Dialog.Backdrop onClick={(e) => e.stopPropagation()} />
        <Dialog.Positioner onClick={(e) => e.stopPropagation()}>
          <Dialog.Content>
            <Dialog.CloseTrigger asChild>
              <CloseButton colorPalette="gray" />
            </Dialog.CloseTrigger>
            <Dialog.Header>
              <Stack gap={0}>
                <Dialog.Title>Permissions</Dialog.Title>
                {resourceName && (
                  <Text textStyle="xs" color="fg.muted">
                    {resourceName}
                  </Text>
                )}
              </Stack>
            </Dialog.Header>
            <Dialog.Body>
              <QueryView query={query}>
                {(access) => (
                  <ManageCollectionPermissions
                    access={access}
                    readonly={readonly}
                  />
                )}
              </QueryView>
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                variant="surface"
                colorPalette="gray"
                onClick={() => onClose()}
              >
                Close
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function ManageCollectionPermissions(props: {
  access: ResourcePermissionResponse;
  readonly?: boolean;
}) {
  const { access, readonly } = props;

  const { mutate: deletePermission } = useAPIMutation({
    ...deleteCollectionPermissionMutation(),
    onSuccess() {
      showSuccessNotification("Permission deleted successfully");
    },
    onError(error) {
      showErrorNotification(
        "Failed to delete permission",
        parseAPIError(error).message,
      );
    },
  });

  const { mutate: updatePermission } = useAPIMutation({
    ...updateCollectionPermissionMutation(),
    onSuccess() {
      showSuccessNotification("Permission updated successfully");
    },
    onError(error) {
      showErrorNotification(
        "Failed to update permission",
        parseAPIError(error).message,
      );
    },
  });

  return (
    <Stack gap={4}>
      {readonly && (
        <Alert.Root status="warning">
          <Alert.Indicator />
          <Alert.Title>
            You don't have permissions to modify this resource
          </Alert.Title>
        </Alert.Root>
      )}
      <InviteForm collectionId={access.id} readOnly={readonly} />
      <PermissionsView
        assignments={access.assignments}
        onDelete={(id) =>
          deletePermission({ path: { id, collection_id: access.id } })
        }
        onModify={(id, permission) =>
          updatePermission({
            path: { id, collection_id: access.id },
            body: { permission },
          })
        }
      />
    </Stack>
  );
}

type ResourcePermissionLevelWritable = InviteToCollectionRequest["permission"];

const PERMISSION_OPTIONS = createListCollection<{
  value: ResourcePermissionLevelWritable;
  label: string;
}>({
  items: [
    { value: "read", label: "Viewer" },
    { value: "modify", label: "Editor" },
    { value: "contribute", label: "Contributor" },
  ],
});

function InviteForm(props: { collectionId: string; readOnly?: boolean }) {
  const { collectionId, readOnly } = props;

  const { form } = useFormMutation({
    formOptions: {
      defaultValues: {
        email: "",
        permission: "read" as ResourcePermissionLevelWritable,
      },
    },
    mutationOptions: inviteToCollectionMutation,
    onMutate: (value) => ({ body: value, path: { id: collectionId } }),
    successMessage: "User invited to collection",
  });

  return (
    <Form onSubmit={form.handleSubmit}>
      <Stack>
        <Group gap={2}>
          <form.Field
            name="email"
            children={({ state: fieldState, handleChange, handleBlur }) => (
              <Field.Root
                invalid={!fieldState.meta.isValid}
                required
                disabled={readOnly}
                flex={1}
              >
                <Input
                  value={fieldState.value}
                  onChange={(e) => handleChange(e.target.value)}
                  onBlur={handleBlur}
                  placeholder="Add people by email"
                />
                <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
              </Field.Root>
            )}
          />

          <form.Field
            name="permission"
            children={({ state: fieldState, handleChange, handleBlur }) => (
              <Select.Root
                collection={PERMISSION_OPTIONS}
                value={[fieldState.value]}
                onValueChange={(e) =>
                  handleChange(e.value[0] as ResourcePermissionLevelWritable)
                }
                onInteractOutside={handleBlur}
                disabled={readOnly}
                width="120px"
              >
                <Select.HiddenSelect />
                <Select.Control>
                  <Select.Trigger>
                    <Select.ValueText placeholder="Permission" />
                  </Select.Trigger>
                  <Select.IndicatorGroup>
                    <Select.Indicator />
                  </Select.IndicatorGroup>
                </Select.Control>
                <Portal>
                  <Select.Positioner>
                    <Select.Content>
                      {PERMISSION_OPTIONS.items.map((item) => (
                        <Select.Item item={item} key={item.value}>
                          {item.label}
                          <Select.ItemIndicator />
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Portal>
              </Select.Root>
            )}
          />

          <Button type="submit" variant="surface" disabled={readOnly}>
            Invite
          </Button>
        </Group>
        <SubscribeFormError form={form} />
      </Stack>
    </Form>
  );
}
