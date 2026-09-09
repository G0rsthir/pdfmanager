import {
  Box,
  Clipboard,
  EmptyState,
  Grid,
  GridItem,
  Group,
  Span,
  Stack,
  Text,
  VStack,
  type BoxProps,
} from "@chakra-ui/react";
import { GenericIconButton } from "./button";

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

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
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
