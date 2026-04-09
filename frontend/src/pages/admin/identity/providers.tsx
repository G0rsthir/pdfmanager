import {
  createOidcAuthProviderMutation,
  deleteOidcAuthProviderMutation,
  getOidcAuthProviderOptions,
  listAuthProvidersOptions,
  listRolesOptions,
  updateOidcAuthProviderMutation,
} from "@/api/@tanstack/react-query.gen";
import { listOidcAuthProviders } from "@/api/sdk.gen";
import type {
  AuthProviderOidcResponse,
  AuthProviderResponse,
  OidcGroupRuleInput,
  RoleResponse,
} from "@/api/types.gen";
import { parseAPIError } from "@/common/error";
import { AdminWriteButton, GenericIconButton } from "@/components/ui/button";
import { SettingsOption } from "@/components/ui/display";
import { FormError } from "@/components/ui/error";
import { MultiQueryView, QueryView } from "@/components/ui/feedback";
import { Form } from "@/components/ui/form/container";
import { FormModal } from "@/components/ui/form/modal";
import { ConfirmModal } from "@/components/ui/modal";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@/components/ui/toaster";
import { useFormMutation } from "@/hooks/form";
import { useAPIMutation, useAPIQuery } from "@/hooks/query";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Field,
  Group,
  HStack,
  Heading,
  Icon,
  Input,
  Menu,
  Portal,
  Select,
  Separator,
  Stack,
  Switch,
  Text,
  createListCollection,
  useDisclosure,
} from "@chakra-ui/react";
import { useCallback, useMemo, useRef } from "react";
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
}) {
  const { provider, onClose, roles } = props;

  const shouldRedirect = useRef(false);

  const {
    Field: FormField,
    handleSubmit,
    state,
  } = useFormMutation({
    formOptions: {
      defaultValues: {
        name: provider.name,
        auto_discovery_url: provider.auto_discovery_url,
        client_id: provider.client_id,
        client_secret: provider.client_secret,
        group_claim_name: provider.group_claim_name,
        auto_login: provider.auto_login,
        is_enabled: provider.is_enabled,
        group_claim_rules: provider.group_claim_rules,
      },
    },
    mutationOptions: updateOidcAuthProviderMutation,
    onMutate: (value) => ({ body: value, path: { id: provider.id } }),
    successMessage: "Provider updated successfully",
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
    handleSubmit();
  }, [handleSubmit]);

  return (
    <>
      <Form onSubmit={handleSubmit}>
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
            <FormField
              name="name"
              children={({ state: fieldState, handleChange, handleBlur }) => (
                <Field.Root invalid={!fieldState.meta.isValid} required>
                  <Input
                    size="sm"
                    value={fieldState.value}
                    onChange={(e) => handleChange(e.target.value)}
                    onBlur={handleBlur}
                  />
                  <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
                </Field.Root>
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
            <FormField
              name="auto_discovery_url"
              children={({ state: fieldState, handleChange, handleBlur }) => (
                <Field.Root invalid={!fieldState.meta.isValid} required>
                  <Input
                    value={fieldState.value}
                    onChange={(e) => handleChange(e.target.value)}
                    onBlur={handleBlur}
                    size="sm"
                    placeholder="https://auth.example.com/application/.well-known/openid-configuration"
                  />
                  <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
                </Field.Root>
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
            <FormField
              name="client_id"
              children={({ state: fieldState, handleChange, handleBlur }) => (
                <Field.Root invalid={!fieldState.meta.isValid} required>
                  <Input
                    size="sm"
                    value={fieldState.value}
                    onChange={(e) => handleChange(e.target.value)}
                    onBlur={handleBlur}
                  />
                  <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
                </Field.Root>
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
            <FormField
              name="client_secret"
              children={({ state: fieldState, handleChange, handleBlur }) => (
                <Field.Root invalid={!fieldState.meta.isValid} required>
                  <Input
                    size="sm"
                    value={fieldState.value}
                    onChange={(e) => handleChange(e.target.value)}
                    onBlur={handleBlur}
                    type="password"
                  />
                  <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
                </Field.Root>
              )}
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
            <FormField
              name="group_claim_name"
              children={({ state: fieldState, handleChange, handleBlur }) => (
                <Field.Root invalid={!fieldState.meta.isValid} required>
                  <Input
                    value={fieldState.value}
                    onChange={(e) => handleChange(e.target.value)}
                    onBlur={handleBlur}
                  />
                  <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
                </Field.Root>
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
            <GroupRulesEditor FormField={FormField} roles={roles} />
          </Stack>
          <Separator />

          <SettingsOption
            title="Enabled"
            labelSpan={4}
            fieldSpan={8}
            fontWeight="normal"
          >
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
                  </Switch.Root>
                  <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
                </Field.Root>
              )}
            />
          </SettingsOption>

          <SettingsOption
            title="Auto Login"
            description="Automatically redirect to this provider on the login page, skipping provider selection"
            labelSpan={4}
            fieldSpan={8}
            fontWeight="normal"
          >
            <FormField
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
              children={({ state: fieldState, handleChange, handleBlur }) => (
                <Field.Root invalid={!fieldState.meta.isValid}>
                  <Switch.Root
                    checked={fieldState.value}
                    onCheckedChange={({ checked }) => handleChange(checked)}
                  >
                    <Switch.HiddenInput onBlur={handleBlur} />
                    <Switch.Control />
                  </Switch.Root>
                  <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
                </Field.Root>
              )}
            />
          </SettingsOption>
          <FormError errors={state.errorMap.onSubmit} />
          <Group justifyContent="flex-end">
            <AdminWriteButton
              size="sm"
              variant="solid"
              colorPalette="cyan"
              onClick={testConnection}
            >
              Save & Test Authentication
            </AdminWriteButton>
            <Button
              size="sm"
              variant="surface"
              colorPalette="gray"
              onClick={onClose}
            >
              Cancel
            </Button>
            <AdminWriteButton type="submit" size="sm">
              Save
            </AdminWriteButton>
          </Group>
        </Stack>
      </Form>
    </>
  );
}

/**
 * More info https://tanstack.com/form/latest/docs/framework/react/guides/arrays
 */
function GroupRulesEditor(props: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  FormField: React.FC<any>;
  roles: RoleResponse[];
}) {
  const { FormField, roles } = props;

  const roleList = useMemo(() => {
    return createListCollection({
      items: roles ?? [],
      itemToString: (role) => role.name,
      itemToValue: (role) => role.id,
    });
  }, [roles]);

  return (
    <FormField
      name="group_claim_rules"
      mode="array"
      children={(field: {
        state: { value: OidcGroupRuleInput[] };
        pushValue: (value: OidcGroupRuleInput) => void;
        insertValue: (index: number, value: OidcGroupRuleInput) => void;
        removeValue: (index: number) => void;
      }) => (
        <Stack gap={3}>
          {field.state.value.map((_rule: OidcGroupRuleInput, i: number) => (
            <HStack key={i} gap={3}>
              <FormField
                name={`group_claim_rules[${i}].group`}
                validators={{
                  onChange: ({ value }: { value: string }) =>
                    !value ? "Group name is required" : undefined,
                }}
                children={(subField: {
                  state: { value: string; meta: { isValid: boolean } };
                  handleChange: (value: string) => void;
                  handleBlur: () => void;
                }) => (
                  <Field.Root invalid={!subField.state.meta.isValid}>
                    <Input
                      placeholder="Group name"
                      value={subField.state.value}
                      onChange={(e) => subField.handleChange(e.target.value)}
                      onBlur={subField.handleBlur}
                    />
                  </Field.Root>
                )}
              />
              <FormField
                name={`group_claim_rules[${i}].role_id`}
                validators={{
                  onChange: ({ value }: { value: string }) =>
                    !value ? "Role is required" : undefined,
                }}
                children={(subField: {
                  state: { value: string; meta: { isValid: boolean } };
                  handleChange: (value: string) => void;
                  handleBlur: () => void;
                }) => (
                  <Field.Root invalid={!subField.state.meta.isValid}>
                    <Select.Root
                      collection={roleList}
                      onValueChange={(e) => subField.handleChange(e.value?.[0])}
                      required
                      onInteractOutside={subField.handleBlur}
                      value={subField.state.value ? [subField.state.value] : []}
                    >
                      <Select.HiddenSelect />
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
                            {roleList.items.map((role) => (
                              <Select.Item item={role} key={role.id}>
                                {role.name}
                                <Select.ItemIndicator />
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Positioner>
                      </Portal>
                    </Select.Root>
                  </Field.Root>
                )}
              />
              <Icon
                cursor="pointer"
                color="fg.muted"
                _hover={{ color: "fg.error" }}
                onClick={() => field.removeValue(i)}
              >
                <LuMinus />
              </Icon>
              <Icon
                cursor="pointer"
                color="fg.muted"
                _hover={{ color: "fg" }}
                onClick={() =>
                  field.insertValue(i + 1, { group: "", role_id: "" })
                }
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

  return (
    <>
      <Button size="sm" onClick={onOpen}>
        <LuPlus /> Add Provider
      </Button>
      <CreateOidcProviderDialog open={open} onClose={onClose} />
    </>
  );
}

function CreateOidcProviderDialog(props: {
  open: boolean;
  onClose: () => void;
}) {
  const { open, onClose } = props;

  const {
    Field: FormField,
    handleSubmit,
    state,
    reset,
  } = useFormMutation({
    formOptions: {
      defaultValues: {
        name: "",
      },
    },
    mutationOptions: createOidcAuthProviderMutation,
    onMutate: (value) => ({ body: value }),
    successMessage: "Auth provider created",
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
      title="Create OIDC provider"
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
      <FormError errors={state.errorMap.onSubmit} />
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
    onSuccess() {
      showSuccessNotification("Provider deleted successfully");
      onClose();
    },
    onError(error) {
      showErrorNotification(
        "Provider deletion failed",
        parseAPIError(error).message,
      );
    },
  });

  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      title="Are you sure?"
      onConfirm={() => deleteRequest({ path: { id: providerId } })}
      confirmBtnText="Delete"
      confirmBtnPalette="red"
      confirmBtnType="adminWrite"
    >
      This action cannot be undone. This will permanently delete this provider.
    </ConfirmModal>
  );
}
