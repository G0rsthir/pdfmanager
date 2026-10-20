import { formatRelativeTime } from "@/common/format";
import {
  Badge,
  Blockquote,
  Box,
  Button,
  Group,
  Menu,
  Popover,
  Stack,
  Tag,
  Text,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { LuGroup, LuListFilter, LuTrash2 } from "react-icons/lu";
import { GenericIconButton } from "../button";
import { SearchInput } from "../search-input";
import {
  availableFilterValues,
  capitalize,
  countActiveFilters,
  EMPTY_FILTERS,
  filterAnnotations,
  GROUP_BY_OPTIONS,
  groupAnnotations,
  isFiltering,
  NO_LABEL,
  type AnnotationFilters,
  type AnnotationGroup,
  type GroupBy,
} from "./annotation-filters";
import { ANNOTATION_LABELS } from "./annotations";
import { BodyField, LabelField } from "./fields";
import { ViewerPortal, ViewerTooltip } from "./portal";
import { ColorSwatches } from "./swatches";
import type { AnnotationItem, AnnotationsApi, AnnotationType } from "./types";

type FilterValues = ReturnType<typeof availableFilterValues>;

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item != value)
    : [...list, value];
}

export function AnnotationList(props: {
  items: AnnotationsApi["items"];
  currentPage: number;
  readOnly?: boolean;
  labels?: AnnotationsApi["labels"];
  onJump: (item: AnnotationItem) => void;
  onDelete: AnnotationsApi["delete"];
  onUpdate: AnnotationsApi["update"];
}) {
  const { items, currentPage, readOnly, labels, onJump, onDelete, onUpdate } =
    props;

  const [filters, setFilters] = useState<AnnotationFilters>(EMPTY_FILTERS);
  const [groupBy, setGroupBy] = useState<GroupBy>("page");

  const visible = useMemo(
    () => filterAnnotations(items, filters, currentPage),
    [items, filters, currentPage],
  );
  const groups = useMemo(
    () => groupAnnotations(visible, groupBy),
    [visible, groupBy],
  );
  const available = useMemo(() => availableFilterValues(items), [items]);

  if (items.length == 0) {
    return (
      <Text textStyle="sm" color="fg.muted" p={3}>
        Select text to highlight or comment on it
      </Text>
    );
  }

  return (
    <Stack gap={0} h="full">
      <Stack gap={2} p={3} pb={2}>
        <Group gap={1}>
          <SearchInput
            placeholder="Search annotations"
            value={filters.query}
            onChange={(query) => setFilters((f) => ({ ...f, query }))}
          />
          <FilterMenu
            filters={filters}
            available={available}
            onChange={setFilters}
          />
          <GroupByMenu value={groupBy} onChange={setGroupBy} />
        </Group>

        {isFiltering(filters) && (
          <ActiveFilters
            filters={filters}
            shown={visible.length}
            total={items.length}
            onChange={setFilters}
          />
        )}
      </Stack>

      <Box flex="1" minH={0} overflowY="auto" px={3} pb={3}>
        {visible.length == 0 ? (
          <Stack gap={2} align="start" pt={1}>
            <Text textStyle="sm" color="fg.muted">
              No annotations match
            </Text>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setFilters(EMPTY_FILTERS)}
            >
              Clear filters
            </Button>
          </Stack>
        ) : (
          groups.map((group) => (
            <Box key={group.key}>
              {group.title && <GroupHeader group={group} />}
              <Stack gap={2} pb={2}>
                {group.items.map((annotation) => (
                  <AnnotationCard
                    key={annotation.id}
                    annotation={annotation}
                    showPage={groupBy != "page"}
                    readOnly={readOnly}
                    labels={labels}
                    onJump={onJump}
                    onDelete={onDelete}
                    onUpdate={onUpdate}
                  />
                ))}
              </Stack>
            </Box>
          ))
        )}
      </Box>
    </Stack>
  );
}

function GroupHeader(props: { group: AnnotationGroup }) {
  const { group } = props;

  return (
    <Group bg="bg.subtle" py={1.5} gap={2} align="center">
      {group.color && (
        <Box boxSize="2.5" rounded="full" bg={`${group.color}.solid`} />
      )}
      <Text textStyle="xs" fontWeight="semibold" color="fg.muted">
        {group.title}
      </Text>
      <Badge size="xs" variant="subtle" colorPalette="gray">
        {group.items.length}
      </Badge>
    </Group>
  );
}

