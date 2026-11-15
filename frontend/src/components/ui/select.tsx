import {
  createListCollection,
  HStack,
  Portal,
  Select,
  Stack,
  Text,
  type SelectRootProps,
} from "@chakra-ui/react";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  description?: React.ReactNode;
}

type SelectProps<T extends string> = Omit<
  SelectRootProps<SelectOption<T>>,
  | "collection"
  | "value"
  | "defaultValue"
  | "onValueChange"
  | "multiple"
  | "onBlur"
  | "children"
> & {
  items: SelectOption<T>[];
  placeholder?: string;
  label?: React.ReactNode;
  onBlur?: () => void;
  portalled?: boolean;
};

function SelectRoot<T extends string>(
  props: SelectProps<T> & {
    value: T[];
    onValueChange: (value: T[]) => void;
    multiple?: boolean;
    clearable?: boolean;
  },
) {
  const {
    items,
    value,
    onValueChange,
    placeholder,
    label,
    onBlur,
    portalled = true,
    clearable,
    ...rest
  } = props;

  const collection = createListCollection({ items });

  const positioner = (
    <Select.Positioner>
      <Select.Content maxH="300px">
        {collection.items.map((item) => (
          <Select.Item item={item} key={item.value}>
            <OptionLabel option={item} />
            <Select.ItemIndicator />
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Positioner>
  );

  return (
    <Select.Root
      {...rest}
      collection={collection}
      value={value}
      onValueChange={(e) => onValueChange(e.value as T[])}
      onInteractOutside={onBlur}
    >
      <Select.HiddenSelect />
      {label && <Select.Label>{label}</Select.Label>}
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder={placeholder} />
        </Select.Trigger>
        <Select.IndicatorGroup>
          {clearable && <Select.ClearTrigger />}
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      {portalled ? <Portal>{positioner}</Portal> : positioner}
    </Select.Root>
  );
}

function OptionLabel(props: { option: SelectOption }) {
  const { option } = props;

  const text = option.description ? (
    <Stack gap={0}>
      <Text>{option.label}</Text>
      <Text color="fg.muted" fontSize="xs">
        {option.description}
      </Text>
    </Stack>
  ) : (
    option.label
  );

  if (!option.icon) return text;

  return (
    <HStack gap={2}>
      {option.icon}
      {text}
    </HStack>
  );
}

export type OptionSelectProps<T extends string> = SelectProps<T> & {
  value: T | "";
  onValueChange: (value: T) => void;
  onClear?: () => void;
};

export function OptionSelect<T extends string>(props: OptionSelectProps<T>) {
  const { value, onValueChange, onClear, ...rest } = props;

  return (
    <SelectRoot
      {...rest}
      value={value ? [value] : []}
      onValueChange={(values) => {
        const next = values[0];
        if (next) onValueChange(next);
        else onClear?.();
      }}
      clearable={!!onClear}
    />
  );
}

export function MultiOptionSelect<T extends string>(
  props: SelectProps<T> & {
    value: T[];
    onValueChange: (value: T[]) => void;
    clearable?: boolean;
  },
) {
  return <SelectRoot {...props} multiple />;
}
