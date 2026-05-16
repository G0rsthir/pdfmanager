import type { AssignmentResponse } from "@/api/types.gen";
import { GenericIconButton } from "@/components/ui/button";
import {
  Avatar,
  Badge,
  Group,
  Menu,
  Portal,
  Stack,
  Text,
} from "@chakra-ui/react";
import { BsThreeDotsVertical } from "react-icons/bs";

type PermissionValue = "owner" | "read" | "modify";

const PERMISSION_META: Record<
  PermissionValue,
  { label: string; color: string }
> = {
  owner: { label: "Owner", color: "purple" },
  modify: { label: "Editor", color: "blue" },
  read: { label: "Viewer", color: "teal" },
};

function PermissionBadgeMenu(props: {
  current: PermissionValue;
  readOnly?: boolean;
  onChange: (permission: "read" | "modify") => void;
}) {
  const { current, readOnly, onChange } = props;
  const meta = PERMISSION_META[current];

  if (readOnly) {
    return (
      <Badge colorPalette={meta.color} variant="subtle" size="sm">
        {meta.label}
      </Badge>
    );
  }

  return (
    <Menu.Root positioning={{ placement: "bottom-end" }}>
      <Menu.Trigger asChild>
        <Badge
          colorPalette={meta.color}
          variant="subtle"
          size="sm"
          cursor="pointer"
          onClick={(e) => e.stopPropagation()}
          _hover={{
            bg: "colorPalette.solid",
            color: "colorPalette.contrast",
          }}
        >
          {meta.label}
        </Badge>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content>
            {(["read", "modify"] as const).map((value) => (
              <Menu.Item
                key={value}
                value={value}
                onClick={() => onChange(value)}
                disabled={value === current}
              >
                {PERMISSION_META[value].label}
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}

function PermissionViewActions(props: {
  readOnly?: boolean;
  onDelete: () => void;
}) {
  const { readOnly, onDelete } = props;

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <GenericIconButton
          variant="ghost"
          size="sm"
          onClick={(e) => e.stopPropagation()}
          disabled={readOnly}
        >
          <BsThreeDotsVertical />
        </GenericIconButton>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content>
            <Menu.Item
              value="delete"
              color="fg.error"
              _hover={{ bg: "bg.error", color: "fg.error" }}
              onClick={onDelete}
            >
              Delete
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}

interface PermissionsViewProps {
  assignments: AssignmentResponse[];
  onDelete: (permissionId: string) => void;
  onModify: (permissionId: string, permission: "read" | "modify") => void;
}

export function PermissionsView(props: PermissionsViewProps) {
  const { assignments, onDelete, onModify } = props;

  return (
    <Stack gap={3}>
      {assignments.map((p) => {
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
            <PermissionBadgeMenu
              current={p.permission}
              readOnly={p.is_read_only_by_current_user}
              onChange={(permission) => onModify(p.id, permission)}
            />

            <PermissionViewActions
              readOnly={p.is_read_only_by_current_user}
              onDelete={() => onDelete(p.id)}
            />
          </Group>
        );
      })}
    </Stack>
  );
}
