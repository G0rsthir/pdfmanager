import { Box, Group, Separator, Stack } from "@chakra-ui/react";
import { useState } from "react";
import {
  LuCheck,
  LuCopy,
  LuMessageSquare,
  LuPanelRightOpen,
  LuTrash2,
} from "react-icons/lu";
import { GenericIconButton } from "../button";
import { ViewerTooltip } from "./portal";
import { ColorSwatches } from "./swatches";
import type {
  AnnotationItem,
  PopoverAnchor,
  TextSelection,
  ViewerSelection,
} from "./types";

const COPIED_FEEDBACK_MS = 1200;

interface ContextToolbarProps {
  anchor: PopoverAnchor | null;
  selection: ViewerSelection;
  annotation: AnnotationItem | null;
  readOnly?: boolean;
  onHighlight: (color: string) => void;
  onComment: () => void;
  onChangeColor: (color: string) => void;
  onOpenDetails: () => void;
  onDelete: () => void;
}

export function ContextToolbar(props: ContextToolbarProps) {
  const { anchor, selection, annotation, ...actions } = props;

  if (!selection || !anchor) return null;

  return (
    <Box
      className="custom-context-toolbar"
      position="absolute"
      top={`${anchor.y + 4}px`}
      left={`${anchor.x - 50}px`}
      zIndex={50}
      bg="bg.panel"
      rounded="md"
      shadow="md"
      borderWidth="1px"
      p={1}
    >
      {selection.kind == "text" ? (
        <TextActions selection={selection} {...actions} />
      ) : (
        annotation && <ElementActions annotation={annotation} {...actions} />
      )}
    </Box>
  );
}

type ActionProps = Omit<
  ContextToolbarProps,
  "anchor" | "selection" | "annotation"
>;

function TextActions(props: ActionProps & { selection: TextSelection }) {
  const { selection, readOnly, onHighlight, onComment } = props;

  return (
    <Group gap="0.5" align="center">
      <CopyAction key={selection.text} text={selection.text} />
      {!readOnly && (
        <ToolbarIcon label="Add comment" onClick={onComment}>
          <LuMessageSquare />
        </ToolbarIcon>
      )}
      {!readOnly && (
        <>
          <Separator orientation="vertical" h="4" mx="0.5" />
          <ColorSwatches label="Highlight" onPick={onHighlight} />
        </>
      )}
    </Group>
  );
}

function ElementActions(props: ActionProps & { annotation: AnnotationItem }) {
  const {
    annotation,
    readOnly,
    onComment,
    onChangeColor,
    onOpenDetails,
    onDelete,
  } = props;

  const copyText = annotation.excerpt || annotation.body;

  return (
    <ActionRows
      colors={
        !readOnly && (
          <ColorSwatches
            label="Color"
            current={annotation.color}
            onPick={onChangeColor}
          />
        )
      }
    >
      {copyText && <CopyAction key={annotation.id} text={copyText} />}

      {!readOnly && (
        <ToolbarIcon
          label={annotation.body ? "Edit comment" : "Add comment"}
          onClick={onComment}
        >
          <LuMessageSquare />
        </ToolbarIcon>
      )}

      <ToolbarIcon label="Open in panel" onClick={onOpenDetails}>
        <LuPanelRightOpen />
      </ToolbarIcon>

      {!readOnly && (
        <ToolbarIcon label="Delete" onClick={onDelete} palette="red">
          <LuTrash2 />
        </ToolbarIcon>
      )}
    </ActionRows>
  );
}

function ActionRows(props: {
  colors?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { colors, children } = props;

  return (
    <Stack gap="1">
      <Group gap="0.5" align="center">
        {children}
      </Group>
      {colors && (
        <>
          <Separator />
          <Box py="1">{colors}</Box>
        </>
      )}
    </Stack>
  );
}

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      // Denied by the browser
    }
  };

  return { copied, copy };
}

function CopyAction(props: { text: string }) {
  const { copied, copy } = useCopy(props.text);

  return (
    <ToolbarIcon label={copied ? "Copied" : "Copy"} onClick={copy}>
      {copied ? <LuCheck /> : <LuCopy />}
    </ToolbarIcon>
  );
}

function ToolbarIcon(props: {
  label: string;
  palette?: "red";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const { label, palette, onClick, children } = props;

  return (
    <ViewerTooltip content={label} openDelay={1000}>
      <GenericIconButton
        size="xs"
        variant="ghost"
        colorPalette={palette}
        onClick={onClick}
      >
        {children}
      </GenericIconButton>
    </ViewerTooltip>
  );
}
