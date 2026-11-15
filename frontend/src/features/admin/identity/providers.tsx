import {
  createOidcAuthProviderMutation,
  deleteOidcAuthProviderMutation,
  getOidcAuthProviderOptions,
  listAuthProvidersOptions,
  listRolesOptions,
  updateOidcAuthProviderMutation,
} from "@/api/@tanstack/react-query.gen";
import { listOidcAuthProviders } from "@/api/sdk.gen";
import {
  AccessScope,
  type AuthProviderOidcResponse,
  type AuthProviderResponse,
  type RoleResponse,
} from "@/api/types.gen";
import { useHasScopes } from "@/common/auth/hooks";
import { parseAPIError } from "@/common/error";
import { GenericIconButton } from "@/components/ui/button";
import { SettingsOption } from "@/components/ui/display";
import { MultiQueryView, QueryView } from "@/components/ui/feedback";
import { Form } from "@/components/ui/form/container";
import { FormModal } from "@/components/ui/form/modal";
import { ConfirmModal } from "@/components/ui/modal";
import { useFormMutation } from "@/hooks/form";
import { useAPIMutation, useAPIQuery } from "@/hooks/query";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  HStack,
  Heading,
  Icon,
  Input,
  Menu,
  Portal,
  Separator,
  Stack,
  Switch,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { useCallback, useRef } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import { LuMinus, LuPlus } from "react-icons/lu";

export function AuthProvidersPage() {
  const query = useAPIQuery({
    ...listAuthProvidersOptions(),
  });

  return (
    <Stack gap={6}>
      <Group justify="space-between" align="center">
        <Heading size="2xl" fontWeight="normal">
          Auth Providers
        </Heading>
        <CreateProviderAction />
      </Group>
      <QueryView query={query}>
        {(data) => <ProvidersView providers={data} />}
      </QueryView>
    </Stack>
  );
}

function ProvidersView({ providers }: { providers: AuthProviderResponse[] }) {
  return (
    <Stack gap={4}>
      {providers.map((provider) =>
        provider.entity_type == "LOCAL" ? (
          <ProviderLocalCard provider={provider} key={provider.id} />
        ) : (
          <ProviderOidcCard provider={provider} key={provider.id} />
        ),
      )}
    </Stack>
  );
}

function ProviderCardHeader(props: {
  provider: AuthProviderResponse;
  open: boolean;
  onToggle: () => void;
  menuActions?: React.ReactNode;
}) {
  const { provider, open, onToggle, menuActions } = props;

  return (
    <Group justify="space-between" align="center">
      <Group gap={3} align="center">
        <Text fontSize="lg">{provider.name}</Text>
        <Badge
          variant="subtle"
          colorPalette={provider.is_enabled ? "green" : "red"}
          size="sm"
        >
          {provider.is_enabled ? "Enabled" : "Disabled"}
        </Badge>
      </Group>
      <Group gap={1}>
        <Button
          size="xs"
          variant="surface"
          colorPalette="green"
          onClick={onToggle}
        >
          {open ? "Collapse" : "Configure"}
        </Button>
        <Menu.Root>
          <Menu.Trigger asChild>
            <GenericIconButton size="xs" variant="ghost">
              <BsThreeDotsVertical />
            </GenericIconButton>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content>
                {menuActions ? (
                  menuActions
                ) : (
                  <Menu.Item value="none" disabled>
                    No actions available
                  </Menu.Item>
                )}
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </Group>
    </Group>
  );
}

function ProviderLocalCard({ provider }: { provider: AuthProviderResponse }) {
  const { open, onToggle } = useDisclosure();

  return (
    <Card.Root>
      <Card.Body>
        <Stack gap={4}>
          <ProviderCardHeader
            provider={provider}
            onToggle={onToggle}
            open={open}
          />
          {open && (
            <Stack gap={6} pt={2}>
              <Alert.Root status="warning">
                <Alert.Indicator />
                <Alert.Title>
                  The local provider is managed by the system and cannot be
                  modified
                </Alert.Title>
              </Alert.Root>
              <SettingsOption
                title="Name"
                labelSpan={4}
                fieldSpan={8}
                fontWeight="normal"
                required
              >
                <Input defaultValue={provider.name} size="sm" disabled />
              </SettingsOption>

              <SettingsOption
                title="Enabled"
                labelSpan={4}
                fieldSpan={8}
                fontWeight="normal"
              >
                <Switch.Root defaultChecked={provider.is_enabled} disabled>
                  <Switch.HiddenInput />
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Root>
              </SettingsOption>
              <Group justifyContent="flex-end">
                <Button
                  size="sm"
                  variant="surface"
                  colorPalette="gray"
                  onClick={onToggle}
                >
                  Cancel
                </Button>
                <Button size="sm" disabled>
                  Save
                </Button>
              </Group>
            </Stack>
          )}
        </Stack>
      </Card.Body>
    </Card.Root>
  );
}

