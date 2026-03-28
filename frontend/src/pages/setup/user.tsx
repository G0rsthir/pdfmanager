import { createSetupUser } from "@/api/sdk.gen";
import type { CreateSetupUserData } from "@/api/types.gen";
import { useAuth } from "@/common/auth/hooks";
import { FormError } from "@/components/ui/error";
import { Form } from "@/components/ui/form/container";
import { PasswordInput } from "@/components/ui/password-input";
import { useFormMutation } from "@/hooks/form";
import {
  Box,
  Button,
  Card,
  Center,
  Container,
  Field,
  Heading,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";

export function SetupUser({
  successCallback,
}: {
  progress: number;
  successCallback?: () => void;
}) {
  const auth = useAuth();

  const {
    Field: FormField,
    handleSubmit,
    state,
  } = useFormMutation({
    formOptions: {
      defaultValues: {
        name: "",
        email: "",
        password: "",
        password_confirm: "",
      },
    },
    mutationOptions: () => ({
      mutationFn: async (data: CreateSetupUserData["body"]) => {
        await createSetupUser({
          body: data,
          throwOnError: true,
        });

        await auth.signinWithPassword({
          username: data.email,
          password: data.password,
        });
      },
    }),
    onMutate: (value) => value,
    onSuccess: () => successCallback && successCallback(),
  });

  return (
    <Center h="100vh">
      <Container maxW="md">
        <Form onSubmit={handleSubmit}>
          <Card.Root>
            <Card.Body>
              <Stack gap="6">
                <Box mb="4" textAlign="center">
                  <Heading size="2xl" mb="0.5rem">
                    Create admin account
                  </Heading>
                  <Text color="fg.muted">Add an initial application user</Text>
                </Box>
                <FormField
                  name="name"
                  children={({ state, handleChange, handleBlur }) => (
                    <Field.Root invalid={!state.meta.isValid} required>
                      <Field.Label>
                        Name <Field.RequiredIndicator />
                      </Field.Label>
                      <Input
                        value={state.value}
                        onChange={(e) => handleChange(e.target.value)}
                        onBlur={handleBlur}
                      />
                      <Field.ErrorText>{state.meta.errors}</Field.ErrorText>
                    </Field.Root>
                  )}
                />
                <FormField
                  name="email"
                  children={({ state, handleChange, handleBlur }) => (
                    <Field.Root invalid={!state.meta.isValid} required>
                      <Field.Label>
                        Email <Field.RequiredIndicator />
                      </Field.Label>
                      <Input
                        placeholder="Enter your email"
                        value={state.value}
                        onChange={(e) => handleChange(e.target.value)}
                        onBlur={handleBlur}
                      />
                      <Field.ErrorText>{state.meta.errors}</Field.ErrorText>
                    </Field.Root>
                  )}
                />
                <FormField
                  name="password"
                  children={({ state, handleChange, handleBlur }) => (
                    <Field.Root required invalid={!state.meta.isValid}>
                      <Field.Label>
                        Password <Field.RequiredIndicator />
                      </Field.Label>
                      <PasswordInput
                        placeholder="********"
                        value={state.value}
                        onChange={(e) => handleChange(e.target.value)}
                        onBlur={handleBlur}
                      />
                      <Field.ErrorText>{state.meta.errors}</Field.ErrorText>
                    </Field.Root>
                  )}
                />
                <FormField
                  name="password_confirm"
                  children={({ state, handleChange, handleBlur }) => (
                    <Field.Root required invalid={!state.meta.isValid}>
                      <Field.Label>
                        Confirm Password <Field.RequiredIndicator />
                      </Field.Label>
                      <PasswordInput
                        placeholder="********"
                        value={state.value}
                        onChange={(e) => handleChange(e.target.value)}
                        onBlur={handleBlur}
                      />
                      <Field.ErrorText>{state.meta.errors}</Field.ErrorText>
                    </Field.Root>
                  )}
                />
                <FormError errors={state.errorMap.onSubmit} />
                <Button type="submit" w="full">
                  Sign in
                </Button>
              </Stack>
            </Card.Body>
          </Card.Root>
        </Form>
      </Container>
    </Center>
  );
}
