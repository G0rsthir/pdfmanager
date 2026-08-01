"use client";

import { type PaletteColor } from "@/config/theme";
import { useColorMode } from "@/hooks/theme";
import type { IconButtonProps, SpanProps } from "@chakra-ui/react";
import {
  Center,
  ClientOnly,
  createListCollection,
  Group,
  HStack,
  IconButton,
  Portal,
  RadioGroup,
  SegmentGroup,
  Select,
  Skeleton,
  Span,
  useSelectContext,
} from "@chakra-ui/react";
import type { ThemeProviderProps } from "next-themes";
import { ThemeProvider, useTheme } from "next-themes";
import * as React from "react";
import { LuCheck, LuMonitor, LuMoon, LuSun } from "react-icons/lu";
import { GenericIconButton } from "./button";

export type ColorModeProviderProps = ThemeProviderProps;

export function ColorModeProvider(props: ColorModeProviderProps) {
  return (
    <ThemeProvider attribute="class" disableTransitionOnChange {...props} />
  );
}

type ColorModeButtonProps = Omit<IconButtonProps, "aria-label">;

export const ColorModeButton = function ColorModeButton({
  ref,
  ...props
}: ColorModeButtonProps & { ref?: React.RefObject<HTMLButtonElement | null> }) {
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
};

const COLOR_MODE_OPTIONS = [
  { value: "system", label: "System", icon: <LuMonitor /> },
  { value: "light", label: "Light", icon: <LuSun /> },
  { value: "dark", label: "Dark", icon: <LuMoon /> },
];

export function ColorModeSegment() {
  const { theme, setTheme } = useTheme();

  return (
    <ClientOnly fallback={<Skeleton height="8" width="60" />}>
      <SegmentGroup.Root
        size="sm"
        value={theme ?? "system"}
        onValueChange={({ value }) => value && setTheme(value)}
      >
        <SegmentGroup.Indicator />
        {COLOR_MODE_OPTIONS.map((option) => (
          <SegmentGroup.Item key={option.value} value={option.value}>
            <SegmentGroup.ItemText display="flex" alignItems="center" gap={2}>
              {option.icon}
              {option.label}
            </SegmentGroup.ItemText>
            <SegmentGroup.ItemHiddenInput />
          </SegmentGroup.Item>
        ))}
      </SegmentGroup.Root>
    </ClientOnly>
  );
}

export const LightMode = function LightMode({
  ref,
  ...props
}: SpanProps & { ref?: React.RefObject<HTMLSpanElement | null> }) {
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
};

export const DarkMode = function DarkMode({
  ref,
  ...props
}: SpanProps & { ref?: React.RefObject<HTMLSpanElement | null> }) {
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
};

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

type ColorPaletteSelectListProps = ColorPaletteSelectProps;

export function ColorPaletteSelectList(props: ColorPaletteSelectListProps) {
  const { onValueChange, defaultValue, colors: paletteColors } = props;

  return (
    <RadioGroup.Root
      defaultValue={defaultValue}
      onValueChange={(e) => e.value && onValueChange(e.value)}
    >
      <Group wrap="wrap" gap={2}>
        {paletteColors.map((color) => (
          <RadioGroup.Item
            key={color.value}
            value={color.value}
            colorPalette={color.value}
            aria-label={color.label}
            title={color.label}
            cursor="pointer"
          >
            <RadioGroup.ItemHiddenInput />
            <RadioGroup.ItemContext>
              {({ checked }) => (
                <Center
                  boxSize="6"
                  rounded="full"
                  bg="colorPalette.solid"
                  color="colorPalette.contrast"
                  outline="2px solid"
                  outlineOffset="2px"
                  outlineColor={checked ? "colorPalette.solid" : "transparent"}
                  transition="outline-color 0.15s"
                  _hover={{ outlineColor: "colorPalette.muted" }}
                >
                  {checked && <LuCheck size={14} />}
                </Center>
              )}
            </RadioGroup.ItemContext>
          </RadioGroup.Item>
        ))}
      </Group>
    </RadioGroup.Root>
  );
}
