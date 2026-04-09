import {
  createUserMutation,
  deleteUserMutation,
  listRolesOptions,
  listUsersOptions,
  resetUserPasswordMutation,
  updateUserMutation,
} from "@/api/@tanstack/react-query.gen";
import type { RoleResponse, UserResponse } from "@/api/types.gen";
import { parseAPIError } from "@/common/error";
import { GenericIconButton } from "@/components/ui/button";
import { FormError } from "@/components/ui/error";
import { QueryView } from "@/components/ui/feedback";
import { FormModal } from "@/components/ui/form/modal";
import { ConfirmModal } from "@/components/ui/modal";
import { PasswordInput } from "@/components/ui/password-input";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@/components/ui/toaster";
import { useFormMutation } from "@/hooks/form";
import { useAPIMutation, useAPIQuery } from "@/hooks/query";
import {
  Badge,
  Button,
  createListCollection,
  Field,
  Group,
  Heading,
  Input,
  Menu,
  Portal,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
      <QueryView query={query}>
        {(data) => <UsersView users={data} />}
      </QueryView>
    </Stack>
  );
}

function UsersView({ users }: { users: UserResponse[] }) {
  return (
    <Table.Root size="md">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>Name</Table.ColumnHeader>
          <Table.ColumnHeader>Email</Table.ColumnHeader>
          <Table.ColumnHeader>Role</Table.ColumnHeader>
          <Table.ColumnHeader>Status</Table.ColumnHeader>
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
            <Table.Cell textAlign="end">
              <TableRowActions user={user} />
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}

type RowAction = "delete" | "edit" | "password" | null;

function TableRowActions({ user }: { user: UserResponse }) {
  const [dialog, setDialog] = useState<RowAction>(null);
  const onClose = useCallback(() => setDialog(null), []);

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
              <Menu.Item value="edit" onClick={() => setDialog("edit")}>
                Edit
              </Menu.Item>
              <Menu.Item value="password" onClick={() => setDialog("password")}>
                Reset password
              </Menu.Item>
              <Menu.Item
                value="delete"
                color="fg.error"
                _hover={{ bg: "bg.error", color: "fg.error" }}
                onClick={() => setDialog("delete")}
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

  return (
    <>
      <Button size="sm" onClick={onOpen}>
        <LuPlus /> Add User
      </Button>
      <CreateUserDialog open={open} onClose={onClose} />
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
    onSuccess() {
      showSuccessNotification("User deleted successfully");
      onClose();
    },
    onError(error) {
      onClose();
      showErrorNotification(
        "User deletion failed",
        parseAPIError(error).message,
      );
    },
  });

  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      title="Are you sure?"
      onConfirm={() => deleteRequest({ path: { id: userId } })}
      confirmBtnText="Delete"
      confirmBtnPalette="red"
      confirmBtnType="adminWrite"
    >
      This action cannot be undone. This will permanently delete this user.
    </ConfirmModal>
  );
}

function CreateUserDialog(props: { open: boolean; onClose: () => void }) {
  const { open, onClose } = props;

  const {
    Field: FormField,
    handleSubmit,
    state,
    reset,
    setFieldValue,
  } = useFormMutation({
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
    successMessage: "User created",
    onSuccess: onClose,
  });

  const queryRoles = useAPIQuery({
    ...listRolesOptions(),
  });

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  useEffect(() => {
    if (queryRoles.data?.length && !state.values.role_id) {
      setFieldValue("role_id", queryRoles.data[0].id);
    }
  }, [queryRoles.data, setFieldValue, state.values.role_id]);

  return (
    <FormModal
      open={open}
      close={handleClose}
      title="Create User"
      onSubmit={() => handleSubmit()}
      confirmBtnText="Create"
      confirmBtnType="adminWrite"
    >
      <FormField
        name="name"
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root invalid={!fieldState.meta.isValid} required>
            <Field.Label>
              Name <Field.RequiredIndicator />
            </Field.Label>
            <Input
              value={fieldState.value}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={handleBlur}
            />
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />
      <FormField
        name="email"
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root invalid={!fieldState.meta.isValid} required>
            <Field.Label>
              Email <Field.RequiredIndicator />
            </Field.Label>
            <Input
              value={fieldState.value}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={handleBlur}
            />
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />
      <FormField
        name="password"
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root required invalid={!fieldState.meta.isValid}>
            <Field.Label>
              Password <Field.RequiredIndicator />
            </Field.Label>
            <PasswordInput
              placeholder="********"
              value={fieldState.value}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={handleBlur}
            />
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />
      <FormField
        name="password_confirm"
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root required invalid={!fieldState.meta.isValid}>
            <Field.Label>
              Confirm Password <Field.RequiredIndicator />
            </Field.Label>
            <PasswordInput
              placeholder="********"
              value={fieldState.value}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={handleBlur}
            />
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />
      <FormField
        name="role_id"
        validators={{
          onChange: ({ value }) => (!value ? "Role is required" : undefined),
        }}
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root invalid={!fieldState.meta.isValid} required>
            <RoleSelect
              onValueChange={handleChange}
              onBlur={handleBlur}
              required
              value={fieldState.value}
              roles={queryRoles.data ?? []}
            />
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />
      <FormField
        name="is_enabled"
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root invalid={!fieldState.meta.isValid}>
            <Switch.Root
              checked={fieldState.value}
              onCheckedChange={({ checked }) => handleChange(checked)}
            >
              <Switch.HiddenInput onBlur={handleBlur} />
              <Switch.Control />
              <Switch.Label>Active</Switch.Label>
            </Switch.Root>
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />
      <FormError errors={state.errorMap.onSubmit} />
    </FormModal>
  );
}

