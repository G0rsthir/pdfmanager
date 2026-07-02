import { listUsersOptions } from "@/api/@tanstack/react-query.gen";
import { AccessScopeEnum } from "@/config/const";
import { useAPIQuery } from "@/hooks/query";
import {
  Button,
  createListCollection,
  DatePicker,
  Flex,
  HStack,
  Portal,
  Select,
  Spacer,
  VStack,
  type DatePickerRootProps,
  type DateValue,
} from "@chakra-ui/react";
import { useMemo } from "react";
import { LuCalendar } from "react-icons/lu";

export interface UserSelectProps {
  onValueChange: (value: string) => void;
  value: string;
  onBlur: () => void;
  required?: boolean;
}

export function UserSelect(props: UserSelectProps) {
  const { onValueChange, value, required, onBlur } = props;

  const queryUsers = useAPIQuery({
    ...listUsersOptions(),
  });

  const collection = useMemo(() => {
    return createListCollection({
      items: queryUsers.data ?? [],
      itemToString: (user) => `${user.name} (${user.email})`,
      itemToValue: (user) => user.id,
    });
  }, [queryUsers.data]);

  return (
    <Select.Root
      collection={collection}
      onValueChange={(e) => onValueChange(e.value?.[0])}
      required={required}
      onInteractOutside={onBlur}
      value={value ? [value] : []}
    >
      <Select.HiddenSelect />
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder="Select user" />
        </Select.Trigger>
        <Select.IndicatorGroup>
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      <Portal>
        <Select.Positioner>
          <Select.Content maxH="300px" overflowY="auto">
            {collection.items.map((user) => (
              <Select.Item item={user} key={user.id}>
                {`${user.name} (${user.email})`}
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  );
}

export interface ExpiryDateSelectProps extends DatePickerRootProps {
  presets?: {
    label: string;
    value: DateValue[];
  }[];
}

export function ExpiryDateSelect(props: ExpiryDateSelectProps) {
  const { presets, ...rest } = props;

  return (
    <DatePicker.Root {...rest}>
      <DatePicker.Control>
        <DatePicker.Input />
        <DatePicker.IndicatorGroup>
          <DatePicker.Trigger>
            <LuCalendar />
          </DatePicker.Trigger>
        </DatePicker.IndicatorGroup>
      </DatePicker.Control>
      <Portal>
        <DatePicker.Positioner>
          <DatePicker.Content maxW="100dvw" w="fit-content" overflow="auto">
            <Flex
              px={{ base: "3", sm: "4" }}
              py={{ base: "3", sm: "4" }}
              gap={{ base: "3", sm: "6" }}
              flexDirection={{ base: "column", sm: "row" }}
            >
              {presets && presets.length > 0 && (
                <VStack
                  align="stretch"
                  gap={{ base: "1.5", sm: "2" }}
                  minW={{ base: "full", sm: "140px" }}
                  height="100%"
                >
                  {presets.map((preset, idx) => (
                    <DatePicker.PresetTrigger
                      value={preset.value}
                      asChild
                      key={idx}
                    >
                      <Button
                        variant="surface"
                        colorPalette="gray"
                        size="sm"
                        width="100%"
                      >
                        {preset.label}
                      </Button>
                    </DatePicker.PresetTrigger>
                  ))}
                </VStack>
              )}
              <Flex direction="column" flex="1" minW={0}>
                <DatePicker.View view="day">
                  <HStack>
                    <DatePicker.RangeText ps="4" />
                    <Spacer />
                    <DatePicker.PrevTrigger />
                    <DatePicker.NextTrigger />
                  </HStack>
                  <DatePicker.DayTable />
                </DatePicker.View>
              </Flex>
            </Flex>
          </DatePicker.Content>
        </DatePicker.Positioner>
      </Portal>
    </DatePicker.Root>
  );
}

export interface ScopeSelectProps {
  onValueChange: (value: string[]) => void;
  value: string[];
  onBlur: () => void;
  required?: boolean;
  excludedScopes?: string[];
}

export function ScopeSelect(props: ScopeSelectProps) {
  const { onValueChange, value, required, onBlur, excludedScopes = [] } = props;

  const collection = useMemo(() => {
    return createListCollection({
      items: Object.values(AccessScopeEnum).filter(
        (item) => !excludedScopes.includes(item),
      ),
    });
  }, [excludedScopes]);

  return (
    <Select.Root
      collection={collection}
      onValueChange={(e) => onValueChange(e.value)}
      required={required}
      onInteractOutside={onBlur}
      value={value}
      multiple
    >
      <Select.HiddenSelect />
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder="Select scopes" />
        </Select.Trigger>
        <Select.IndicatorGroup>
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      <Portal>
        <Select.Positioner>
          <Select.Content maxH="300px" overflowY="auto">
            {collection.items.map((scope) => (
              <Select.Item item={scope} key={scope}>
                {scope}
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  );
}

export function DateSelect(props: DatePickerRootProps) {
  return (
    <DatePicker.Root {...props}>
      <DatePicker.Control>
        <DatePicker.Input />
        <DatePicker.IndicatorGroup>
          <DatePicker.Trigger>
            <LuCalendar />
          </DatePicker.Trigger>
        </DatePicker.IndicatorGroup>
      </DatePicker.Control>
      <Portal>
        <DatePicker.Positioner>
          <DatePicker.Content maxW="100dvw">
            <DatePicker.View view="day">
              <HStack>
                <DatePicker.RangeText ps="4" />
                <Spacer />
                <DatePicker.PrevTrigger />
                <DatePicker.NextTrigger />
              </HStack>
              <DatePicker.DayTable />
            </DatePicker.View>
          </DatePicker.Content>
        </DatePicker.Positioner>
      </Portal>
    </DatePicker.Root>
  );
}
