import { listUsersOptions } from "@/api/@tanstack/react-query.gen";
import { SelectField } from "@/components/ui/form/fields";
import { useAPIQuery } from "@/hooks/query";

export function UserSelectField(
  props: Omit<React.ComponentProps<typeof SelectField>, "items">,
) {
  const queryUsers = useAPIQuery({
    ...listUsersOptions(),
  });

  const items = (queryUsers.data ?? []).map((user) => ({
    value: user.id,
    label: `${user.name} (${user.email})`,
  }));

  return <SelectField placeholder="Select user" {...props} items={items} />;
}