interface RoleSelectProps {
  onValueChange: (value: string) => void;
  value: string;
  onBlur: () => void;
  required?: boolean;
  roles: RoleResponse[];
}

function RoleSelect(props: RoleSelectProps) {
  const { onValueChange, value, required, roles, onBlur } = props;

  const collection = useMemo(() => {
    return createListCollection({
      items: roles ?? [],
      itemToString: (role) => role.name,
      itemToValue: (role) => role.id,
    });
  }, [roles]);

  return (
    <Select.Root
      collection={collection}
      onValueChange={(e) => onValueChange(e.value?.[0])}
      required={required}
      onInteractOutside={onBlur}
      value={value ? [value] : []}
    >
      <Select.HiddenSelect />
      <Select.Label>
        Role {required && <Field.RequiredIndicator />}
      </Select.Label>
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder="Select role" />
        </Select.Trigger>
        <Select.IndicatorGroup>
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      <Portal>
        <Select.Positioner>
          <Select.Content maxH="300px" overflowY="auto">
            {collection.items.map((role) => (
              <Select.Item item={role} key={role.id}>
                {role.name}
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  );
}

function EditUserDialog(props: {
  user: UserResponse;
  open: boolean;
  onClose: () => void;
}) {
  const { user, open, onClose } = props;

  const {
    Field: FormField,
    handleSubmit,
    state,
    reset,
  } = useFormMutation({
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
    successMessage: "User updated",
    onSuccess: onClose,
  });

  const queryRoles = useAPIQuery({
    ...listRolesOptions(),
  });

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  return (
    <FormModal
      open={open}
      close={handleClose}
      title="Edit User"
      onSubmit={() => handleSubmit()}
      confirmBtnText="Update"
      confirmBtnType="adminWrite"
    >
      <FormField
        name="name"
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root invalid={!fieldState.meta.isValid} required>
            <Field.Label>
              Name <Field.RequiredIndicator />
            </Field.Label>
            <Input
              value={fieldState.value}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={handleBlur}
            />
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />
      <FormField
        name="email"
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root invalid={!fieldState.meta.isValid} required>
            <Field.Label>
              Email <Field.RequiredIndicator />
            </Field.Label>
            <Input
              value={fieldState.value}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={handleBlur}
            />
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />
      <FormField
        name="role_id"
        validators={{
          onChange: ({ value }) => (!value ? "Role is required" : undefined),
        }}
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root invalid={!fieldState.meta.isValid} required>
            <RoleSelect
              onValueChange={handleChange}
              onBlur={handleBlur}
              required
              value={fieldState.value}
              roles={queryRoles.data ?? []}
            />
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />
      <FormField
        name="is_enabled"
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root invalid={!fieldState.meta.isValid}>
            <Switch.Root
              checked={fieldState.value}
              onCheckedChange={({ checked }) => handleChange(checked)}
            >
              <Switch.HiddenInput onBlur={handleBlur} />
              <Switch.Control />
              <Switch.Label>Active</Switch.Label>
            </Switch.Root>
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />
      <FormError errors={state.errorMap.onSubmit} />
    </FormModal>
  );
}

function ResetPasswordDialog(props: {
  open: boolean;
  userId: string;
  onClose: () => void;
}) {
  const { open, userId, onClose } = props;

  const {
    Field: FormField,
    handleSubmit,
    state,
    reset,
  } = useFormMutation({
    formOptions: {
      defaultValues: {
        password: "",
        password_confirm: "",
      },
    },
    mutationOptions: resetUserPasswordMutation,
    onMutate: (value) => ({ body: value, path: { id: userId } }),
    successMessage: "Password reset successfully",
    onSuccess: onClose,
  });

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  return (
    <FormModal
      open={open}
      close={handleClose}
      title="Reset password"
      onSubmit={() => handleSubmit()}
      confirmBtnText="Update"
      confirmBtnType="adminWrite"
    >
      <FormField
        name="password"
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root required invalid={!fieldState.meta.isValid}>
            <Field.Label>
              Password <Field.RequiredIndicator />
            </Field.Label>
            <PasswordInput
              placeholder="********"
              value={fieldState.value}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={handleBlur}
            />
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />
      <FormField
        name="password_confirm"
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root required invalid={!fieldState.meta.isValid}>
            <Field.Label>
              Confirm Password <Field.RequiredIndicator />
            </Field.Label>
            <PasswordInput
              placeholder="********"
              value={fieldState.value}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={handleBlur}
            />
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />
      <FormError errors={state.errorMap.onSubmit} />
    </FormModal>
  );
}
