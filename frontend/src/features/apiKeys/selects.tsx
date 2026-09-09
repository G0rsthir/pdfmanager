import { AccessScope } from "@/api/types.gen";
import { createListCollection, Portal, Select } from "@chakra-ui/react";
import { useMemo } from "react";

const DefaultScopes = Object.values(AccessScope);

export interface ScopeSelectProps {
  onValueChange: (value: AccessScope[]) => void;
  value: AccessScope[];
  onBlur: () => void;
  required?: boolean;
  excludedScopes?: AccessScope[];
  scopes?: AccessScope[];
}

export function ScopeSelect(props: ScopeSelectProps) {
  const {
    onValueChange,
    value,
    required,
    onBlur,
    excludedScopes = [],
    scopes = DefaultScopes,
  } = props;

  const collection = useMemo(() => {
    return createListCollection({
      items: scopes.filter((item) => !excludedScopes.includes(item)),
    });
  }, [excludedScopes, scopes]);

  return (
    <Select.Root
      collection={collection}
      onValueChange={(e) => onValueChange(e.value as AccessScope[])}
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
