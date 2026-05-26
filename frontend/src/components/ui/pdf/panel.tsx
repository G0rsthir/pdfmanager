import { formatRelativeTime } from "@/common/date";
import { PaletteColors } from "@/config/theme";
import {
  Badge,
  Blockquote,
  Box,
  Button,
  CloseButton,
  ColorPicker,
  createTreeCollection,
  Editable,
  Group,
  Menu,
  parseColor,
  Portal,
  SegmentGroup,
  Separator,
  Stack,
  Tabs,
  Text,
  Textarea,
  TreeView,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import {
  LuCheck,
  LuChevronRight,
  LuList,
  LuMessageSquare,
  LuTrash2,
  LuX,
} from "react-icons/lu";
import { GenericIconButton } from "../button";
import { EditableCombobox } from "../editable";
import type {
  AnnotationDraft,
  AnnotationItem,
  AnnotationsApi,
  OutlineItem,
  SidePanelTab,
} from "./types";

const HighlightColors = PaletteColors.filter((color) =>
  ["yellow", "green", "blue", "pink", "red"].includes(color.value),
);

interface SidePanelProps {
  annotations: AnnotationsApi;
  draftAnnotation: AnnotationDraft | null;
  currentPage: number;
  tab: SidePanelTab;
  outline: OutlineItem[] | null;
  readOnly?: boolean;
  onTabChange: (tab: SidePanelTab) => void;
  onClose: () => void;
  onJumpToAnnotation: (annotation: AnnotationItem) => void;
  onJumpToOutlineItem: (dest: OutlineItem["dest"]) => void;
  onCancelDraftAnnotation: () => void;
}

export function SidePanel(props: SidePanelProps) {
  const {
    annotations,
    draftAnnotation,
    currentPage,
    tab,
    outline,
    readOnly,
    onTabChange,
    onClose,
    onJumpToAnnotation,
    onJumpToOutlineItem,
    onCancelDraftAnnotation,
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
      <Group justify="flex-end" align="center" px="3" py="2">
        <GenericIconButton
          size="xs"
          variant="ghost"
          aria-label="Close Panel"
          onClick={onClose}
        >
          <LuX />
        </GenericIconButton>
      </Group>
      <Separator />

      <Tabs.Root
        value={tab}
        onValueChange={(e) => onTabChange(e.value as SidePanelTab)}
        variant="line"
        size="sm"
        flex="1"
        minH={0}
        display="flex"
        flexDirection="column"
      >
        <Tabs.List px="2" flexShrink={0}>
          <Tabs.Trigger value="annotations">
            <LuMessageSquare />
            Annotations
          </Tabs.Trigger>
          <Tabs.Trigger value="outline">
            <LuList />
            Outline
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content
          value="annotations"
          flex="1"
          minH={0}
          overflowY="auto"
          p="3"
        >
          <Stack gap={4}>
            {draftAnnotation && (
              <CommentComposer
                draft={draftAnnotation}
                onSubmit={annotations.create}
                onCancel={onCancelDraftAnnotation}
                labels={annotations.labels}
              />
            )}
            <AnnotationList
              items={annotations.items}
              readOnly={readOnly}
              onJump={onJumpToAnnotation}
              onDelete={annotations.delete}
              onUpdate={annotations.update}
              currentPage={currentPage}
              labels={annotations.labels}
            />
          </Stack>
        </Tabs.Content>

        <Tabs.Content value="outline" flex="1" minH={0} overflowY="auto" p="3">
          <OutlineView items={outline} onNavigate={onJumpToOutlineItem} />
        </Tabs.Content>
      </Tabs.Root>
    </Stack>
  );
}

function CommentComposer(props: {
  draft: AnnotationDraft;
  onSubmit: AnnotationsApi["create"];
  labels?: AnnotationsApi["labels"];
  onCancel: () => void;
}) {
  const { draft, labels, onSubmit, onCancel } = props;

  const [body, setBody] = useState("");
  const [label, setLabel] = useState("");

  const trimmed = body.trim();

  const submit = () => {
    if (!trimmed) return;
    onSubmit({
      ...draft,
      body,
      label,
      color: "gray",
    });
    setBody("");
  };

  return (
    <Stack
      gap={2}
      p={3}
      rounded="md"
      bg="bg"
      borderWidth="1px"
      borderColor="border.emphasized"
    >
      <Group justify="space-between" align="center">
        <Badge size="sm" variant="subtle">
          Page {draft.page}
        </Badge>
        <CloseButton size="2xs" colorPalette="gray" onClick={onCancel} />
      </Group>
      <Blockquote.Root variant="plain">
        <Blockquote.Content>
          <Text textStyle="xs" color="fg.muted" lineClamp={2}>
            {draft.excerpt}
          </Text>
        </Blockquote.Content>
      </Blockquote.Root>
      <Textarea
        size="sm"
        placeholder="Add a note…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            submit();
          }
        }}
        rows={3}
        resize="none"
        autoFocus
      />
      <Group gap={4}>
        <LabelField value={label} onChange={setLabel} suggestions={labels} />
        <Button size="xs" variant="solid" onClick={submit} disabled={!trimmed}>
          Add
        </Button>
      </Group>
    </Stack>
  );
}

function BodyField(props: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const { value, disabled, onChange } = props;

  return (
    <Editable.Root
      size="sm"
      defaultValue={value}
      onValueCommit={(e) => {
        const next = e.value.trim();
        if (next && next !== value) onChange(next);
      }}
      placeholder="Add a note…"
      disabled={disabled}
    >
      <Editable.Preview textStyle="sm" whiteSpace="pre-wrap" />
      <Editable.Textarea rows={3} resize="none" />
    </Editable.Root>
  );
}

