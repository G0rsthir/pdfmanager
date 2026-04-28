import type { ResourcePermissionResponse } from "@/api/types.gen";
import {
  Avatar,
  Badge,
  Button,
  Group,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";

export function PermissionsView(props: { access: ResourcePermissionResponse }) {
  const { access } = props;

  return (
    <>
      <Stack gap={4}>
        <Group gap={2}>
          <Input placeholder="Add people by email" disabled flex={1} />
          <Button variant="surface" disabled>
            Invite
          </Button>
        </Group>
        <Stack gap={3}>
          {access.assignments.map((p) => {
            const meta = {
              owner: { label: "Owner", color: "purple" },
              modify: { label: "Editor", color: "blue" },
              read: { label: "Viewer", color: "gray" },
            }[p.permission];
            return (
              <Group key={p.user.id} gap={3} align="center">
                <Avatar.Root size="sm">
                  <Avatar.Fallback name={p.user.name} />
                </Avatar.Root>
                <Stack gap={0} flex={1} minW={0}>
                  <Text fontSize="sm" fontWeight="medium" truncate>
                    {p.user.name}
                  </Text>
                  <Text textStyle="xs" color="fg.muted" truncate>
                    {p.user.email}
                  </Text>
                </Stack>
                {p.inherited_from && (
                  <Text textStyle="xs" color="fg.muted">
                    Inherited
                  </Text>
                )}
                <Badge colorPalette={meta.color} variant="subtle" size="sm">
                  {meta.label}
                </Badge>
              </Group>
            );
          })}
        </Stack>
      </Stack>
    </>
  );
}
