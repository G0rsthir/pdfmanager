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
import type {
  LibraryTreeNode,
  ResourcePermissionResponse,
} from "@/api/types.gen";
import { parseAPIError } from "@/common/error";
import { GenericIconButton } from "@/components/ui/button";
import { FormError } from "@/components/ui/error";
import { QueryView } from "@/components/ui/feedback";
import { Form } from "@/components/ui/form/container";
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
          id: "ROOT",
          name: "",
          children: data,
          entity_type: "group",
          is_read_only_by_current_user: false,
          is_shared: false,
        },
      }),
    [data],
  );

  const { folderid } = useParams();

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
      <CreateNodeDialog type="folder" open={open} onClose={onClose} />
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

  return (
    <>
      <TreeNodeMenu opacitySelector=".css-wurrfy:hover &">
        {isGroup && (
          <Menu.Item
            disabled={node.is_read_only_by_current_user}
            value="createGroup"
            onClick={(e) => {
              e.stopPropagation();
              if (node.is_read_only_by_current_user) return;
              setDialog({ type: "create", nodeType: "group" });
            }}
          >
            Create collection
          </Menu.Item>
        )}
        {isGroup && (
          <Menu.Item
            value="createFolder"
            disabled={node.is_read_only_by_current_user}
            onClick={(e) => {
              e.stopPropagation();
              if (node.is_read_only_by_current_user) return;
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
          disabled={node.is_read_only_by_current_user}
          onClick={(e) => {
            e.stopPropagation();
            if (node.is_read_only_by_current_user) return;
            setDialog({ type: "delete", nodeType: node.entity_type });
          }}
        >
          Delete
        </Menu.Item>
      </TreeNodeMenu>
      <CreateNodeDialog
        type={dialog?.nodeType ?? "group"}
        open={dialog?.type === "create"}
        onClose={onClose}
        parent_id={node.id}
      />
      <EditNodeDialog
        open={dialog?.type === "edit"}
        onClose={onClose}
        node={node}
      />
      <DeleteNodeDialog
        type={dialog?.nodeType ?? "group"}
        open={dialog?.type === "delete"}
        onClose={onClose}
        node={node}
      />
      <PermissionsDialog
        open={dialog?.type === "permissions"}
        onClose={onClose}
        resourceId={node.id}
        resourceName={node.name}
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
        open={dialog?.type === "create"}
        onClose={onClose}
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
}) {
  const { type, open, onClose, parent_id } = props;

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
      confirmBtnType="userWrite"
      submitOnEnter
    >
      <form.Field
        name="name"
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root invalid={!fieldState.meta.isValid} required>
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
      <FormError errors={form.state.errorMap.onSubmit} />
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
}) {
  const { open, onClose, node } = props;

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

  const handleClose = useCallback(() => {
    form.reset();
    onClose();
  }, [onClose, form]);

  return (
    <FormModal
      open={open}
      close={handleClose}
      title={`Edit ${label}`}
      onSubmit={() => form.handleSubmit()}
      confirmBtnText="Update"
      disabled={node.is_read_only_by_current_user}
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
            disabled={node.is_read_only_by_current_user}
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
            disabled={node.is_read_only_by_current_user}
          >
            <CollectionSelect
              defaultValue={fieldState.value ?? ""}
              onValueChange={handleChange}
              onBlur={handleBlur}
              allowedCollectionIds={moveTargetsQ.data?.map((c) => c.id)}
            />
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />
      <FormError errors={form.state.errorMap.onSubmit} />
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
}) {
  const { open, onClose, resourceId, resourceName } = props;

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
                {(access) => <ManageCollectionPermissions access={access} />}
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
}) {
  const { access } = props;

  const session = useGlobalStore(useShallow((state) => state.session));

  const isReadOnly = access.assignments.some(
    (p) => p.permission == "read" && p.user.id === session?.user.id,
  );

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
      {isReadOnly && (
        <Alert.Root status="warning">
          <Alert.Indicator />
          <Alert.Title>You have view-only access to this resource</Alert.Title>
        </Alert.Root>
      )}
      <InviteForm collectionId={access.id} readOnly={isReadOnly} />
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

const PERMISSION_OPTIONS = createListCollection({
  items: [
    { value: "read", label: "Viewer" },
    { value: "modify", label: "Editor" },
  ],
});

function InviteForm(props: { collectionId: string; readOnly?: boolean }) {
  const { collectionId, readOnly } = props;

  const { form } = useFormMutation({
    formOptions: {
      defaultValues: {
        email: "",
        permission: "read" as "read" | "modify",
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
                  handleChange(e.value[0] as "read" | "modify")
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
        <FormError errors={form.state.errorMap.onSubmit} />
      </Stack>
    </Form>
  );
}
