import { Box, Button, Group, Stack, Text, Textarea } from "@chakra-ui/react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { GenericCloseButton } from "../button";
import { LabelField } from "./fields";
import type { PopoverAnchor } from "./types";

const COMPOSER_WIDTH = 288;

export interface ComposerValue {
  body: string;
  label: string;
}

const EMPTY_VALUE: ComposerValue = { body: "", label: "" };

export function Composer(props: {
  containerRef: React.RefObject<HTMLElement | null>;
  anchor: PopoverAnchor;
  title: string;
  initial?: ComposerValue;
  submitLabel: string;
  labels?: string[];
  onSubmit: (value: ComposerValue) => void;
  onCancel: () => void;
}) {
  const {
    containerRef,
    anchor,
    title,
    initial = EMPTY_VALUE,
    submitLabel,
    labels,
    onSubmit,
    onCancel,
  } = props;

  const [body, setBody] = useState(initial.body);
  const [label, setLabel] = useState(initial.label);
  const rootRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmed = body.trim();
  const dirty = trimmed != initial.body.trim() || label != initial.label;

  const submit = () => {
    if (!trimmed) return;
    onSubmit({ body, label });
  };

  // Focus text
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, []);

  const handleOutsidePointer = useEffectEvent((event: PointerEvent) => {
    if (rootRef.current?.contains(event.target as Node)) return;
    if (!dirty) onCancel();
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("pointerdown", handleOutsidePointer);
    return () =>
      container.removeEventListener("pointerdown", handleOutsidePointer);
  }, [containerRef]);

  return (
    <Box
      ref={rootRef}
      className="custom-draft-composer"
      position="absolute"
      top={`${anchor.y + 6}px`}
      left={`${Math.max(8, anchor.x - COMPOSER_WIDTH)}px`}
      w={`${COMPOSER_WIDTH}px`}
      zIndex={50}
      bg="bg.panel"
      rounded="md"
      shadow="lg"
      borderWidth="1px"
      p={3}
    >
      <Stack gap={2}>
        <Group justify="space-between" align="center" gap={2}>
          <Text textStyle="xs" color="fg.muted" lineClamp={1}>
            {title}
          </Text>
          <GenericCloseButton size="2xs" onClick={onCancel} />
        </Group>
        <Textarea
          ref={textareaRef}
          size="sm"
          placeholder="Add a note…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key == "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              submit();
            } else if (e.key == "Escape") {
              e.preventDefault();
              onCancel();
            }
          }}
          rows={3}
          resize="none"
        />
        <Group gap={4}>
          <LabelField value={label} onChange={setLabel} suggestions={labels} />
          <Button
            size="xs"
            variant="solid"
            onClick={submit}
            disabled={!trimmed || !dirty}
          >
            {submitLabel}
          </Button>
        </Group>
      </Stack>
    </Box>
  );
}
