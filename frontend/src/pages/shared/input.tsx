import {
  Combobox,
  Span,
  TagsInput,
  useCombobox,
  useFilter,
  useListCollection,
  useTagsInput,
} from "@chakra-ui/react";
import { useEffect, useId, useRef } from "react";

export interface TokensInputProps {
  onValueChange: (values: string[]) => void;
  defaultValue: string[];
  onBlur: () => void;
  placeholder?: string;
  suggestions?: string[];
  description?: string;
}

export function TokensInput(props: TokensInputProps) {
  const { contains } = useFilter({ sensitivity: "base" });

  const { collection, filter, set } = useListCollection<string>({
    initialItems: [],
    filter: contains,
  });

  useEffect(() => {
    set(props.suggestions ?? []);
  }, [props.suggestions, set]);

  const uid = useId();
  const controlRef = useRef<HTMLDivElement | null>(null);

  const tags = useTagsInput({
    ids: { input: `input_${uid}`, control: `control_${uid}` },
    defaultValue: props.defaultValue,
    onValueChange(details) {
      props.onValueChange(details.value);
    },
  });

  const comobobox = useCombobox({
    ids: { input: `input_${uid}`, control: `control_${uid}` },
    collection,
    onInputValueChange(e) {
      filter(e.inputValue);
    },
    value: [],
    allowCustomValue: true,
    onValueChange: (e) => tags.addValue(e.value[0]),
    selectionBehavior: "clear",
    openOnClick: true,
  });

  return (
    <Combobox.RootProvider value={comobobox}>
      <TagsInput.RootProvider value={tags}>
        <TagsInput.Control ref={controlRef} bg="bg.subtle">
          {tags.value.map((tag, index) => (
            <TagsInput.Item key={index} index={index} value={tag}>
              <TagsInput.ItemPreview>
                <TagsInput.ItemText>{tag}</TagsInput.ItemText>
                <TagsInput.ItemDeleteTrigger />
              </TagsInput.ItemPreview>
            </TagsInput.Item>
          ))}

          <Combobox.Input unstyled asChild>
            <TagsInput.Input
              placeholder={props.placeholder}
              onBlur={props.onBlur}
            />
          </Combobox.Input>
        </TagsInput.Control>
        {props.description && (
          <Span textStyle="xs" color="fg.muted" ms="auto">
            {props.description}
          </Span>
        )}
        <Combobox.Positioner>
          <Combobox.Content maxH="300px" overflowY="auto">
            {collection.items
              .filter((item) => !tags.value.includes(item))
              .map((item) => (
                <Combobox.Item item={item} key={item}>
                  <Combobox.ItemText>{item}</Combobox.ItemText>
                  <Combobox.ItemIndicator />
                </Combobox.Item>
              ))}
          </Combobox.Content>
        </Combobox.Positioner>
      </TagsInput.RootProvider>
    </Combobox.RootProvider>
  );
}
