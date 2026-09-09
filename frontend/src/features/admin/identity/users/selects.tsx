import { listUsersOptions } from "@/api/@tanstack/react-query.gen";
import { useAPIQuery } from "@/hooks/query";
import { createListCollection, Portal, Select } from "@chakra-ui/react";
import { useMemo } from "react";

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
