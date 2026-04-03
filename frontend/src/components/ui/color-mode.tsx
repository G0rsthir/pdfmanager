"use client";

import { type PaletteColor } from "@/config/theme";
import { useColorMode } from "@/hooks/theme";
import type { IconButtonProps, SpanProps } from "@chakra-ui/react";
import {
  ClientOnly,
  createListCollection,
  HStack,
  IconButton,
  Portal,
  Select,
  Skeleton,
  Span,
  useSelectContext,
} from "@chakra-ui/react";
import type { ThemeProviderProps } from "next-themes";
import { ThemeProvider } from "next-themes";
import * as React from "react";
import { LuMoon, LuSun } from "react-icons/lu";
import { GenericIconButton } from "./button";

export type ColorModeProviderProps = ThemeProviderProps;

export function ColorModeProvider(props: ColorModeProviderProps) {
  return (
    <ThemeProvider attribute="class" disableTransitionOnChange {...props} />
  );
}

type ColorModeButtonProps = Omit<IconButtonProps, "aria-label">;

export const ColorModeButton = React.forwardRef<
  HTMLButtonElement,
  ColorModeButtonProps
>(function ColorModeButton(props, ref) {
  const { toggleColorMode, colorMode } = useColorMode();
  return (
    <ClientOnly fallback={<Skeleton boxSize="9" />}>
      <GenericIconButton
        onClick={toggleColorMode}
        variant="ghost"
        aria-label="Toggle color mode"
        size="sm"
        ref={ref}
        {...props}
        css={{
          _icon: {
            width: "5",
            height: "5",
          },
        }}
      >
        {colorMode !== "dark" ? <LuMoon /> : <LuSun />}
      </GenericIconButton>
    </ClientOnly>
  );
});

export const LightMode = React.forwardRef<HTMLSpanElement, SpanProps>(
  function LightMode(props, ref) {
    return (
      <Span
        color="fg"
        display="contents"
        className="chakra-theme light"
        colorPalette="gray"
        colorScheme="light"
        ref={ref}
        {...props}
      />
    );
  },
);

export const DarkMode = React.forwardRef<HTMLSpanElement, SpanProps>(
  function DarkMode(props, ref) {
    return (
      <Span
        color="fg"
        display="contents"
        className="chakra-theme dark"
        colorPalette="gray"
        colorScheme="dark"
        ref={ref}
        {...props}
      />
    );
  },
);

const SelectTrigger = () => {
  const select = useSelectContext();
  const items = select.selectedItems as PaletteColor[];

  return (
    <IconButton
      size="md"
      colorPalette={items[0]?.value ?? "blue"}
      {...select.getTriggerProps()}
    ></IconButton>
  );
};

interface ColorPaletteSelectProps {
  onValueChange: (value: string) => void;
  defaultValue: string;
  colors: PaletteColor[];
}

export function ColorPaletteSelect(props: ColorPaletteSelectProps) {
  const { onValueChange, defaultValue, colors: paletteColors } = props;

  const colors = React.useMemo(() => {
    return createListCollection({
      items: paletteColors,
    });
  }, [paletteColors]);

  return (
    <Select.Root
      positioning={{ sameWidth: false, placement: "bottom" }}
      collection={colors}
      size="sm"
      defaultValue={[defaultValue]}
      onValueChange={(e) => onValueChange(e.value[0])}
    >
      <Select.HiddenSelect />
      <Select.Control>
        <SelectTrigger />
      </Select.Control>
      <Portal>
        <Select.Positioner>
          <Select.Content maxHeight="300px" minWidth="150px">
            {colors.items.map((color) => (
              <Select.Item item={color} key={color.value}>
                <HStack>
                  <IconButton size="xs" colorPalette={color.value}></IconButton>
                  {color.label}
                </HStack>
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  );
}
