import { listCollectionsOptions } from "@/api/@tanstack/react-query.gen";
import type { CollectionResponse } from "@/api/types.gen";
import { useAPIQuery } from "@/hooks/query";
import {
  Combobox,
  Portal,
  useCombobox,
  useFilter,
  useListCollection,
} from "@chakra-ui/react";
import { useEffect, useRef } from "react";

interface CollectionSelectOptional {
  onValueChange: (values?: string) => void;
  defaultValue?: string;
  onBlur: () => void;
  required?: boolean;
  allowedCollectionIds?: string[];
  disabled?: boolean;
  type?: CollectionResponse["entity_type"];
}

interface CollectionSelectRequired {
  onValueChange: (values: string) => void;
  defaultValue?: string;
  onBlur: () => void;
  required: true;
  allowedCollectionIds?: string[];
  disabled?: boolean;
  type?: CollectionResponse["entity_type"];
}

type CollectionSelectProps =
  | CollectionSelectRequired
  | CollectionSelectOptional;

export function CollectionSelect(props: CollectionSelectProps) {
  const {
    onValueChange,
    defaultValue,
    required,
    disabled,
    allowedCollectionIds = [],
    onBlur,
    type: collectionType,
  } = props;

  const hydrated = useRef(false);

  const { contains } = useFilter({ sensitivity: "base" });

  const { collection, filter, set } = useListCollection<{
    label: string;
    value: string;
  }>({
    initialItems: [],
    filter: contains,
  });

  const combobox = useCombobox({
    collection,
    onInputValueChange: (e) =>
      filter(
        e.reason == "item-select" || e.reason == undefined ? "" : e.inputValue,
      ),
    onValueChange: ({ value }) => onValueChange(value[0] || ""),
    openOnClick: true,
    defaultValue: defaultValue ? [defaultValue] : [],
    onInteractOutside: () => onBlur(),
    // Works with Field.Root
    ...(required !== undefined && { required }),
    ...(disabled !== undefined && { disabled }),
  });

  const query = useAPIQuery({
    ...listCollectionsOptions(),
  });

  useEffect(() => {
    if (query.isSuccess) {
      set(
        query.data
          .filter((item) =>
            collectionType == undefined
              ? true
              : item.entity_type == collectionType,
          )
          .map((item) => ({
            label: item.name,
            value: item.id,
            disabled: !allowedCollectionIds.includes(item.id),
          })),
      );
    }
  }, [query.data, query.isSuccess, set, allowedCollectionIds, collectionType]);

  useEffect(() => {
    if (combobox.value.length && collection.size && !hydrated.current) {
      combobox.syncSelectedItems();
      hydrated.current = true;
    }
  }, [combobox, collection.size]);

  return (
    <Combobox.RootProvider value={combobox}>
      <Combobox.Control>
        <Combobox.Input placeholder="Type to search" />
        <Combobox.IndicatorGroup>
          <Combobox.Trigger />
        </Combobox.IndicatorGroup>
      </Combobox.Control>
      <Portal>
        <Combobox.Positioner>
          <Combobox.Content maxH="300px" overflowY="auto">
            <Combobox.Empty>No items found</Combobox.Empty>
            {collection.items.map((item) => (
              <Combobox.Item item={item} key={item.value}>
                {item.label}
                <Combobox.ItemIndicator />
              </Combobox.Item>
            ))}
          </Combobox.Content>
        </Combobox.Positioner>
      </Portal>
    </Combobox.RootProvider>
  );
}