function ProviderOidcCard({ provider }: { provider: AuthProviderResponse }) {
  const { open, onToggle } = useDisclosure();
  const { open: isDeleteOpen, onToggle: onDeleteOpenToggle } = useDisclosure();

  const queryProvider = useAPIQuery({
    ...getOidcAuthProviderOptions({ path: { id: provider.id } }),
  });

  const queryRoles = useAPIQuery({
    ...listRolesOptions(),
  });

  const canWrite = useHasScopes(AccessScope.ADMIN_WRITE);

  return (
    <Card.Root>
      <Card.Body>
        <Stack gap={4}>
          <ProviderCardHeader
            provider={provider}
            onToggle={onToggle}
            open={open}
            menuActions={
              <Menu.Item
                value="delete"
                color="fg.error"
                _hover={{ bg: "bg.error", color: "fg.error" }}
                onClick={onDeleteOpenToggle}
                disabled={!canWrite}
              >
                Delete
              </Menu.Item>
            }
          />
          <Text color="fg.muted" fontSize="sm">
            {queryProvider.data?.auto_discovery_url}
          </Text>
          {open && (
            <MultiQueryView queries={[queryProvider, queryRoles]}>
              {(data) => (
                <OidcProviderView
                  provider={data[0]}
                  onClose={onToggle}
                  roles={data[1]}
                  readonly={!canWrite}
                />
              )}
            </MultiQueryView>
          )}
        </Stack>
      </Card.Body>
      <DeleteOidcProviderDialog
        open={isDeleteOpen}
        onClose={onDeleteOpenToggle}
        providerId={provider.id}
      />
    </Card.Root>
  );
}

