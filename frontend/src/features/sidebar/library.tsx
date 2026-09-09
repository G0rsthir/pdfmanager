import { getLibraryTreeOptions } from "@/api/@tanstack/react-query.gen";
import {
  AccessScope,
  ResourcePermissionCapability,
  type LibraryTreeNode,
} from "@/api/types.gen";
import { useCan, useHasScopes } from "@/common/auth/hooks";
import { GenericIconButton } from "@/components/ui/button";
import { QueryView } from "@/components/ui/feedback";
import { useAPIQuery } from "@/hooks/query";
import { useGlobalStore } from "@/store";
import {
  createTreeCollection,
  Group,
  Link,
  Menu,
  Portal,
  Text,
  TreeView,
  useDisclosure,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import {
  LuChevronRight,
  LuFolderOpen,
  LuLibrary,
  LuLink2,
} from "react-icons/lu";
import { useNavigate, useParams } from "react-router";
import { useShallow } from "zustand/shallow";
import {
  CreateCollectionDialog,
  DeleteCollectionDialog,
  EditCollectionDialog,
} from "../library/collection/actions";
import { PermissionsDialog } from "../library/collection/permissions";

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
      <CreateCollectionDialog
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

function containsNode(node: LibraryTreeNode, targetId: string): boolean {
  if (node.id == targetId) return true;
  return node.children?.some((child) => containsNode(child, targetId)) ?? false;
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

  const { folderid } = useParams();
  const navigate = useNavigate();

  const can = useCan(node);

  const canModify = can(ResourcePermissionCapability.WRITE);

  const canAssignPermissions = can(
    ResourcePermissionCapability.MANAGE_PERMISSIONS,
  );

  const handleNodeDelete = () => {
    if (folderid && containsNode(node, folderid)) {
      navigate("/", { replace: true });
    }
  };

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
      <CreateCollectionDialog
        type={dialog?.nodeType ?? "group"}
        open={dialog?.type == "create"}
        onClose={onClose}
        parent_id={node.id}
        readonly={!canModify}
      />
      <EditCollectionDialog
        open={dialog?.type == "edit"}
        onClose={onClose}
        collection={node}
        readonly={!canModify}
      />
      <DeleteCollectionDialog
        type={dialog?.nodeType ?? "group"}
        open={dialog?.type == "delete"}
        onClose={onClose}
        onSuccess={handleNodeDelete}
        collectionId={node.id}
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
      <CreateCollectionDialog
        type={dialog?.nodeType ?? "group"}
        open={dialog?.type == "create"}
        onClose={onClose}
        readonly={!canWrite}
      />
    </>
  );
}
