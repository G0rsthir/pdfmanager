import {
  updateUserAccountDetailsMutation,
  updateUserPasswordMutation,
} from "@/api/@tanstack/react-query.gen";
import { useAuth } from "@/common/auth/hooks";
import { Block, SettingsOption } from "@/components/ui/display";
import { FormError } from "@/components/ui/error";
import { Form } from "@/components/ui/form/container";
import { PasswordInput } from "@/components/ui/password-input";
import { useFormMutation } from "@/hooks/form";
import {
  Alert,
  Button,
  Field,
  Group,
  Input,
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

  const {
    Field: FormField,
    handleSubmit,
    state,
    reset,
    Subscribe,
  } = useFormMutation({
    formOptions: {
      defaultValues: {
        name: session?.user.name ?? "",
        email: session?.user.email ?? "",
      },
    },
    mutationOptions: updateUserAccountDetailsMutation,
    onMutate: (value) => ({ body: value }),
    successMessage: "Details updated successfully",
    resetForm: false,
    onSuccess: () => {
      refreshSession();
      reset(state.values);
    },
  });

  return (
    <Form onSubmit={handleSubmit}>
      <Stack>
        <FormField
          name="name"
          children={({ state: fieldState, handleChange, handleBlur }) => (
            <Field.Root
              invalid={!fieldState.meta.isValid}
              required
              disabled={session?.user.is_external}
            >
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
            <Field.Root
              invalid={!fieldState.meta.isValid}
              required
              disabled={session?.user.is_external}
            >
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
        <FormError errors={state.errorMap.onSubmit} />
        <Subscribe
          selector={(state) => state.isDirty}
          children={(isDirty) => {
            return (
              <>
                {isDirty && (
                  <Group justifyContent="flex-end">
                    <Button type="submit" disabled={session?.user.is_external}>
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

  const {
    Field: FormField,
    handleSubmit,
    state,
  } = useFormMutation({
    formOptions: {
      defaultValues: {
        password_old: "",
        password_new: "",
        password_confirm: "",
      },
    },
    mutationOptions: updateUserPasswordMutation,
    onMutate: (value) => ({ body: value }),
    successMessage: "Password updated successfully",
    onSuccess: onClose,
  });

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
          disabled={session?.user.is_external}
        >
          Edit
        </Button>
      </Group>
    );

  return (
    <Form onSubmit={handleSubmit}>
      <Stack>
        <FormField
          name="password_old"
          children={({ state: fieldState, handleChange, handleBlur }) => (
            <Field.Root invalid={!fieldState.meta.isValid} required>
              <Field.Label>
                Current Password <Field.RequiredIndicator />
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
          name="password_new"
          children={({ state: fieldState, handleChange, handleBlur }) => (
            <Field.Root invalid={!fieldState.meta.isValid} required>
              <Field.Label>
                New Password <Field.RequiredIndicator />
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
            <Field.Root invalid={!fieldState.meta.isValid} required>
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
        <Group justifyContent="flex-end">
          <Button type="submit">Update</Button>
        </Group>
      </Stack>
    </Form>
  );
}