function OidcProviderView(props: {
  provider: AuthProviderOidcResponse;
  onClose: () => void;
  roles: RoleResponse[];
  readonly?: boolean;
}) {
  const { provider, readonly, onClose, roles } = props;

  const shouldRedirect = useRef(false);

  const { form } = useFormMutation({
    formOptions: {
      defaultValues: {
        name: provider.name,
        auto_discovery_url: provider.auto_discovery_url,
        client_id: provider.client_id,
        client_secret: provider.client_secret,
        group_claim_name: provider.group_claim_name,
        auto_login: provider.auto_login,
        is_enabled: provider.is_enabled,
        additional_scopes: provider.additional_scopes,
        group_claim_rules: provider.group_claim_rules,
      },
    },
    mutationOptions: updateOidcAuthProviderMutation,
    onMutate: (value) => ({ body: value, path: { id: provider.id } }),
    successNotification: "Provider updated successfully",
    resetForm: false,
    onSuccess: () => {
      if (shouldRedirect.current) {
        shouldRedirect.current = false;
        window.location.href = provider.authorize_url ?? "";
      }
      onClose();
    },
  });

  const testConnection = useCallback(() => {
    shouldRedirect.current = true;
    void form.handleSubmit();
  }, [form]);

  return (
    <>
      <Form onSubmit={() => void form.handleSubmit}>
        <Stack gap={6} pt={2}>
          <Box bg="bg.muted" borderRadius="l3" p={4}>
            <Stack gap={1}>
              <Text fontSize="sm" color="fg.muted">
                Configure this URL as the redirect URI in your identity provider
              </Text>
              <Text fontSize="sm" fontFamily="mono">
                {provider.redirect_url}
              </Text>
            </Stack>
          </Box>
          <SettingsOption
            title="Name"
            labelSpan={4}
            fieldSpan={8}
            fontWeight="normal"
            required
          >
            <form.AppField
              name="name"
              children={(field) => (
                <field.TextField size="sm" required disabled={readonly} />
              )}
            />
          </SettingsOption>
          <SettingsOption
            title="Auto Discovery URL"
            labelSpan={4}
            fieldSpan={8}
            fontWeight="normal"
            description="Well-known OIDC discovery endpoint used to fetch provider configuration automatically"
            required
          >
            <form.AppField
              name="auto_discovery_url"
              children={(field) => (
                <field.TextField
                  size="sm"
                  placeholder="https://auth.example.com/application/.well-known/openid-configuration"
                  required
                  disabled={readonly}
                />
              )}
            />
          </SettingsOption>

          <SettingsOption
            title="Client ID"
            labelSpan={4}
            fieldSpan={8}
            fontWeight="normal"
            required
          >
            <form.AppField
              name="client_id"
              children={(field) => (
                <field.TextField size="sm" required disabled={readonly} />
              )}
            />
          </SettingsOption>

          <SettingsOption
            title="Client Secret"
            description="Leave empty to keep current"
            labelSpan={4}
            fieldSpan={8}
            fontWeight="normal"
            required
          >
            <form.AppField
              name="client_secret"
              children={(field) => (
                <field.TextField
                  size="sm"
                  type="password"
                  required
                  disabled={readonly}
                />
              )}
            />
          </SettingsOption>
          <SettingsOption
            title="Additional Scopes"
            description="Additional scopes to request during authentication. This should be a space separated list of scopes"
            labelSpan={4}
            fieldSpan={8}
            fontWeight="normal"
          >
            <form.AppField
              name="additional_scopes"
              children={(field) => <field.TextField disabled={readonly} />}
            />
          </SettingsOption>

          <SettingsOption
            title="Group Claim Name"
            description="This claim value will be used to map the user to an application role"
            labelSpan={4}
            fieldSpan={8}
            fontWeight="normal"
            required
          >
            <form.AppField
              name="group_claim_name"
              children={(field) => (
                <field.TextField required disabled={readonly} />
              )}
            />
          </SettingsOption>

          <Separator />
          <Stack gap={4}>
            <Stack gap={1}>
              <Text>Group Rules</Text>
              <Text fontSize="sm" color="fg.muted">
                Map OIDC group values to application roles
              </Text>
            </Stack>
            <GroupRulesEditor form={form} roles={roles} readonly={readonly} />
          </Stack>
          <Separator />

          <SettingsOption
            title="Enabled"
            labelSpan={4}
            fieldSpan={8}
            fontWeight="normal"
          >
            <form.AppField
              name="is_enabled"
              children={(field) => <field.SwitchField disabled={readonly} />}
            />
          </SettingsOption>

          <SettingsOption
            title="Auto Login"
            description="Automatically redirect to this provider on the login page, skipping provider selection"
            labelSpan={4}
            fieldSpan={8}
            fontWeight="normal"
          >
            <form.AppField
              name="auto_login"
              validators={{
                onChangeAsync: async ({ value }) => {
                  if (!value) return;

                  const response = await listOidcAuthProviders();
                  if (response.error)
                    return parseAPIError(response.error).message;
                  const autoLoginProvider = response.data?.find(
                    (p) => p.auto_login,
                  );
                  if (!autoLoginProvider) return;
                  if (autoLoginProvider.id != provider.id)
                    return `Only one provider can have auto login enabled. Currently active on "${autoLoginProvider.name}"`;
                },
              }}
              children={(field) => <field.SwitchField disabled={readonly} />}
            />
          </SettingsOption>
          <form.AppForm>
            <form.SubscribeFormError />
          </form.AppForm>
          <Group justifyContent="flex-end">
            <Button
              size="sm"
              variant="solid"
              colorPalette="cyan"
              onClick={testConnection}
              disabled={readonly}
            >
              Save & Test Authentication
            </Button>
            <Button
              size="sm"
              variant="surface"
              colorPalette="gray"
              onClick={onClose}
            >
              Cancel
            </Button>
            <form.AppForm>
              <form.SubmitButton size="sm" disabled={readonly}>
                Save
              </form.SubmitButton>
            </form.AppForm>
          </Group>
        </Stack>
      </Form>
    </>
  );
}

/**
 * More info https://tanstack.com/form/latest/docs/framework/react/guides/arrays
 */
