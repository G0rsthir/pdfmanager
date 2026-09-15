import {
  Badge,
  Box,
  Clipboard,
  Code,
  EmptyState,
  Grid,
  GridItem,
  Group,
  Input,
  InputGroup,
  Span,
  Stack,
  Text,
  VStack,
  type BoxProps,
  type TextProps,
} from "@chakra-ui/react";
import { LuFingerprint } from "react-icons/lu";
import { GenericIconButton } from "./button";
import { Tooltip } from "./tooltip";

export function Block(props: BoxProps & React.RefAttributes<HTMLDivElement>) {
  const { ref, children, ...other } = props;

  return (
    <Box ref={ref} p="6" {...other}>
      {children}
    </Box>
  );
}

export interface SettingsOptionProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  required?: boolean;
  labelSpan?: number;
  fieldSpan?: number;
  fontWeight?: "bold" | "normal";
  children: React.ReactNode;
}

export function SettingsOption(props: SettingsOptionProps) {
  const {
    title,
    description,
    required,
    children,
    fontWeight = "bold",
    labelSpan = 6,
    fieldSpan = 6,
  } = props;

  return (
    <Grid templateColumns="repeat(12, 1fr)">
      <GridItem colSpan={labelSpan}>
        <Stack gap={0}>
          <Text fontWeight={fontWeight}>
            {title}{" "}
            {required && (
              <Span color="fg.error" aria-hidden>
                *
              </Span>
            )}
          </Text>
          <Text color="fg.muted" fontSize="sm">
            {description}
          </Text>
        </Stack>
      </GridItem>
      <GridItem colSpan={fieldSpan}>{children}</GridItem>
    </Grid>
  );
}

export function SectionLabel(
  props: TextProps & React.RefAttributes<HTMLParagraphElement>,
) {
  const { children, ...other } = props;

  return (
    <Text
      {...other}
      fontSize="sm"
      fontWeight="medium"
      color="fg.muted"
      letterSpacing="wider"
      textTransform="uppercase"
    >
      {children}
    </Text>
  );
}

export function Section(props: {
  title: string;
  children: React.ReactNode;
  gap?: number;
}) {
  const { title, children, gap = 4 } = props;

  return (
    <Stack gap={gap}>
      <SectionLabel>{title}</SectionLabel>
      {children}
    </Stack>
  );
}

export function CopyableValue(props: {
  value: string;
  label: string;
  children?: React.ReactNode;
}) {
  const { value, label, children } = props;

  return (
    <Clipboard.Root value={value}>
      <Group>
        {children}
        <Clipboard.Trigger asChild>
          <GenericIconButton
            size="2xs"
            variant="surface"
            title={`Copy ${label}`}
          >
            <Clipboard.Indicator />
          </GenericIconButton>
        </Clipboard.Trigger>
      </Group>
    </Clipboard.Root>
  );
}

export function CopyableInput(props: { value: string }) {
  const { value } = props;

  return (
    <Clipboard.Root value={value} w="full">
      <InputGroup
        endElement={
          <Clipboard.Trigger asChild>
            <GenericIconButton size="xs" variant="ghost" me="-2">
              <Clipboard.Indicator />
            </GenericIconButton>
          </Clipboard.Trigger>
        }
      >
        <Clipboard.Input asChild>
          <Input readOnly fontSize="sm" variant="subtle" />
        </Clipboard.Input>
      </InputGroup>
    </Clipboard.Root>
  );
}

export function Empty(props: {
  title: React.ReactNode;
  icon: React.ReactNode;
}) {
  const { title, icon } = props;

  return (
    <EmptyState.Root bg="bg.subtle">
      <EmptyState.Content>
        <EmptyState.Indicator>{icon}</EmptyState.Indicator>
        <VStack textAlign="center">
          <EmptyState.Title fontWeight="normal">{title}</EmptyState.Title>
        </VStack>
      </EmptyState.Content>
    </EmptyState.Root>
  );
}

export function Checksum(props: {
  value: string;
  label?: string;
  type?: string;
}) {
  const { value, label, type = "SHA-256" } = props;

  const displayName = label ? label : value;

  return (
    <CopyableValue value={value} label="checksum">
      <Tooltip
        content={
          <Stack gap="0.5">
            <Text fontWeight="medium">{type} checksum</Text>
            <Text fontFamily="mono">{value}</Text>
          </Stack>
        }
      >
        <Group attached>
          <Badge size="sm" variant="subtle" colorPalette="gray" gap="1">
            <LuFingerprint />
            {type}
          </Badge>
          <Code size="sm" variant="outline" colorPalette="gray">
            {displayName}
          </Code>
        </Group>
      </Tooltip>
    </CopyableValue>
  );
}
