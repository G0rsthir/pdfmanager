import { useLibraryLayout } from "@/hooks/layout";
import { HStack, Icon, RadioCard, SegmentGroup } from "@chakra-ui/react";
import { LuLayoutGrid, LuTable2 } from "react-icons/lu";

export type LibraryLayout = "grid" | "table";

export const DEFAULT_LIBRARY_LAYOUT: LibraryLayout = "table";

interface Layout {
  value: LibraryLayout;
  label: string;
  icon: React.ReactNode;
}

const LAYOUTS: Layout[] = [
  { value: "grid", label: "Grid", icon: <LuLayoutGrid /> },
  { value: "table", label: "Table", icon: <LuTable2 /> },
];

export function LayoutSegment(props: {
  value: LibraryLayout;
  onChange: (value: LibraryLayout) => void;
  showLabels?: boolean;
}) {
  const { value, onChange, showLabels } = props;

  return (
    <SegmentGroup.Root
      size="sm"
      value={value}
      onValueChange={({ value: next }) =>
        next && onChange(next as LibraryLayout)
      }
    >
      <SegmentGroup.Indicator />
      {LAYOUTS.map((option) => (
        <SegmentGroup.Item
          key={option.value}
          value={option.value}
          title={option.label}
          cursor="pointer"
        >
          <SegmentGroup.ItemText display="flex" alignItems="center" gap={2}>
            {option.icon}
            {showLabels && option.label}
          </SegmentGroup.ItemText>
          <SegmentGroup.ItemHiddenInput />
        </SegmentGroup.Item>
      ))}
    </SegmentGroup.Root>
  );
}

export function LayoutRadioCards(props: {
  value: LibraryLayout;
  onChange: (value: LibraryLayout) => void;
}) {
  const { value, onChange } = props;

  return (
    <RadioCard.Root
      value={value}
      onValueChange={({ value: next }) =>
        next && onChange(next as LibraryLayout)
      }
      orientation="horizontal"
      maxW="sm"
    >
      <HStack align="stretch">
        {LAYOUTS.map((option) => (
          <RadioCard.Item
            key={option.value}
            value={option.value}
            cursor="pointer"
          >
            <RadioCard.ItemHiddenInput />
            <RadioCard.ItemControl>
              <Icon fontSize="xl" color="fg.subtle">
                {option.icon}
              </Icon>
              <RadioCard.ItemText>{option.label}</RadioCard.ItemText>
              <RadioCard.ItemIndicator />
            </RadioCard.ItemControl>
          </RadioCard.Item>
        ))}
      </HStack>
    </RadioCard.Root>
  );
}

export function LayoutSwitch({ layoutKey }: { layoutKey: string }) {
  const [layout, setLayout] = useLibraryLayout(layoutKey);
  return <LayoutSegment value={layout} onChange={setLayout} />;
}
