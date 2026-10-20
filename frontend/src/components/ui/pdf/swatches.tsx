import { Box, Group, type GroupProps } from "@chakra-ui/react";
import { HighlightColors } from "./colors";
import { ViewerTooltip } from "./portal";

interface ColorSwatchesProps extends Omit<GroupProps, "children"> {
  label: string;
  current?: string;
  onPick: (color: string) => void;
}

export function ColorSwatches(props: ColorSwatchesProps) {
  const { label, current, onPick, ...rest } = props;

  return (
    <Group gap="1.5" px="1.5" {...rest}>
      {HighlightColors.map((color) => (
        <ViewerTooltip
          key={color.value}
          content={`${label}: ${color.value}`}
          openDelay={400}
        >
          <Box
            as="button"
            aria-pressed={
              current == undefined ? undefined : current == color.value
            }
            boxSize="3.5"
            rounded="full"
            bg={`${color.value}.solid`}
            cursor="pointer"
            outlineWidth={current == color.value ? "2px" : "0"}
            outlineStyle="solid"
            outlineColor="fg.muted"
            outlineOffset="1px"
            _hover={{ transform: "scale(1.15)" }}
            _focusVisible={{ outlineWidth: "2px", outlineColor: "fg" }}
            onClick={() => onPick(color.value)}
          />
        </ViewerTooltip>
      ))}
    </Group>
  );
}
