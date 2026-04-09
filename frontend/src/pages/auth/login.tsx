import type {
  AppStateResponse,
  BodyCreateAuthToken,
  SsoConfigResponse,
} from "@/api/types.gen";
import { useAuth } from "@/common/auth/hooks";
import { useAppState } from "@/common/state/hooks";
import { GenericIconButton } from "@/components/ui/button";
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
  Group,
  Heading,
  HStack,
  Input,
  Separator,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { LuKeyRound } from "react-icons/lu";
import { useLocation, useNavigate } from "react-router";

function useLoginState() {
  const navigate = useNavigate();
  const [appState, setAppState] = useState<AppStateResponse>();

  const { loadAppState } = useAppState();

  useEffect(() => {
    (async () => {
      const state = await loadAppState();
      setAppState(state);
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Redirect user to the setup page if process is not complete.
    if (appState?.is_setup_complete == false) {
      navigate("/setup");
      return;
    }
    // Redirect user to the SSO page.
    if (appState?.auto_login_sso_server?.is_auto_login_enabled)
      window.location.replace(appState.auto_login_sso_server.url);
  }, [navigate, appState]);

  return {
    appState,
  };
}

function SsoProviders({ providers }: { providers: SsoConfigResponse[] }) {
  return (
    <Stack gap={2}>
      <HStack>
        <Separator flex={1} />
        <Text fontSize="sm" flexShrink={0}>
          OR
        </Text>
        <Separator flex={1} />
      </HStack>
      <Group grow>
        {providers.map((provider) => (
          <GenericIconButton
            key={provider.url}
            variant="surface"
            onClick={() => window.location.replace(provider.url)}
          >
            <LuKeyRound />
            <Text fontSize="xs">{provider.name}</Text>
          </GenericIconButton>
        ))}
      </Group>
    </Stack>
  );
}

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const to = location.state?.from?.pathname || "/";

  const auth = useAuth();
  const loginState = useLoginState();

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
              <Stack w="full" gap={4}>
                <Button type="submit" w="full">
                  Sign in
                </Button>
                {loginState.appState?.sso_servers &&
                  loginState.appState.sso_servers.length > 0 && (
                    <SsoProviders providers={loginState.appState.sso_servers} />
                  )}
              </Stack>
            </Card.Footer>
          </Card.Root>
        </Form>
      </Container>
    </Center>
  );
}
