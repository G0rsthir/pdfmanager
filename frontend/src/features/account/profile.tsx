import {
  updateUserAccountDetailsMutation,
  updateUserPasswordMutation,
} from "@/api/@tanstack/react-query.gen";
import { AccessScope } from "@/api/types.gen";
import { useAuth, useHasScopes } from "@/common/auth/hooks";
import { Block, SettingsOption } from "@/components/ui/display";
import { Form } from "@/components/ui/form/container";
import { useFormMutation } from "@/hooks/form";
import {
  Alert,
  Button,
  Group,
  Separator,
  Stack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { LuShieldCheck } from "react-icons/lu";

export function ProfileContent() {
  const { session } = useAuth();

  return (
    <Block bg="bg.panel">
      <Stack gap={8}>
        {session?.user.is_external && (
          <Alert.Root status="warning">
            <Alert.Indicator />
            <Alert.Title>
              Your account is managed by an external provider.
            </Alert.Title>
          </Alert.Root>
        )}
        <SettingsOption
          title="Account"
          description="Set your account details"
          labelSpan={4}
          fieldSpan={8}
        >
          <EditAccountDetails />
        </SettingsOption>
        <Separator />
        <SettingsOption
          title="Credentials"
          description="Update password"
          labelSpan={4}
          fieldSpan={8}
        >
          <ChangePassword />
        </SettingsOption>
      </Stack>
    </Block>
  );
}

function EditAccountDetails() {
  const { session, refreshSession } = useAuth();

  const { form } = useFormMutation({
    formOptions: {
      defaultValues: {
        name: session?.user.name ?? "",
        email: session?.user.email ?? "",
      },
    },
    mutationOptions: updateUserAccountDetailsMutation,
    onMutate: (value) => ({ body: value }),
    successNotification: "Details updated successfully",
    resetForm: false,
    onSuccess: () => {
      void refreshSession();
      form.reset(form.state.values);
    },
  });

  const hasScope = useHasScopes(AccessScope.USER_WRITE);

  const isReadOnly = session?.user.is_external || !hasScope;

  return (
    <Form onSubmit={() => void form.handleSubmit()}>
      <Stack>
        <form.AppField
          name="name"
          children={(field) => (
            <field.TextField label="Name" required disabled={isReadOnly} />
          )}
        />
        <form.AppField
          name="email"
          children={(field) => (
            <field.TextField label="Email" required disabled={isReadOnly} />
          )}
        />
        <form.AppForm>
          <form.SubscribeFormError />
        </form.AppForm>
        <form.Subscribe
          selector={(state) => state.isDirty}
          children={(isDirty) => {
            return (
              <>
                {isDirty && (
                  <Group justifyContent="flex-end">
                    <Button type="submit" disabled={isReadOnly}>
                      Update
                    </Button>
                  </Group>
                )}
              </>
            );
          }}
        />
      </Stack>
    </Form>
  );
}

function ChangePassword() {
  const { open, onOpen, onClose } = useDisclosure();
  const { session } = useAuth();

  const { form } = useFormMutation({
    formOptions: {
      defaultValues: {
        password_old: "",
        password_new: "",
        password_confirm: "",
      },
    },
    mutationOptions: updateUserPasswordMutation,
    onMutate: (value) => ({ body: value }),
    successNotification: "Password updated successfully",
    onSuccess: onClose,
  });

  const hasScope = useHasScopes(AccessScope.USER_WRITE);

  const isReadOnly = session?.user.is_external || !hasScope;

  if (!open)
    return (
      <Group justifyContent="space-between" width="full">
        <Group>
          <Text fontSize="sm" letterSpacing="wider">
            ••••••••••••
          </Text>
          <Group color="green.500" fontSize="sm">
            <LuShieldCheck />
            <Text>Secure</Text>
          </Group>
        </Group>
        <Button
          size="xs"
          variant="outline"
          onClick={onOpen}
          disabled={isReadOnly}
        >
          Edit
        </Button>
      </Group>
    );

  return (
    <Form onSubmit={() => void form.handleSubmit()}>
      <Stack>
        <form.AppField
          name="password_old"
          children={(field) => (
            <field.PasswordField
              label="Current Password"
              placeholder="********"
              required
            />
          )}
        />
        <form.AppField
          name="password_new"
          children={(field) => (
            <field.PasswordField
              label="New Password"
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
        <Group justifyContent="flex-end">
          <Button type="submit">Update</Button>
        </Group>
      </Stack>
    </Form>
  );
}