function FilterMenu(props: {
  filters: AnnotationFilters;
  available: FilterValues;
  onChange: (next: AnnotationFilters) => void;
}) {
  const { filters, available, onChange } = props;

  const count = countActiveFilters(filters);
  const hasLabels = available.labels.some((label) => label != NO_LABEL);

  return (
    <Menu.Root closeOnSelect={false}>
      <ViewerTooltip content="Filter" openDelay={400}>
        <Box display="inline-flex">
          <Menu.Trigger asChild>
            <GenericIconButton
              size="xs"
              variant={count ? "subtle" : "ghost"}
              colorPalette={count ? "green" : "gray"}
            >
              <LuListFilter />
            </GenericIconButton>
          </Menu.Trigger>
        </Box>
      </ViewerTooltip>
      <ViewerPortal>
        <Menu.Positioner>
          <Menu.Content minW="48" maxH="80" overflowY="auto">
            <Menu.CheckboxItem
              value="scope"
              checked={filters.scope == "page"}
              onCheckedChange={(checked) =>
                onChange({ ...filters, scope: checked ? "page" : "all" })
              }
            >
              Current page only
              <Menu.ItemIndicator />
            </Menu.CheckboxItem>

            {available.types.length > 1 && (
              <FilterSection title="Type">
                {available.types.map((type) => (
                  <Menu.CheckboxItem
                    key={type}
                    value={`type:${type}`}
                    checked={filters.types.includes(type)}
                    onCheckedChange={() =>
                      onChange({
                        ...filters,
                        types: toggle(filters.types, type),
                      })
                    }
                  >
                    {ANNOTATION_LABELS[type]}
                    <Menu.ItemIndicator />
                  </Menu.CheckboxItem>
                ))}
              </FilterSection>
            )}

            {available.colors.length > 1 && (
              <FilterSection title="Color">
                {available.colors.map((color) => (
                  <Menu.CheckboxItem
                    key={color}
                    value={`color:${color}`}
                    checked={filters.colors.includes(color)}
                    onCheckedChange={() =>
                      onChange({
                        ...filters,
                        colors: toggle(filters.colors, color),
                      })
                    }
                  >
                    <Box boxSize="2.5" rounded="full" bg={`${color}.solid`} />
                    {capitalize(color)}
                    <Menu.ItemIndicator />
                  </Menu.CheckboxItem>
                ))}
              </FilterSection>
            )}

            {hasLabels && (
              <FilterSection title="Label">
                {available.labels.map((label) => (
                  <Menu.CheckboxItem
                    key={label || "none"}
                    value={`label:${label}`}
                    checked={filters.labels.includes(label)}
                    onCheckedChange={() =>
                      onChange({
                        ...filters,
                        labels: toggle(filters.labels, label),
                      })
                    }
                  >
                    <Text
                      as="span"
                      fontFamily={label ? "mono" : undefined}
                      color={label ? undefined : "fg.muted"}
                    >
                      {label || "No label"}
                    </Text>
                    <Menu.ItemIndicator />
                  </Menu.CheckboxItem>
                ))}
              </FilterSection>
            )}
          </Menu.Content>
        </Menu.Positioner>
      </ViewerPortal>
    </Menu.Root>
  );
}

function FilterSection(props: { title: string; children: React.ReactNode }) {
  const { title, children } = props;

  return (
    <>
      <Menu.Separator />
      <Menu.ItemGroup>
        <Menu.ItemGroupLabel>{title}</Menu.ItemGroupLabel>
        {children}
      </Menu.ItemGroup>
    </>
  );
}

function GroupByMenu(props: {
  value: GroupBy;
  onChange: (value: GroupBy) => void;
}) {
  const { value, onChange } = props;

  return (
    <Menu.Root>
      <ViewerTooltip content="Group by" openDelay={400}>
        <Box display="inline-flex">
          <Menu.Trigger asChild>
            <GenericIconButton size="xs" variant="ghost">
              <LuGroup />
            </GenericIconButton>
          </Menu.Trigger>
        </Box>
      </ViewerTooltip>
      <ViewerPortal>
        <Menu.Positioner>
          <Menu.Content minW="40">
            <Menu.ItemGroup>
              <Menu.ItemGroupLabel>Group by</Menu.ItemGroupLabel>
              <Menu.RadioItemGroup
                value={value}
                onValueChange={(e) => onChange(e.value as GroupBy)}
              >
                {GROUP_BY_OPTIONS.map((option) => (
                  <Menu.RadioItem key={option.value} value={option.value}>
                    {option.label}
                    <Menu.ItemIndicator />
                  </Menu.RadioItem>
                ))}
              </Menu.RadioItemGroup>
            </Menu.ItemGroup>
          </Menu.Content>
        </Menu.Positioner>
      </ViewerPortal>
    </Menu.Root>
  );
}

