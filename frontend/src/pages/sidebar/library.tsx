import {
  createCollectionMutation,
  createFolderMutation,
  deleteCollectionMutation,
  deleteFolderMutation,
  getLibraryTreeOptions,
  listCollectionsOptions,
  updateCollectionMutation,
  updateFolderMutation,
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
  Combobox,
  createTreeCollection,
  Field,
  Group,
  Input,
  Link,
  Menu,
  Portal,
  Text,
  TreeView,
  useCombobox,
  useDisclosure,
  useFilter,
  useListCollection,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import { LuChevronRight, LuFolderOpen, LuLibrary } from "react-icons/lu";
import { useNavigate, useParams } from "react-router";
import { useShallow } from "zustand/shallow";

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
          entity_type: "collection",
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
                    <TreeNodeActions node={node} indexPath={indexPath} />
                  </TreeView.BranchControl>
                );

              return (
                <TreeView.Item>
                  <LuLibrary />
                  <TreeView.ItemText>{node.name}</TreeView.ItemText>
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
      <CreateNodeDialog type="collection" open={open} onClose={onClose} />
    </>
  );
}

type NodeType = "collection" | "folder";

type NodeDialog = {
  type: "create" | "edit" | "delete";
  nodeType: NodeType;
} | null;

function TreeNodeActions({
  node,
}: TreeView.NodeProviderProps<LibraryTreeNode>) {
  const isCollection = node.entity_type == "collection";

  const [dialog, setDialog] = useState<NodeDialog>(null);
  const onClose = () => setDialog(null);

  return (
    <>
      <TreeNodeMenu opacitySelector=".css-wurrfy:hover &">
        {isCollection && (
          <Menu.Item
            value="createCollection"
            onClick={(e) => {
              e.stopPropagation();
              setDialog({ type: "create", nodeType: "collection" });
            }}
          >
            Create collection
          </Menu.Item>
        )}
        {isCollection && (
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
        type={dialog?.nodeType ?? "collection"}
        open={dialog?.type === "create"}
        onClose={onClose}
        parent_id={node.id}
      />
      <EditNodeDialog
        type={dialog?.nodeType ?? "collection"}
        open={dialog?.type === "edit"}
        onClose={onClose}
        defaaultValues={node}
        id={node.id}
      />
      <DeleteNodeDialog
        type={dialog?.nodeType ?? "collection"}
        open={dialog?.type === "delete"}
        onClose={onClose}
        node={node}
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
          value="createCollection"
          onClick={() => setDialog({ type: "create", nodeType: "collection" })}
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
        type={dialog?.nodeType ?? "collection"}
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
  return type == "collection" ? "Collection" : "Folder";
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
      },
    },
    mutationOptions:
      type == "collection" ? createCollectionMutation : createFolderMutation,
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
    onValueChange: ({ value }) => onValueChange(value[0] || ""),
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
    mutationOptions:
      type === "collection" ? updateCollectionMutation : updateFolderMutation,
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

  const mutation =
    type == "collection" ? deleteCollectionMutation() : deleteFolderMutation();

  const { mutate: deleteRequest } = useAPIMutation({
    ...mutation,
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
      {type === "collection" ? " and nested collections" : " folder"}.
    </ConfirmModal>
  );
}
