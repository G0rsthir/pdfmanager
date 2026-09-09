import {
  Button,
  DatePicker,
  Flex,
  HStack,
  Portal,
  Spacer,
  VStack,
  type DatePickerRootProps,
  type DateValue,
} from "@chakra-ui/react";
import { LuCalendar } from "react-icons/lu";

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
