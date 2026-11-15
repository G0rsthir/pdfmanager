import { createSetupUser } from "@/api/sdk.gen";
import type { CreateSetupUserData } from "@/api/types.gen";
import { useAuth } from "@/common/auth/hooks";
import { Form } from "@/components/ui/form/container";
import { useFormMutation } from "@/hooks/form";
import {
  Box,
  Card,
  Center,
  Container,
  Heading,
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

  const { form } = useFormMutation({
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
        <Form onSubmit={() => void form.handleSubmit()}>
          <Card.Root>
            <Card.Body>
              <Stack gap="6">
                <Box mb="4" textAlign="center">
                  <Heading size="2xl" mb="0.5rem">
                    Create admin account
                  </Heading>
                  <Text color="fg.muted">Add an initial application user</Text>
                </Box>
                <form.AppField
                  name="name"
                  children={(field) => (
                    <field.TextField label="Name" required />
                  )}
                />
                <form.AppField
                  name="email"
                  children={(field) => (
                    <field.TextField
                      label="Email"
                      placeholder="Enter your email"
                      required
                    />
                  )}
                />
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
                  <form.SubmitButton w="full">Sign in</form.SubmitButton>
                </form.AppForm>
              </Stack>
            </Card.Body>
          </Card.Root>
        </Form>
      </Container>
    </Center>
  );
}
