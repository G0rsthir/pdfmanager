import {
  deleteCollectionPermissionMutation,
  getCollectionPermissionsOptions,
  inviteToCollectionMutation,
  updateCollectionPermissionMutation,
} from "@/api/@tanstack/react-query.gen";
import type {
  AssignmentResponse,
  ResourcePermissionLevel,
} from "@/api/types.gen";
import {
  type InviteToCollectionRequest,
  type ResourcePermissionResponse,
} from "@/api/types.gen";
import { GenericIconButton } from "@/components/ui/button";
import { QueryView } from "@/components/ui/feedback";
import { Form } from "@/components/ui/form/container";
import type { SelectOption } from "@/components/ui/select";
import { useFormMutation } from "@/hooks/form";
import { useAPIMutation, useAPIQuery } from "@/hooks/query";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  CloseButton,
  Dialog,
  Group,
  Menu,
  Portal,
  Stack,
  Text,
  type BadgeProps,
} from "@chakra-ui/react";
import { BsThreeDotsVertical } from "react-icons/bs";

export function PermissionsDialog(props: {
  open: boolean;
  onClose: () => void;
  resourceId: string;
  resourceName?: string;
  readonly?: boolean;
}) {
  const { open, onClose, resourceId, resourceName, readonly } = props;

  const query = useAPIQuery({
    ...getCollectionPermissionsOptions({
      path: {
        id: resourceId,
      },
    }),
    enabled: open,
  });

  return (
    <Dialog.Root open={open} size="md" onOpenChange={() => onClose()}>
      <Portal>
        <Dialog.Backdrop onClick={(e) => e.stopPropagation()} />
        <Dialog.Positioner onClick={(e) => e.stopPropagation()}>
          <Dialog.Content>
            <Dialog.CloseTrigger asChild>
              <CloseButton colorPalette="gray" />
            </Dialog.CloseTrigger>
            <Dialog.Header>
              <Stack gap={0}>
                <Dialog.Title>Permissions</Dialog.Title>
                {resourceName && (
                  <Text textStyle="xs" color="fg.muted">
                    {resourceName}
                  </Text>
                )}
              </Stack>
            </Dialog.Header>
            <Dialog.Body>
              <QueryView query={query}>
                {(access) => (
                  <ManageCollectionPermissions
                    access={access}
                    readonly={readonly}
                  />
                )}
              </QueryView>
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                variant="surface"
                colorPalette="gray"
                onClick={() => onClose()}
              >
                Close
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function ManageCollectionPermissions(props: {
  access: ResourcePermissionResponse;
  readonly?: boolean;
}) {
  const { access, readonly } = props;

  const { mutate: deletePermission } = useAPIMutation({
    ...deleteCollectionPermissionMutation(),
    successNotification: "Permission deleted successfully",
    errorNotification: "Failed to delete permission",
  });

  const { mutate: updatePermission } = useAPIMutation({
    ...updateCollectionPermissionMutation(),
    successNotification: "Permission updated successfully",
    errorNotification: "Failed to update permission",
  });

  return (
    <Stack gap={4}>
      {readonly && (
        <Alert.Root status="warning">
          <Alert.Indicator />
          <Alert.Title>
            You don't have permissions to modify this resource
          </Alert.Title>
        </Alert.Root>
      )}
      <InviteForm collectionId={access.id} readOnly={readonly} />
      <PermissionsView
        assignments={access.assignments}
        onDelete={(id) =>
          deletePermission({ path: { id, collection_id: access.id } })
        }
        onModify={(id, permission) =>
          updatePermission({
            path: { id, collection_id: access.id },
            body: { permission },
          })
        }
      />
    </Stack>
  );
}

type ResourcePermissionLevelWritable = InviteToCollectionRequest["permission"];

const PERMISSION_OPTIONS_WRITABLE = [
  { value: "read", label: "Viewer" },
  { value: "modify", label: "Editor" },
  { value: "contribute", label: "Contributor" },
] satisfies SelectOption<ResourcePermissionLevelWritable>[];

const INVITE_DEFAULT_VALUES: InviteToCollectionRequest = {
  email: "",
  permission: "read",
};

function InviteForm(props: { collectionId: string; readOnly?: boolean }) {
  const { collectionId, readOnly } = props;

  const { form } = useFormMutation({
    formOptions: {
      defaultValues: INVITE_DEFAULT_VALUES,
    },
    mutationOptions: inviteToCollectionMutation,
    onMutate: (value) => ({ body: value, path: { id: collectionId } }),
    successNotification: "User invited to collection",
  });

  return (
    <Form onSubmit={() => void form.handleSubmit()}>
      <form.AppForm>
        <Stack>
          <Group gap={2}>
            <form.AppField
              name="email"
              children={(field) => (
                <field.TextField
                  placeholder="Add people by email"
                  required
                  disabled={readOnly}
                  flex={1}
                />
              )}
            />

            <form.AppField
              name="permission"
              children={(field) => (
                <field.SelectField
                  items={PERMISSION_OPTIONS_WRITABLE}
                  placeholder="Permission"
                  disabled={readOnly}
                  width="120px"
                />
              )}
            />

            <form.SubmitButton variant="surface" disabled={readOnly}>
              Invite
            </form.SubmitButton>
          </Group>
          <form.SubscribeFormError />
        </Stack>
      </form.AppForm>
    </Form>
  );
}

const PERMISSION_META: Record<
  ResourcePermissionLevel,
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
      permission: ResourcePermissionLevel;
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
  current: ResourcePermissionLevel;
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

function PermissionsView(props: PermissionsViewProps) {
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
