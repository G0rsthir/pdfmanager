import { Group, Kbd, Text } from "@chakra-ui/react";

export function TextNote() {
  return (
    <Group gap={4} rowGap={1.5} wrap="wrap" justify="end" textStyle="xs">
      <Text fontWeight="medium" me="auto">
        Refine text search:
      </Text>
      <Group gap={1.5}>
        <Kbd size="sm" colorPalette="gray">
          "…"
        </Kbd>
        <Text>exact phrase</Text>
      </Group>
      <Group gap={1.5}>
        <Kbd size="sm" colorPalette="gray">
          *
        </Kbd>
        <Text>wildcard</Text>
      </Group>
      <Group gap={1.5}>
        <Kbd size="sm" colorPalette="gray">
          -
        </Kbd>
        <Text>exclude</Text>
      </Group>
    </Group>
  );
}
