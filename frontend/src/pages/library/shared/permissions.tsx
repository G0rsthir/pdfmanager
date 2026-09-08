import type {
  AssignmentResponse,
  ResourcePermissionLevel as ResourcePermissionLevelType,
  UpdateCollectionPermissionRequest,
} from "@/api/types.gen";
import { GenericIconButton } from "@/components/ui/button";
import {
  Avatar,
  Badge,
  Group,
  Menu,
  Portal,
  Stack,
  Text,
  type BadgeProps,
} from "@chakra-ui/react";
import { BsThreeDotsVertical } from "react-icons/bs";

export type ResourcePermissionLevelWritable =
  UpdateCollectionPermissionRequest["permission"];

const PERMISSION_META: Record<
  ResourcePermissionLevelType,
  { label: string; color: string }
> = {
  owner: { label: "Owner", color: "purple" },
  modify: { label: "Editor", color: "blue" },
  read: { label: "Viewer", color: "teal" },
  contribute: { label: "Contributor", color: "cyan" },
};

export function PermissionBadge(
  props: BadgeProps &
    React.RefAttributes<HTMLSpanElement> & {
      permission: ResourcePermissionLevelType;
    },
) {
  const { permission, ...other } = props;

  const meta = PERMISSION_META[permission];

  return (
    <Badge variant="subtle" {...other} colorPalette={meta.color}>
      {meta.label}
    </Badge>
  );
}

function PermissionBadgeMenu(props: {
  current: ResourcePermissionLevelType;
  readOnly?: boolean;
  onChange: (permission: ResourcePermissionLevelWritable) => void;
}) {
  const { current, readOnly, onChange } = props;

  if (readOnly) {
    return <PermissionBadge permission={current} variant="subtle" size="sm" />;
  }

  return (
    <Menu.Root positioning={{ placement: "bottom-end" }}>
      <Menu.Trigger asChild>
        <PermissionBadge
          variant="subtle"
          size="sm"
          cursor="pointer"
          onClick={(e) => e.stopPropagation()}
          _hover={{
            bg: "colorPalette.solid",
            color: "colorPalette.contrast",
          }}
          permission={current}
        />
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content>
            {(["read", "modify", "contribute"] as const).map((value) => (
              <Menu.Item
                key={value}
                value={value}
                onClick={() => onChange(value)}
                disabled={value == current}
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
  onModify: (
    permissionId: string,
    permission: ResourcePermissionLevelWritable,
  ) => void;
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
              readOnly={p.lock_reason != null}
              onChange={(permission) => onModify(p.id, permission)}
            />

            <PermissionViewActions
              readOnly={p.lock_reason != null}
              onDelete={() => onDelete(p.id)}
            />
          </Group>
        );
      })}
    </Stack>
  );
}
