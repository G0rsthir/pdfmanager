import type { BodyCreateAuthToken } from "@/api/types.gen";
import { useAuth } from "@/common/auth/hooks";
import { FormError } from "@/components/ui/error";
import { Form } from "@/components/ui/form/container";
import { PasswordInput } from "@/components/ui/password-input";
import { useFormMutation } from "@/hooks/form";
import {
  Button,
  Card,
  Center,
  Container,
  Field,
  Heading,
  Input,
  Stack,
} from "@chakra-ui/react";
import { useLocation, useNavigate } from "react-router";

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const to = location.state?.from?.pathname || "/";

  const auth = useAuth();

  const {
    Field: FormField,
    handleSubmit,
    state,
  } = useFormMutation({
    formOptions: {
      defaultValues: {
        username: "",
        password: "",
      },
    },
    mutationOptions: () => ({
      mutationFn: async (data: BodyCreateAuthToken) => {
        await auth.signinWithPassword(data);
      },
    }),
    onMutate: (value) => value,
    onSuccess: () => navigate(to, { replace: true }),
  });

  return (
    <Center h="100vh">
      <Container maxW="md">
        <Form onSubmit={handleSubmit}>
          <Card.Root padding="8">
            <Card.Body>
              <Stack gap="6">
                <Heading size="2xl" mb="4" textAlign="center">
                  Log in to your account
                </Heading>
                <FormField
                  name="username"
                  children={({
                    state: fieldState,
                    handleChange,
                    handleBlur,
                  }) => (
                    <Field.Root invalid={!fieldState.meta.isValid} required>
                      <Field.Label>
                        Email <Field.RequiredIndicator />
                      </Field.Label>
                      <Input
                        placeholder="Enter your email"
                        value={fieldState.value}
                        onChange={(e) => handleChange(e.target.value)}
                        onBlur={handleBlur}
                      />
                      <Field.ErrorText>
                        {fieldState.meta.errors}
                      </Field.ErrorText>
                    </Field.Root>
                  )}
                />
                <FormField
                  name="password"
                  children={({
                    state: fieldState,
                    handleChange,
                    handleBlur,
                  }) => (
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
                      <Field.ErrorText>
                        {fieldState.meta.errors}
                      </Field.ErrorText>
                    </Field.Root>
                  )}
                />
                <FormError errors={state.errorMap.onSubmit} />
              </Stack>
            </Card.Body>
            <Card.Footer>
              <Button type="submit" w="full">
                Sign in
              </Button>
            </Card.Footer>
          </Card.Root>
        </Form>
      </Container>
    </Center>
  );
}
