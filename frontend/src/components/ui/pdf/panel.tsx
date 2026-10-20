import {
  createTreeCollection,
  Stack,
  Tabs,
  Text,
  TreeView,
} from "@chakra-ui/react";
import { useMemo } from "react";
import { LuChevronRight, LuList, LuMessageSquare } from "react-icons/lu";
import { GenericCloseButton } from "../button";
import { AnnotationList } from "./annotation-list";
import type {
  AnnotationItem,
  AnnotationsApi,
  OutlineItem,
  SidePanelTab,
} from "./types";

interface SidePanelProps {
  annotations: AnnotationsApi;
  currentPage: number;
  tab: SidePanelTab;
  outline: OutlineItem[] | null;
  canAnnotate?: boolean;
  onTabChange: (tab: SidePanelTab) => void;
  onClose: () => void;
  onJumpToAnnotation: (annotation: AnnotationItem) => void;
  onJumpToOutlineItem: (dest: OutlineItem["dest"]) => void;
}

export function SidePanel(props: SidePanelProps) {
  const {
    annotations,
    currentPage,
    tab,
    outline,
    canAnnotate = true,
    onTabChange,
    onClose,
    onJumpToAnnotation,
    onJumpToOutlineItem,
  } = props;

  return (
    <Stack
      gap={0}
      h="full"
      w="320px"
      flexShrink={0}
      bg="bg.subtle"
      borderLeftWidth="1px"
      borderColor="border"
    >
      <Tabs.Root
        value={tab}
        onValueChange={(e) => onTabChange(e.value as SidePanelTab)}
        variant="line"
        size="sm"
        flex={1}
        overflowY="auto"
        display="flex"
        flexDirection="column"
      >
        <Tabs.List px={2} flexShrink={0}>
          <Tabs.Trigger value="annotations">
            <LuMessageSquare />
            Annotations
          </Tabs.Trigger>
          <Tabs.Trigger value="outline">
            <LuList />
            Outline
          </Tabs.Trigger>
          <GenericCloseButton size="xs" ms="auto" onClick={onClose} />
        </Tabs.List>

        <Tabs.Content value="annotations" flex={1} overflowY="auto" p={0}>
          <AnnotationList
            items={annotations.items}
            readOnly={!canAnnotate}
            onJump={onJumpToAnnotation}
            onDelete={annotations.delete}
            onUpdate={annotations.update}
            currentPage={currentPage}
            labels={annotations.labels}
          />
        </Tabs.Content>

        <Tabs.Content value="outline" flex={1} overflowY="auto" p={3}>
          <OutlineView items={outline} onNavigate={onJumpToOutlineItem} />
        </Tabs.Content>
      </Tabs.Root>
    </Stack>
  );
}

function OutlineView(props: {
  items: OutlineItem[] | null;
  onNavigate: (dest: OutlineItem["dest"]) => void;
}) {
  const { items, onNavigate } = props;

  const collection = useMemo(
    () =>
      createTreeCollection<OutlineItem>({
        nodeToValue: (node) => node.id,
        nodeToString: (node) => node.title,
        rootNode: {
          id: "ROOT",
          title: "",
          children: items ?? [],
          dest: null,
        },
      }),
    [items],
  );

  if (items === null) {
    return (
      <Text textStyle="sm" color="fg.muted">
        Loading outline
      </Text>
    );
  }
  if (items.length == 0) {
    return (
      <Text textStyle="sm" color="fg.muted">
        No outline available for this document
      </Text>
    );
  }

  return (
    <TreeView.Root
      collection={collection}
      expandOnClick={false}
      lazyMount={true}
    >
      <TreeView.Tree>
        <TreeView.Node
          indentGuide={<TreeView.BranchIndentGuide />}
          render={({ node, nodeState }) =>
            nodeState.isBranch ? (
              <TreeView.BranchControl>
                <TreeView.BranchTrigger>
                  <TreeView.BranchIndicator asChild>
                    <LuChevronRight />
                  </TreeView.BranchIndicator>
                </TreeView.BranchTrigger>
                <TreeView.BranchText>{node.title}</TreeView.BranchText>
              </TreeView.BranchControl>
            ) : (
              <TreeView.Item onClick={() => onNavigate(node.dest)}>
                <TreeView.ItemText>{node.title}</TreeView.ItemText>
              </TreeView.Item>
            )
          }
        />
      </TreeView.Tree>
    </TreeView.Root>
  );
}
