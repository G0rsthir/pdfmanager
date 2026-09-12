import { getLibraryTreeOptions } from "@/api/@tanstack/react-query.gen";
import {
  AccessScope,
  ResourcePermissionCapability,
  type LibraryTreeNode,
} from "@/api/types.gen";
import { useCan, useHasScopes } from "@/common/auth/hooks";
import { GenericIconButton } from "@/components/ui/button";
import { QueryView } from "@/components/ui/feedback";
import { Tooltip } from "@/components/ui/tooltip";
import { useAPIQuery } from "@/hooks/query";
import { useGlobalStore } from "@/store";
import {
  Avatar,
  Collapsible,
  createTreeCollection,
  Group,
  Link,
  Menu,
  Portal,
  Stack,
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

type CollectionNode = Omit<LibraryTreeNode, "children"> & {
  children?: LibraryNode[];
};

/**
 * Placeholder row rendered inside a group that has no children
 */
type EmptyNode = {
  id: string;
  entity_type: "empty";
  parent_id?: string;
  children?: never;
  // Same as parent
  capabilities: ResourcePermissionCapability[];
};

type LibraryNode = CollectionNode | EmptyNode;

const ROOT_NODE: CollectionNode = {
  id: "ROOT",
  name: "",
  children: [],
  entity_type: "group",
  capabilities: [
    ResourcePermissionCapability.READ,
    ResourcePermissionCapability.WRITE,
  ],
  is_shared_by_me: false,
  is_shared_with_me: false,
};

const MY_ROOT: CollectionNode = { ...ROOT_NODE, id: "MY" };
const SHARED_ROOT: CollectionNode = {
  ...ROOT_NODE,
  id: "SHARED",
  capabilities: [ResourcePermissionCapability.READ],
};

const EMPTY_NODE: Omit<EmptyNode, "id"> = {
  entity_type: "empty",
  capabilities: [],
};

function appendEmpty(root: LibraryNode, parentId?: string): LibraryNode {
  if (root.entity_type != "group") return root;

  const children =
    root.children?.map((child) => appendEmpty(child, child.id)) ?? [];

  return {
    ...root,
    children: children.length
      ? children
      : [
          {
            ...EMPTY_NODE,
            id: `${root.id}:empty`,
            parent_id: parentId,
            capabilities: root.capabilities,
          },
        ],
  };
}

export function Library() {
  const query = useAPIQuery({
    ...getLibraryTreeOptions(),
  });

  return (
    <QueryView query={query}>
      {(data) => {
        const mine = data.filter((n) => !n.is_shared_with_me);
        const shared = data.filter((n) => n.is_shared_with_me);
        return (
          <Stack gap={3}>
            <SidebarSection title="Library" actions={<LibraryActions />}>
              <LibraryTree root={MY_ROOT} data={mine} />
            </SidebarSection>
            {shared.length > 0 && (
              <SidebarSection title="Shared with me">
                <LibraryTree root={SHARED_ROOT} data={shared} />
              </SidebarSection>
            )}
          </Stack>
        );
      }}
    </QueryView>
  );
}

function SidebarSection(props: {
  title: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { title, actions, children } = props;

  return (
    <Collapsible.Root defaultOpen>
      <Group mb="1" w="full" className="group" justifyContent="space-between">
        <Collapsible.Trigger asChild>
          <Text as="button" fontWeight="semibold" cursor="pointer">
            {title}
          </Text>
        </Collapsible.Trigger>
        {actions}
      </Group>
      <Collapsible.Content>{children}</Collapsible.Content>
    </Collapsible.Root>
  );
}

export function LibraryTree(props: {
  data: LibraryNode[];
  root: CollectionNode;
}) {
  const { data, root } = props;

  const navigate = useNavigate();

  const state = useGlobalStore(
    useShallow((state) => ({
      expandedLibraryNodes: state.expandedLibraryNodes,
      setExpandedLibraryNodes: state.setExpandedLibraryNodes,
    })),
  );

  const collection = useMemo(
    () =>
      createTreeCollection<LibraryNode>({
        nodeToValue: (node) => node.id,
        nodeToString: (node) => node.id,
        rootNode: appendEmpty({ ...root, children: data }),
      }),
    [data, root],
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
        <TreeView.Tree>
          <TreeView.Node
            indentGuide={<TreeView.BranchIndentGuide />}
            render={({
              node,
              indexPath,
            }: {
              node: LibraryNode;
              indexPath: number[];
            }) => {
              if (node.entity_type == "empty")
                return (
                  <TreeView.Item>
                    <EmptyTreeNode node={node} />
                  </TreeView.Item>
                );

              if (node.entity_type == "folder")
                return (
                  <TreeView.Item
                    className="group"
                    onClick={() => navigate("folder/" + node.id)}
                    paddingInlineEnd="unset"
                  >
                    <LuFolderOpen />
                    <TreeView.ItemText>{node.name}</TreeView.ItemText>
                    <SharedIndicator node={node} />
                    <TreeNodeActions node={node} indexPath={indexPath} />
                  </TreeView.Item>
                );

              if (node.children?.length)
                return (
                  <TreeView.BranchControl
                    className="group"
                    paddingInlineEnd="unset"
                  >
                    <TreeView.BranchIndicator asChild>
                      <LuChevronRight />
                    </TreeView.BranchIndicator>
                    <TreeView.BranchText>{node.name}</TreeView.BranchText>
                    <SharedIndicator node={node} />
                    <TreeNodeActions node={node} indexPath={indexPath} />
                  </TreeView.BranchControl>
                );

              return (
                <TreeView.Item className="group" paddingInlineEnd="unset">
                  <LuLibrary />
                  <TreeView.ItemText>{node.name}</TreeView.ItemText>
                  <SharedIndicator node={node} />
                  <TreeNodeActions node={node} indexPath={indexPath} />
                </TreeView.Item>
              );
            }}
          />
        </TreeView.Tree>
      </TreeView.Root>
    </>
  );
}

function EmptyTreeNode({ node }: { node: EmptyNode }) {
  const { open, onClose, onOpen } = useDisclosure();

  const can = useCan(node);

  const canModify = can(ResourcePermissionCapability.WRITE);

  return (
    <>
      <Text textStyle="xs">
        No folders yet.
        {canModify && (
          <Link
            variant="underline"
            colorPalette="teal"
            onClick={onOpen}
            cursor="pointer"
            ms={2}
          >
            Create one
          </Link>
        )}
      </Text>
      <CreateCollectionDialog
        type="folder"
        open={open}
        onClose={onClose}
        parent_id={node.parent_id}
        readonly={!canModify}
      />
    </>
  );
}

function SharedIndicator({ node }: { node: CollectionNode }) {
  if (node.is_shared_with_me && node.owner)
    return (
      <Tooltip content={`Shared by ${node.owner.name}`}>
        <Avatar.Root
          size="2xs"
          flexShrink={0}
          boxSize="4"
          textStyle="2xs"
          colorPalette="gray"
        >
          <Avatar.Fallback />
        </Avatar.Root>
      </Tooltip>
    );

  if (node.is_shared_by_me)
    return (
      <Tooltip content="Shared with others">
        <LuLink2 size={12} style={{ opacity: 0.6, flexShrink: 0 }} />
      </Tooltip>
    );

  return null;
}

function containsNode(node: LibraryNode, targetId: string): boolean {
  if (node.id == targetId) return true;
  return node.children?.some((child) => containsNode(child, targetId)) ?? false;
}

type NodeType = CollectionNode["entity_type"];

type NodeDialog = {
  type: "create" | "edit" | "delete" | "permissions";
  nodeType: NodeType;
} | null;

function TreeNodeActions({ node }: TreeView.NodeProviderProps<CollectionNode>) {
  const isGroup = node.entity_type == "group";

  const [dialog, setDialog] = useState<NodeDialog>(null);
  const onClose = () => setDialog(null);

  const { folderid } = useParams();
  const navigate = useNavigate();

  const can = useCan(node);

  const canModify = can(ResourcePermissionCapability.WRITE);

  const isSharedRoot = node.is_shared_with_me && node.is_root;

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
      <TreeNodeMenu>
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
        canMove={!isSharedRoot}
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

function TreeNodeMenu({ children }: { children: React.ReactNode }) {
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <GenericIconButton
          position="sticky"
          right="0"
          top="0"
          scale="0.8"
          size="xs"
          variant="ghost"
          height={0}
          onClick={(e) => e.stopPropagation()}
          opacity={0}
          _groupHover={{ opacity: 1 }}
          _focusVisible={{ opacity: 1 }}
          _open={{ opacity: 1 }}
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
      <TreeNodeMenu>
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