function ActiveFilters(props: {
  filters: AnnotationFilters;
  shown: number;
  total: number;
  onChange: (next: AnnotationFilters) => void;
}) {
  const { filters, shown, total, onChange } = props;

  const chips: { key: string; label: React.ReactNode; remove: () => void }[] =
    [];

  if (filters.scope == "page") {
    chips.push({
      key: "scope",
      label: "Current page",
      remove: () => onChange({ ...filters, scope: "all" }),
    });
  }
  for (const type of filters.types) {
    chips.push({
      key: `type:${type}`,
      label: ANNOTATION_LABELS[type as AnnotationType],
      remove: () =>
        onChange({ ...filters, types: toggle(filters.types, type) }),
    });
  }
  for (const color of filters.colors) {
    chips.push({
      key: `color:${color}`,
      label: capitalize(color),
      remove: () =>
        onChange({ ...filters, colors: toggle(filters.colors, color) }),
    });
  }
  for (const label of filters.labels) {
    chips.push({
      key: `label:${label}`,
      label: label || "No label",
      remove: () =>
        onChange({ ...filters, labels: toggle(filters.labels, label) }),
    });
  }

  return (
    <Group gap={1} wrap="wrap" align="center">
      {chips.map((chip) => (
        <Tag.Root key={chip.key} size="sm" variant="subtle">
          <Tag.Label>{chip.label}</Tag.Label>
          <Tag.EndElement>
            <Tag.CloseTrigger onClick={chip.remove} />
          </Tag.EndElement>
        </Tag.Root>
      ))}
      <Text textStyle="xs" color="fg.muted" ms="auto">
        {shown} of {total}
      </Text>
      <Button
        size="2xs"
        variant="plain"
        colorPalette="gray"
        onClick={() => onChange(EMPTY_FILTERS)}
      >
        Clear
      </Button>
    </Group>
  );
}

function AnnotationCard(props: {
  annotation: AnnotationItem;
  showPage: boolean;
  readOnly?: boolean;
  labels?: string[];
  onJump: (item: AnnotationItem) => void;
  onDelete: AnnotationsApi["delete"];
  onUpdate: AnnotationsApi["update"];
}) {
  const { annotation, showPage, readOnly, labels, onJump, onDelete, onUpdate } =
    props;

  const meta = [
    showPage && `p. ${annotation.page}`,
    annotation.author_name,
    formatRelativeTime(annotation.created_at),
  ].filter(Boolean);

  return (
    <Group
      align="stretch"
      gap={0}
      rounded="md"
      overflow="hidden"
      borderWidth="1px"
      borderColor="border.muted"
      bg="bg"
    >
      <ColorSwatchMenu
        color={annotation.color}
        disabled={readOnly}
        onChange={(color) => onUpdate(annotation.id, { color })}
      />
      <Stack gap={1} p={3} flex={1} minW={0}>
        <Group justify="space-between" align="start">
          <LabelField
            value={annotation.label ?? ""}
            onChange={(v) => onUpdate(annotation.id, { label: v || null })}
            disabled={readOnly}
            suggestions={labels}
          />
          {!readOnly && (
            <GenericIconButton
              size="2xs"
              variant="ghost"
              colorPalette="red"
              onClick={() => onDelete(annotation.id)}
            >
              <LuTrash2 />
            </GenericIconButton>
          )}
        </Group>
        <Blockquote.Root
          cursor="pointer"
          onClick={() => onJump(annotation)}
          color="fg.muted"
          variant="plain"
          _hover={{ color: "fg" }}
        >
          <Blockquote.Content>
            <Text textStyle="xs" lineClamp={2}>
              {annotation.excerpt ||
                ANNOTATION_LABELS[annotation.geometry.type]}
            </Text>
          </Blockquote.Content>
        </Blockquote.Root>
        <BodyField
          value={annotation.body}
          onChange={(v) => onUpdate(annotation.id, { body: v })}
          disabled={readOnly}
          required={annotation.geometry.type == "note"}
        />
        <Text textStyle="xs" color="fg.muted" textAlign="end">
          {meta.join(" | ")}
        </Text>
      </Stack>
    </Group>
  );
}

function ColorSwatchMenu(props: {
  color: string;
  disabled?: boolean;
  onChange: (color: string) => void;
}) {
  const { color, disabled, onChange } = props;
  const [open, setOpen] = useState(false);

  const strip = (
    <Box
      as={disabled ? "div" : "button"}
      w="3px"
      flexShrink={0}
      bg={`${color}.solid`}
      cursor={disabled ? undefined : "pointer"}
      _hover={disabled ? undefined : { w: "7px" }}
      transition="width 0.15s"
    />
  );

  if (disabled) return strip;

  return (
    <Popover.Root
      open={open}
      onOpenChange={(e) => setOpen(e.open)}
      positioning={{ placement: "bottom-start" }}
    >
      <Popover.Trigger asChild>{strip}</Popover.Trigger>
      <ViewerPortal>
        <Popover.Positioner>
          <Popover.Content w="auto" p={2}>
            <ColorSwatches
              label="Color"
              current={color}
              onPick={(next) => {
                onChange(next);
                setOpen(false);
              }}
              px="0.5"
            />
          </Popover.Content>
        </Popover.Positioner>
      </ViewerPortal>
    </Popover.Root>
  );
}
