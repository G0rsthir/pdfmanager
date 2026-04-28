import {
  createCollectionMutation,
  deleteCollectionMutation,
  getCollectionPermissionsOptions,
  getLibraryTreeOptions,
  listCollectionsOptions,
  updateCollectionMutation,
} from "@/api/@tanstack/react-query.gen";
import type { LibraryTreeNode } from "@/api/types.gen";
import { parseAPIError } from "@/common/error";
import { GenericIconButton } from "@/components/ui/button";
import { FormError } from "@/components/ui/error";
import { QueryView } from "@/components/ui/feedback";
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
  Button,
  CloseButton,
  Combobox,
  createTreeCollection,
  Dialog,
  Field,
  Group,
  Input,
  Link,
  Menu,
  Portal,
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
          No collections yet.
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
      <CreateNodeDialog type="group" open={open} onClose={onClose} />
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
            value="createGroup"
            onClick={(e) => {
              e.stopPropagation();
              setDialog({ type: "create", nodeType: "group" });
            }}
          >
            Create collection
          </Menu.Item>
        )}
        {isGroup && (
          <Menu.Item
            value="createFolder"
            onClick={(e) => {
              e.stopPropagation();
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
          onClick={(e) => {
            e.stopPropagation();
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
        type={dialog?.nodeType ?? "group"}
        open={dialog?.type === "edit"}
        onClose={onClose}
        defaaultValues={node}
        id={node.id}
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

  const {
    Field: FormField,
    handleSubmit,
    state,
    reset,
  } = useFormMutation({
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
    reset();
    onClose();
  }, [onClose, reset]);

  return (
    <FormModal
      open={open}
      close={handleClose}
      title={`New ${label}`}
      onSubmit={() => handleSubmit()}
      confirmBtnText="Create"
    >
      <FormField
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
      <FormError errors={state.errorMap.onSubmit} />
    </FormModal>
  );
}

interface CollectionSelectProps {
  onValueChange: (values?: string) => void;
  defaultValue?: string;
  onBlur: () => void;
  required?: boolean;
}

export function CollectionSelect(props: CollectionSelectProps) {
  const { onValueChange, defaultValue, required, onBlur } = props;

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
        })),
      );
    }
  }, [query.data, query.isSuccess, set]);

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
  type: NodeType;
  open: boolean;
  onClose: () => void;
  defaaultValues: {
    parent_id?: string | null;
    name: string;
  };
  id: string;
}) {
  const {
    type,
    open,
    onClose,
    defaaultValues: { parent_id, name },
    id,
  } = props;

  const label = nodeLabel(type);

  const {
    Field: FormField,
    handleSubmit,
    state,
    reset,
  } = useFormMutation({
    formOptions: {
      defaultValues: {
        name: name,
        parent_id: parent_id,
      },
    },
    mutationOptions: updateCollectionMutation,
    onMutate: (value) => ({ path: { id }, body: value }),
    successMessage: `${label} updated successfully`,
    onSuccess: onClose,
  });

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  return (
    <FormModal
      open={open}
      close={handleClose}
      title={`Edit ${label}`}
      onSubmit={() => handleSubmit()}
      confirmBtnText="Update"
    >
      <FormField
        name="name"
        validators={{
          onChange: ({ value }) => (!value ? "Name is required" : undefined),
        }}
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
      <FormField
        name="parent_id"
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root invalid={!fieldState.meta.isValid} required>
            <CollectionSelect
              defaultValue={fieldState.value ?? ""}
              onValueChange={handleChange}
              onBlur={handleBlur}
            />
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />
      <FormError errors={state.errorMap.onSubmit} />
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
                {(access) => <PermissionsView access={access} />}
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
