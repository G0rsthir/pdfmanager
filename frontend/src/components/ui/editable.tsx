import {
  Combobox,
  Portal,
  useEditableContext,
  useFilter,
  useListCollection,
  type ComboboxRootProps,
} from "@chakra-ui/react";
import { useEffect } from "react";

interface ComboboxFieldProps extends Omit<ComboboxRootProps, "collection"> {
  suggestions: string[];
}

export function EditableCombobox(props: ComboboxFieldProps) {
  const { suggestions, ...rest } = props;

  const { contains } = useFilter({ sensitivity: "base" });

  const { collection, filter, set } = useListCollection({
    initialItems: suggestions,
    filter: contains,
  });

  useEffect(() => {
    set(suggestions);
  }, [suggestions, set]);

  const context = useEditableContext();

  const handleInputValueChange = (e: { inputValue: string }) => {
    filter(e.inputValue);
    context.setValue(e.inputValue ?? "");
  };

  const handleValueChange = (e: { value: string[] }) => {
    const picked = e.value[0];
    context.setValue(picked ?? "");
    context.submit();
  };

  if (!context.editing) return null;

  return (
    <Combobox.Root
      collection={collection}
      hidden={!context.editing}
      defaultInputValue={context.value}
      defaultValue={context.value ? [context.value] : []}
      onInputValueChange={handleInputValueChange}
      onValueChange={handleValueChange}
      allowCustomValue
      openOnClick
      autoFocus
      {...rest}
    >
      <Combobox.Control>
        <Combobox.Input
          onBlur={() => context.submit()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              context.submit();
            }
          }}
        />
        <Combobox.IndicatorGroup>
          <Combobox.ClearTrigger />
          <Combobox.Trigger />
        </Combobox.IndicatorGroup>
      </Combobox.Control>
      <Portal>
        <Combobox.Positioner>
          <Combobox.Content>
            {collection.items.map((item) => (
              <Combobox.Item key={item} item={item}>
                <Combobox.ItemText flex="0">{item}</Combobox.ItemText>
                <Combobox.ItemIndicator />
              </Combobox.Item>
            ))}
          </Combobox.Content>
        </Combobox.Positioner>
      </Portal>
    </Combobox.Root>
  );
}