function AnnotationList(props: {
  items: AnnotationsApi["items"];
  currentPage: number;
  readOnly?: boolean;
  labels?: AnnotationsApi["labels"];
  onJump: (item: AnnotationItem) => void;
  onDelete: AnnotationsApi["delete"];
  onUpdate: AnnotationsApi["update"];
}) {
  const { items, currentPage, readOnly, labels, onJump, onDelete, onUpdate } =
    props;
  const [scope, setScope] = useState<"all" | "page">("all");

  const visible = useMemo(
    () =>
      scope === "all" ? items : items.filter((h) => h.page === currentPage),
    [items, scope, currentPage],
  );

  if (items.length == 0) {
    return (
      <Text textStyle="sm" color="fg.muted">
        Select text in the document to create a annotation.
      </Text>
    );
  }
  return (
    <Stack gap={3}>
      <SegmentGroup.Root
        size="xs"
        value={scope}
        onValueChange={(e) => setScope(e.value as "all" | "page")}
      >
        <SegmentGroup.Indicator />
        <SegmentGroup.Items
          items={[
            { value: "all", label: "All" },
            { value: "page", label: "Current Page" },
          ]}
        />
      </SegmentGroup.Root>
      {visible.length === 0 && (
        <Text textStyle="sm" color="fg.muted">
          No annotations on this page.
        </Text>
      )}
      {visible.map((annotation) => (
        <Group
          key={annotation.id}
          align="stretch"
          gap={0}
          rounded="md"
          overflow="hidden"
          borderWidth="1px"
          borderColor="border.muted"
          bg="bg"
        >
          <ColorSwatchMenu
            color={annotation.color}
            onChange={(color) => onUpdate(annotation.id, { color })}
          />
          <Stack gap={1} p={3} flex={1} minW={0}>
            <Group justify="space-between" align="start">
              <LabelField
                value={annotation.label ?? ""}
                onChange={(v) =>
                  onUpdate(annotation.id, { label: v || undefined })
                }
                disabled={readOnly}
                suggestions={labels}
              />
              <GenericIconButton
                size="2xs"
                variant="ghost"
                aria-label="Delete annotation"
                colorPalette="red"
                onClick={() => {
                  onDelete(annotation.id);
                }}
              >
                <LuTrash2 />
              </GenericIconButton>
            </Group>
            <Blockquote.Root
              cursor="pointer"
              onClick={() => onJump(annotation)}
              color="fg.muted"
              variant="plain"
              _hover={{ color: "fg" }}
            >
              <Blockquote.Content>
                <Text textStyle="xs" lineClamp={2}>
                  {annotation.excerpt}
                </Text>
              </Blockquote.Content>
            </Blockquote.Root>
            <BodyField
              value={annotation.body}
              onChange={(v) => onUpdate(annotation.id, { body: v })}
              disabled={readOnly}
            />
            <Text textStyle="xs" color="fg.muted" textAlign="end">
              p. {annotation.page} - {annotation.author_name} -{" "}
              {formatRelativeTime(annotation.created_at)}
            </Text>
          </Stack>
        </Group>
      ))}
    </Stack>
  );
}

function ColorSwatchMenu(props: {
  color: string;
  onChange: (color: string) => void;
}) {
  const { color, onChange } = props;

  const swatchesColors = useMemo(() => {
    const colors: Record<string, string> = {};
    for (const color of HighlightColors) {
      colors[parseColor(color.value).toString("hex")] = color.value;
    }
    return colors;
  }, []);

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Box
          as="button"
          w="3px"
          bg={`${color}.solid`}
          cursor="pointer"
          _hover={{ w: "7px" }}
          transition="width 0.15s"
          aria-label="Change color"
        />
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content p={1}>
            <ColorPicker.Root
              defaultValue={parseColor(color)}
              maxW="200px"
              onValueChange={(e) => {
                const colorName =
                  swatchesColors?.[e.value.toString("hex")] ?? "yellow";
                onChange(colorName);
              }}
            >
              <ColorPicker.HiddenInput />
              <ColorPicker.SwatchGroup>
                {Object.keys(swatchesColors).map((item) => (
                  <ColorPicker.SwatchTrigger key={item} value={item}>
                    <ColorPicker.Swatch boxSize="4" value={item}>
                      <ColorPicker.SwatchIndicator>
                        <LuCheck />
                      </ColorPicker.SwatchIndicator>
                    </ColorPicker.Swatch>
                  </ColorPicker.SwatchTrigger>
                ))}
              </ColorPicker.SwatchGroup>
            </ColorPicker.Root>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}

function LabelField(props: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  suggestions?: string[];
}) {
  const { value, disabled, onChange, suggestions } = props;

  return (
    <Editable.Root
      size="sm"
      defaultValue={value}
      onValueCommit={(e) => onChange(e.value)}
      placeholder="Add label…"
      disabled={disabled}
    >
      <Editable.Preview
        color={value ? "fg.muted" : "fg.subtle"}
        fontFamily="mono"
      />
      <EditableCombobox suggestions={suggestions ?? []} size="xs" />
    </Editable.Root>
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
  if (items.length === 0) {
    return (
      <Text textStyle="sm" color="fg.muted">
        No outline available for this document.
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