type OidcProviderFormValues = Pick<
  AuthProviderOidcResponse,
  | "name"
  | "auto_discovery_url"
  | "client_id"
  | "client_secret"
  | "group_claim_name"
  | "auto_login"
  | "is_enabled"
  | "additional_scopes"
  | "group_claim_rules"
>;

type OidcProviderFormApi = ReturnType<
  typeof useFormMutation<OidcProviderFormValues>
>["form"];

function GroupRulesEditor(props: {
  form: OidcProviderFormApi;
  roles: RoleResponse[];
  readonly?: boolean;
}) {
  const { form, roles, readonly } = props;

  const roleOptions = roles.map((role) => ({
    value: role.id,
    label: role.name,
  }));

  return (
    <form.AppField
      name="group_claim_rules"
      mode="array"
      children={(field) => (
        <Stack gap={3}>
          {field.state.value.map((_rule, i) => (
            <HStack key={i} gap={3}>
              <form.AppField
                name={`group_claim_rules[${i}].group`}
                validators={{
                  onChange: ({ value }) =>
                    !value ? "Group name is required" : undefined,
                }}
                children={(subField) => (
                  <subField.TextField
                    placeholder="Group name"
                    disabled={readonly}
                  />
                )}
              />
              <form.AppField
                name={`group_claim_rules[${i}].role_id`}
                validators={{
                  onChange: ({ value }) =>
                    !value ? "Role is required" : undefined,
                }}
                children={(subField) => (
                  <subField.SelectField
                    placeholder="Select role"
                    items={roleOptions}
                    required
                    disabled={readonly}
                  />
                )}
              />
              <Icon
                cursor="pointer"
                color="fg.muted"
                _hover={{ color: "fg.error" }}
                onClick={() => {
                  if (!readonly) field.removeValue(i);
                }}
              >
                <LuMinus />
              </Icon>
              <Icon
                cursor="pointer"
                color="fg.muted"
                _hover={{ color: "fg" }}
                onClick={() => {
                  if (!readonly)
                    field.insertValue(i + 1, { group: "", role_id: "" });
                }}
              >
                <LuPlus />
              </Icon>
            </HStack>
          ))}
          {field.state.value.length == 0 && (
            <Button
              size="xs"
              variant="outline"
              onClick={() => field.pushValue({ group: "", role_id: "" })}
              alignSelf="flex-start"
            >
              <LuPlus /> Add Rule
            </Button>
          )}
        </Stack>
      )}
    />
  );
}

function CreateProviderAction() {
  const { open, onClose, onOpen } = useDisclosure();

  const canWrite = useHasScopes(AccessScope.ADMIN_WRITE);

  return (
    <>
      <Button size="sm" onClick={onOpen}>
        <LuPlus /> Add Provider
      </Button>
      <CreateOidcProviderDialog
        open={open}
        onClose={onClose}
        readonly={!canWrite}
      />
    </>
  );
}

function CreateOidcProviderDialog(props: {
  open: boolean;
  onClose: () => void;
  readonly?: boolean;
}) {
  const { open, readonly, onClose } = props;

  const { form } = useFormMutation({
    formOptions: {
      defaultValues: {
        name: "",
      },
    },
    mutationOptions: createOidcAuthProviderMutation,
    onMutate: (value) => ({ body: value }),
    successNotification: "Auth provider created",
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
      title="Create OIDC provider"
      onSubmit={() => void form.handleSubmit()}
      confirmBtnText="Create"
      submitOnEnter
      disabled={readonly}
    >
      <form.AppField
        name="name"
        children={(field) => (
          <field.TextField label="Name" required disabled={readonly} />
        )}
      />
      <form.AppForm>
        <form.SubscribeFormError />
      </form.AppForm>
    </FormModal>
  );
}

function DeleteOidcProviderDialog(props: {
  open: boolean;
  onClose: () => void;
  providerId: string;
}) {
  const { open, onClose, providerId } = props;

  const { mutate: deleteRequest } = useAPIMutation({
    ...deleteOidcAuthProviderMutation(),
    successNotification: "Provider deleted successfully",
    errorNotification: "Provider deletion failed",
  });

  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      title="Are you sure?"
      onConfirm={() => deleteRequest({ path: { id: providerId } })}
      confirmBtnText="Delete"
      confirmBtnPalette="red"
    >
      This action cannot be undone. This will permanently delete this provider.
    </ConfirmModal>
  );
}
