import { formatRelativeTime } from "@/common/date";
import { PaletteColors } from "@/config/theme";
import {
  Badge,
  Blockquote,
  Box,
  Button,
  CloseButton,
  ColorPicker,
  Editable,
  Group,
  Heading,
  Menu,
  parseColor,
  Portal,
  SegmentGroup,
  Separator,
  Stack,
  Tabs,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import {
  LuCheck,
  LuHighlighter,
  LuMessageSquare,
  LuTrash2,
  LuX,
} from "react-icons/lu";
import { GenericIconButton } from "../button";
import type {
  AnnotationTab,
  CommentDraft,
  CommentItem,
  CommentsApi,
  HighlightItem,
  HighlightsApi,
} from "./types";

const HighlightColors = PaletteColors.filter((color) =>
  ["yellow", "green", "blue", "pink", "red"].includes(color.value),
);

interface AnnotationsPanelProps {
  comments: CommentsApi;
  highlights: HighlightsApi;
  draftComment: CommentDraft | null;
  currentPage: number;
  tab: AnnotationTab;
  onTabChange: (tab: AnnotationTab) => void;
  onClose: () => void;
  onJumpToHighlight: (highlight: HighlightItem) => void;
  onJumpToComment: (comment: CommentItem) => void;
  onCancelDraftComment: () => void;
}

export function AnnotationsPanel(props: AnnotationsPanelProps) {
  const {
    comments,
    highlights,
    draftComment,
    currentPage,
    tab,
    onTabChange,
    onClose,
    onJumpToHighlight,
    onJumpToComment,
    onCancelDraftComment,
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
      <Group justify="space-between" align="center" px="3" py="2">
        <Heading size="sm" fontWeight="medium">
          Annotations
        </Heading>
        <GenericIconButton
          size="xs"
          variant="ghost"
          aria-label="Close annotations"
          onClick={onClose}
        >
          <LuX />
        </GenericIconButton>
      </Group>
      <Separator />

      <Tabs.Root
        value={tab}
        onValueChange={(e) => onTabChange(e.value as AnnotationTab)}
        variant="line"
        size="sm"
        flex="1"
        minH={0}
        display="flex"
        flexDirection="column"
      >
        <Tabs.List px="2" flexShrink={0}>
          <Tabs.Trigger value="comments">
            <LuMessageSquare />
            Comments
          </Tabs.Trigger>
          <Tabs.Trigger value="highlights">
            <LuHighlighter />
            Highlights
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="comments" flex="1" minH={0} overflowY="auto" p="3">
          <Stack gap={4}>
            {draftComment && (
              <CommentComposer
                draft={draftComment}
                onSubmit={comments.create}
                onCancel={onCancelDraftComment}
              />
            )}
            <CommentList
              items={comments.items}
              onJump={onJumpToComment}
              onDelete={comments.delete}
              onUpdate={comments.update}
              currentPage={currentPage}
            />
          </Stack>
        </Tabs.Content>
        <Tabs.Content
          value="highlights"
          flex="1"
          minH={0}
          overflowY="auto"
          p="3"
        >
          <HighlightList
            items={highlights.items}
            currentPage={currentPage}
            onJump={onJumpToHighlight}
            onDelete={highlights.delete}
            onUpdate={highlights.update}
          />
        </Tabs.Content>
      </Tabs.Root>
    </Stack>
  );
}

function CommentComposer(props: {
  draft: CommentDraft;
  onSubmit: CommentsApi["create"];
  onCancel: () => void;
}) {
  const { draft, onSubmit, onCancel } = props;

  const [body, setBody] = useState("");
  const [label, setLabel] = useState("");

  const trimmed = body.trim();

  const submit = () => {
    if (!trimmed) return;
    onSubmit({
      ...draft,
      body,
      label,
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
      <Blockquote.Root colorPalette="purple">
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
        <LabelField value={label} onChange={setLabel} />
        <Button size="xs" variant="solid" onClick={submit} disabled={!trimmed}>
          Add
        </Button>
      </Group>
    </Stack>
  );
}

function CommentList(props: {
  items: CommentItem[];
  currentPage: number;
  onJump: (item: CommentItem) => void;
  onDelete: CommentsApi["delete"];
  onUpdate: CommentsApi["update"];
}) {
  const { items, currentPage, onJump, onDelete, onUpdate } = props;
  const [scope, setScope] = useState<"all" | "page">("all");

  const visible = useMemo(
    () =>
      scope === "all" ? items : items.filter((c) => c.page === currentPage),
    [items, scope, currentPage],
  );

  if (items.length === 0) {
    return (
      <Text textStyle="sm" color="fg.muted">
        Select text in the document to add a comment.
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
          No comments on this page.
        </Text>
      )}
      {visible.map((comment) => (
        <Stack
          key={comment.id}
          gap={2}
          p={3}
          rounded="md"
          bg="bg"
          borderWidth="1px"
          borderColor="border.muted"
        >
          <Group justify="space-between" align="baseline">
            <Text textStyle="xs" color="fg.muted">
              p. {comment.page} - {comment.author_name} -{" "}
              {formatRelativeTime(comment.created_at)}
            </Text>
            <GenericIconButton
              size="2xs"
              variant="ghost"
              aria-label="Delete comment"
              colorPalette="red"
              onClick={() => onDelete(comment.id)}
            >
              <LuTrash2 />
            </GenericIconButton>
          </Group>
          <Blockquote.Root
            colorPalette="purple"
            cursor="pointer"
            onClick={() => onJump(comment)}
            color="fg.muted"
            _hover={{ color: "fg" }}
          >
            <Blockquote.Content>
              <Text textStyle="xs" lineClamp={2}>
                {comment.excerpt}
              </Text>
            </Blockquote.Content>
          </Blockquote.Root>
          <BodyField
            value={comment.body}
            onChange={(v) => onUpdate(comment.id, { body: v })}
          />
          <LabelField
            value={comment.label ?? ""}
            onChange={(v) => onUpdate(comment.id, { label: v || undefined })}
          />
        </Stack>
      ))}
    </Stack>
  );
}

function BodyField(props: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { value, onChange } = props;

  return (
    <Editable.Root
      size="sm"
      defaultValue={value}
      onValueCommit={(e) => {
        const next = e.value.trim();
        if (next && next !== value) onChange(next);
      }}
      placeholder="Add a note…"
    >
      <Editable.Preview textStyle="sm" whiteSpace="pre-wrap" />
      <Editable.Textarea rows={3} resize="none" />
    </Editable.Root>
  );
}

function HighlightList(props: {
  items: HighlightsApi["items"];
  currentPage: number;
  onJump: (item: HighlightItem) => void;
  onDelete: HighlightsApi["delete"];
  onUpdate: HighlightsApi["update"];
}) {
  const { items, currentPage, onJump, onDelete, onUpdate } = props;
  const [scope, setScope] = useState<"all" | "page">("all");

  const visible = useMemo(
    () =>
      scope === "all" ? items : items.filter((h) => h.page === currentPage),
    [items, scope, currentPage],
  );

  if (items.length == 0) {
    return (
      <Text textStyle="sm" color="fg.muted">
        Select text in the document to create a highlight.
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
          No highlights on this page.
        </Text>
      )}
      {visible.map((highlight) => (
        <Group
          key={highlight.id}
          align="stretch"
          gap={0}
          rounded="md"
          overflow="hidden"
          borderWidth="1px"
          borderColor="border.muted"
          bg="bg"
        >
          <ColorSwatchMenu
            color={highlight.color}
            onChange={(color) => onUpdate(highlight.id, { color })}
          />
          <Stack gap={1} p={3} flex={1} minW={0}>
            <Group justify="space-between">
              <Text textStyle="xs" color="fg.muted">
                p. {highlight.page}
              </Text>
              <GenericIconButton
                size="2xs"
                variant="ghost"
                aria-label="Delete highlight"
                colorPalette="red"
                onClick={() => {
                  onDelete(highlight.id);
                }}
              >
                <LuTrash2 />
              </GenericIconButton>
            </Group>
            <Text
              textStyle="sm"
              lineClamp={2}
              cursor="pointer"
              _hover={{ color: "colorPalette.300" }}
              onClick={() => onJump(highlight)}
            >
              {highlight.excerpt}
            </Text>
            <LabelField
              value={highlight.label ?? ""}
              onChange={(v) =>
                onUpdate(highlight.id, { label: v || undefined })
              }
            />
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
}) {
  const { value, onChange } = props;

  return (
    <Editable.Root
      size="sm"
      defaultValue={value}
      onValueCommit={(e) => onChange(e.value)}
      placeholder="Add label…"
    >
      <Editable.Preview
        color={value ? "fg.muted" : "fg.subtle"}
        fontFamily="mono"
      />
      <Editable.Input fontFamily="mono" />
    </Editable.Root>
  );
}
