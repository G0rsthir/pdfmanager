import type {
  AppStateResponse,
  BodyCreateAuthToken,
  SsoConfigResponse,
} from "@/api/types.gen";
import { useAuth } from "@/common/auth/hooks";
import { useAppState } from "@/common/state/hooks";
import { GenericIconButton } from "@/components/ui/button";
import { Form } from "@/components/ui/form/container";
import { useFormMutation } from "@/hooks/form";
import {
  Card,
  Center,
  Container,
  Group,
  Heading,
  HStack,
  Separator,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { LuKeyRound } from "react-icons/lu";
import { useLocation, useNavigate } from "react-router";
import { z } from "zod";

const loginRedirectStateSchema = z.object({
  from: z.object({ pathname: z.string() }),
});

function useLoginState() {
  const navigate = useNavigate();
  const [appState, setAppState] = useState<AppStateResponse>();

  const { loadAppState } = useAppState();

  useEffect(() => {
    void (async () => {
      const state = await loadAppState();
      setAppState(state);
    })();

    // One time load of app state on login page.
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-x/exhaustive-deps
  }, []);

  useEffect(() => {
    // Redirect user to the setup page if process is not complete.
    if (appState?.is_setup_complete == false) {
      void navigate("/setup");
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

  const redirectState = loginRedirectStateSchema.safeParse(location.state);
  const to = redirectState.data?.from.pathname || "/";

  const auth = useAuth();
  const loginState = useLoginState();

  const { form } = useFormMutation({
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
    onSuccess: () => void navigate(to, { replace: true }),
  });

  return (
    <Center h="100vh">
      <Container maxW="md">
        <Form onSubmit={() => void form.handleSubmit()}>
          <Card.Root padding="8">
            <Card.Body>
              <Stack gap="6">
                <Heading size="2xl" mb="4" textAlign="center">
                  Log in to your account
                </Heading>
                <form.AppField
                  name="username"
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
                <form.AppForm>
                  <form.SubscribeFormError />
                </form.AppForm>
              </Stack>
            </Card.Body>
            <Card.Footer>
              <Stack w="full" gap={4}>
                <form.AppForm>
                  <form.SubmitButton w="full">Sign in</form.SubmitButton>
                </form.AppForm>
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
