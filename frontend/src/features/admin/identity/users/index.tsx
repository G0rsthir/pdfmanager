import {
  createUserMutation,
  deleteUserMutation,
  listRolesOptions,
  listUsersOptions,
  resetUserPasswordMutation,
  updateUserMutation,
} from "@/api/@tanstack/react-query.gen";
import {
  AccessScope,
  type RoleResponse,
  type UserResponse,
} from "@/api/types.gen";
import { useHasScopes } from "@/common/auth/hooks";
import { GenericIconButton } from "@/components/ui/button";
import { QueryView } from "@/components/ui/feedback";
import { FormModal } from "@/components/ui/form/modal";
import { ConfirmModal } from "@/components/ui/modal";
import type { SelectOption } from "@/components/ui/select";
import { SimpleTable, TableFrame } from "@/components/ui/table/frame";
import { useFormMutation } from "@/hooks/form";
import { useAPIMutation, useAPIQuery } from "@/hooks/query";
import {
  Badge,
  Button,
  Group,
  Heading,
  Menu,
  Portal,
  Stack,
  Table,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import { LuPlus } from "react-icons/lu";

export function UsersPage() {
  const query = useAPIQuery({
    ...listUsersOptions(),
  });

  return (
    <Stack gap={6}>
      <Group justify="space-between" align="center">
        <Heading size="2xl" fontWeight="normal">
          Users
        </Heading>
        <CreateUserAction />
      </Group>
      <TableFrame>
        <QueryView query={query}>
          {(data) => <UsersView users={data} />}
        </QueryView>
      </TableFrame>
    </Stack>
  );
}

function UsersView({ users }: { users: UserResponse[] }) {
  return (
    <SimpleTable size="md">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>Name</Table.ColumnHeader>
          <Table.ColumnHeader>Email</Table.ColumnHeader>
          <Table.ColumnHeader>Role</Table.ColumnHeader>
          <Table.ColumnHeader>Status</Table.ColumnHeader>
          <Table.ColumnHeader>Type</Table.ColumnHeader>
          <Table.ColumnHeader textAlign="end">Actions</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {users.map((user) => (
          <Table.Row key={user.id}>
            <Table.Cell>{user.name}</Table.Cell>
            <Table.Cell>
              <Text color="fg.muted">{user.email}</Text>
            </Table.Cell>
            <Table.Cell>
              <Badge
                variant="subtle"
                colorPalette={user.role.name === "ADMIN" ? "purple" : "blue"}
              >
                {user.role.name}
              </Badge>
            </Table.Cell>
            <Table.Cell>
              <Badge
                variant="subtle"
                colorPalette={user.is_enabled ? "green" : "red"}
              >
                {user.is_enabled ? "Active" : "Inactive"}
              </Badge>
            </Table.Cell>
            <Table.Cell>
              <Badge
                variant="subtle"
                colorPalette={user.is_external ? "cyan" : "orange"}
              >
                {user.is_external ? "External" : "Local"}
              </Badge>
            </Table.Cell>
            <Table.Cell textAlign="end">
              <TableRowActions user={user} />
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </SimpleTable>
  );
}

type RowAction = "delete" | "edit" | "password" | null;

function TableRowActions({ user }: { user: UserResponse }) {
  const [dialog, setDialog] = useState<RowAction>(null);
  const onClose = useCallback(() => setDialog(null), []);

  const canWrite = useHasScopes(AccessScope.ADMIN_WRITE);

  return (
    <>
      <Menu.Root>
        <Menu.Trigger asChild>
          <GenericIconButton size="xs" variant="ghost">
            <BsThreeDotsVertical />
          </GenericIconButton>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content>
              <Menu.Item
                value="edit"
                onSelect={() => setDialog("edit")}
                disabled={user.is_external || !canWrite}
              >
                Edit
              </Menu.Item>
              <Menu.Item
                value="password"
                onSelect={() => setDialog("password")}
                disabled={user.is_external || !canWrite}
              >
                Reset password
              </Menu.Item>
              <Menu.Item
                value="delete"
                color="fg.error"
                _hover={{ bg: "bg.error", color: "fg.error" }}
                onSelect={() => setDialog("delete")}
                disabled={!canWrite}
              >
                Delete
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
      <DeleteUserDialog
        open={dialog == "delete"}
        onClose={onClose}
        userId={user.id}
      />
      <EditUserDialog open={dialog == "edit"} onClose={onClose} user={user} />
      <ResetPasswordDialog
        open={dialog == "password"}
        onClose={onClose}
        userId={user.id}
      />
    </>
  );
}

function CreateUserAction() {
  const { open, onClose, onOpen } = useDisclosure();

  const canWrite = useHasScopes(AccessScope.ADMIN_WRITE);

  return (
    <>
      <Button size="sm" onClick={onOpen}>
        <LuPlus /> Add User
      </Button>
      <CreateUserDialog open={open} onClose={onClose} readonly={!canWrite} />
    </>
  );
}

function DeleteUserDialog(props: {
  open: boolean;
  onClose: () => void;
  userId: string;
}) {
  const { open, onClose, userId } = props;

  const { mutate: deleteRequest } = useAPIMutation({
    ...deleteUserMutation(),
    successNotification: "User deleted successfully",
    errorNotification: "User deletion failed",
  });

  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      title="Are you sure?"
      onConfirm={() => deleteRequest({ path: { id: userId } })}
      confirmBtnText="Delete"
      confirmBtnPalette="red"
    >
      This action cannot be undone. This will permanently delete this user.
    </ConfirmModal>
  );
}

function CreateUserDialog(props: {
  open: boolean;
  onClose: () => void;
  readonly?: boolean;
}) {
  const { open, readonly, onClose } = props;

  const { form } = useFormMutation({
    formOptions: {
      defaultValues: {
        name: "",
        email: "",
        password: "",
        password_confirm: "",
        role_id: "",
        is_enabled: true,
      },
    },
    mutationOptions: createUserMutation,
    onMutate: (value) => ({ body: value }),
    successNotification: "User created",
    onSuccess: onClose,
  });

  const queryRoles = useAPIQuery({
    ...listRolesOptions(),
  });

  const handleClose = useCallback(() => {
    form.reset();
    onClose();
  }, [onClose, form]);

  useEffect(() => {
    if (queryRoles.data?.length && !form.state.values.role_id) {
      form.setFieldValue("role_id", queryRoles.data[0].id);
    }
  }, [queryRoles.data, form]);

  return (
    <FormModal
      open={open}
      close={handleClose}
      title="Create User"
      onSubmit={() => void form.handleSubmit()}
      confirmBtnText="Create"
      disabled={readonly}
    >
      <form.AppField
        name="name"
        children={(field) => (
          <field.TextField label="Name" required disabled={readonly} />
        )}
      />
      <form.AppField
        name="email"
        children={(field) => (
          <field.TextField label="Email" required disabled={readonly} />
        )}
      />
      <form.AppField
        name="password"
        children={(field) => (
          <field.PasswordField
            label="Password"
            placeholder="********"
            required
            disabled={readonly}
          />
        )}
      />
      <form.AppField
        name="password_confirm"
        children={(field) => (
          <field.PasswordField
            label="Confirm Password"
            placeholder="********"
            required
            disabled={readonly}
          />
        )}
      />
      <form.AppField
        name="role_id"
        validators={{
          onChange: ({ value }) => (!value ? "Role is required" : undefined),
        }}
        children={(field) => (
          <field.SelectField
            label="Role"
            placeholder="Select role"
            items={toRoleOptions(queryRoles.data)}
            required
            disabled={readonly}
          />
        )}
      />
      <form.AppField
        name="is_enabled"
        children={(field) => (
          <field.SwitchField label="Active" disabled={readonly} />
        )}
      />
      <form.AppForm>
        <form.SubscribeFormError />
      </form.AppForm>
    </FormModal>
  );
}

function toRoleOptions(roles: RoleResponse[] = []): SelectOption[] {
  return roles.map((role) => ({ value: role.id, label: role.name }));
}

function EditUserDialog(props: {
  user: UserResponse;
  open: boolean;
  onClose: () => void;
}) {
  const { user, open, onClose } = props;

  const { form } = useFormMutation({
    formOptions: {
      defaultValues: {
        name: user.name,
        email: user.email,
        role_id: user.role_id,
        is_enabled: user.is_enabled,
      },
    },
    mutationOptions: updateUserMutation,
    onMutate: (value) => ({ body: value, path: { id: user.id } }),
    successNotification: "User updated",
    onSuccess: onClose,
  });

  const queryRoles = useAPIQuery({
    ...listRolesOptions(),
  });

  const handleClose = useCallback(() => {
    form.reset();
    onClose();
  }, [onClose, form]);

  return (
    <FormModal
      open={open}
      close={handleClose}
      title="Edit User"
      onSubmit={() => void form.handleSubmit()}
      confirmBtnText="Update"
    >
      <form.AppField
        name="name"
        children={(field) => <field.TextField label="Name" required />}
      />
      <form.AppField
        name="email"
        children={(field) => <field.TextField label="Email" required />}
      />
      <form.AppField
        name="role_id"
        validators={{
          onChange: ({ value }) => (!value ? "Role is required" : undefined),
        }}
        children={(field) => (
          <field.SelectField
            label="Role"
            placeholder="Select role"
            items={toRoleOptions(queryRoles.data)}
            required
          />
        )}
      />
      <form.AppField
        name="is_enabled"
        children={(field) => <field.SwitchField label="Active" />}
      />
      <form.AppForm>
        <form.SubscribeFormError />
      </form.AppForm>
    </FormModal>
  );
}

function ResetPasswordDialog(props: {
  open: boolean;
  userId: string;
  onClose: () => void;
}) {
  const { open, userId, onClose } = props;

  const { form } = useFormMutation({
    formOptions: {
      defaultValues: {
        password: "",
        password_confirm: "",
      },
    },
    mutationOptions: resetUserPasswordMutation,
    onMutate: (value) => ({ body: value, path: { id: userId } }),
    successNotification: "Password reset successfully",
    onSuccess: onClose,
  });

  const handleClose = useCallback(() => {
    form.reset();
    onClose();
  }, [onClose, form]);

  return (
    <FormModal
      open={open}
      close={handleClose}
      title="Reset password"
      onSubmit={() => void form.handleSubmit()}
      confirmBtnText="Update"
    >
      <form.AppField
        name="password"
        children={(field) => (
          <field.PasswordField
            label="Password"
            placeholder="********"
            required
          />
        )}
      />
      <form.AppField
        name="password_confirm"
        children={(field) => (
          <field.PasswordField
            label="Confirm Password"
            placeholder="********"
            required
          />
        )}
      />
      <form.AppForm>
        <form.SubscribeFormError />
      </form.AppForm>
    </FormModal>
  );
}
