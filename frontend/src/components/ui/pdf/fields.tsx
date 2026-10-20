import { Editable } from "@chakra-ui/react";
import { useState } from "react";
import { EditableCombobox } from "../editable";

function useFieldKey(value: string) {
  const [revision, setRevision] = useState(0);
  return [`${revision}:${value}`, () => setRevision((r) => r + 1)] as const;
}

export function BodyField(props: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
}) {
  const { value, disabled, required, onChange } = props;
  const [key, reset] = useFieldKey(value);

  return (
    <Editable.Root
      key={key}
      size="sm"
      defaultValue={value}
      onValueCommit={(e) => {
        const next = e.value.trim();
        if (next == value.trim()) return;
        if (!next && required) {
          reset();
          return;
        }
        onChange(next);
      }}
      placeholder="Add a note…"
      disabled={disabled}
    >
      <Editable.Preview textStyle="sm" whiteSpace="pre-wrap" />
      <Editable.Textarea rows={3} resize="none" />
    </Editable.Root>
  );
}

export function LabelField(props: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  suggestions?: string[];
}) {
  const { value, disabled, onChange, suggestions } = props;
  const [key] = useFieldKey(value);

  return (
    <Editable.Root
      key={key}
      size="sm"
      defaultValue={value}
      onValueCommit={(e) => {
        const next = e.value.trim();
        if (next != value) onChange(next);
      }}
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
