import {
  createPersonalApiKeyMutation,
  listPersonalApiKeysOptions,
  resetPersonalApiKeyMutation,
  revokePersonalApiKeyMutation,
} from "@/api/@tanstack/react-query.gen";
import type { ApiKeyResponse } from "@/api/types.gen";
import { parseAPIError } from "@/common/error";
import { expiryDatePresets } from "@/common/format";
import { GenericIconButton } from "@/components/ui/button";
import { Block } from "@/components/ui/display";
import { FormError } from "@/components/ui/error";
import { QueryView } from "@/components/ui/feedback";
import { FormModal } from "@/components/ui/form/modal";
import { ConfirmModal } from "@/components/ui/modal";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@/components/ui/toaster";
import { AccessScopeEnum } from "@/config/const";
import { useFormMutation } from "@/hooks/form";
import { useAPIMutation, useAPIQuery } from "@/hooks/query";
import { Empty } from "@/pages/shared/common";
import { useGlobalStore } from "@/store";
import {
  Alert,
  Badge,
  Button,
  Clipboard,
  DataList,
  Field,
  Group,
  Heading,
  Input,
  InputGroup,
  List,
  Menu,
  Portal,
  RadioCard,
  Stack,
  Table,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import {
  getLocalTimeZone,
  today,
  type DateValue,
} from "@internationalized/date";
import { useState } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import { LuCircleDashed, LuKeyRound, LuPlus } from "react-icons/lu";
import { useShallow } from "zustand/shallow";
import { TokenExpiresIndicator } from "../shared/badges";
import { ApiKeyResultDialog, ResetApiKeyDialog } from "../shared/dialogs";
import { ExpiryDateSelect, ScopeSelect } from "../shared/selects";

type KeyType = "standard" | "opds";

export function SecurityContent() {
  return (
    <Block bg="bg.panel">
      <Stack gap={8}>
        <OpdsSection />
        <ApiKeysSection />
      </Stack>
    </Block>
  );
}

function OpdsSection() {
  return (
    <Stack gap={4}>
      <Stack gap={1}>
        <Heading size="md" fontWeight="normal">
          OPDS
        </Heading>
        <Text color="fg.muted" fontSize="sm">
          Browse and download your library from any e-reader app
        </Text>
      </Stack>

      <DataList.Root
        orientation="horizontal"
        size="md"
        divideY="1px"
        borderWidth="1px"
        borderColor="border"
        rounded="md"
      >
        <DataList.Item py={3} px={4}>
          <DataList.ItemLabel minW="24">Catalog URL</DataList.ItemLabel>
          <DataList.ItemValue>
            <OpdsURL />
          </DataList.ItemValue>
        </DataList.Item>
        <DataList.Item py={3} px={4}>
          <DataList.ItemLabel minW="24">Username</DataList.ItemLabel>
          <DataList.ItemValue color="fg.muted">
            Any value - it is ignored
          </DataList.ItemValue>
        </DataList.Item>
        <DataList.Item py={3} px={4}>
          <DataList.ItemLabel minW="24">Password</DataList.ItemLabel>
          <DataList.ItemValue color="fg.muted">
            An API key from below
          </DataList.ItemValue>
        </DataList.Item>
      </DataList.Root>

      <Text fontSize="xs" color="fg.muted">
        Tested with KOReader, Thorium and Moon+ Reader
      </Text>
    </Stack>
  );
}

function ApiKeysSection() {
  const query = useAPIQuery({ ...listPersonalApiKeysOptions() });

  return (
    <Stack gap={4}>
      <Group justify="space-between" align="start">
        <Stack gap={1}>
          <Heading size="md" fontWeight="normal">
            API Keys / OPDS
          </Heading>
          <Text color="fg.muted" fontSize="sm">
            Personal keys act on your behalf. Treat them like passwords
          </Text>
        </Stack>
        <CreateKeyAction />
      </Group>

      <QueryView query={query}>
        {(data) => <ApiKeysTable apiKeys={data} />}
      </QueryView>
    </Stack>
  );
}

function CreateKeyAction() {
  const { open, onClose, onOpen } = useDisclosure();

  return (
    <>
      <Button size="sm" onClick={onOpen}>
        <LuPlus /> New Key
      </Button>
      <CreatePersonalApiKeyDialog open={open} onClose={onClose} />
    </>
  );
}

function ApiKeysTable({ apiKeys }: { apiKeys: ApiKeyResponse[] }) {
  if (apiKeys.length == 0)
    return <Empty icon={<LuKeyRound />} title="No keys yet" />;

  return (
    <Table.Root size="md" variant="outline">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>Description</Table.ColumnHeader>
          <Table.ColumnHeader>Permissions</Table.ColumnHeader>
          <Table.ColumnHeader>Expires</Table.ColumnHeader>
          <Table.ColumnHeader textAlign="end">Actions</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {apiKeys.map((key) => (
          <Table.Row key={key.id}>
            <Table.Cell>{key.description}</Table.Cell>
            <Table.Cell>
              <Group wrap="wrap" gap={1}>
                {key.scopes.map((scope) => (
                  <Badge key={scope} variant="subtle" colorPalette="purple">
                    {scope}
                  </Badge>
                ))}
              </Group>
            </Table.Cell>
            <Table.Cell>
              <TokenExpiresIndicator
                date={key.expires_at}
                isExpired={key.is_expired}
              />
            </Table.Cell>
            <Table.Cell textAlign="end">
              <TableRowActions apiKey={key} />
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}

function CreatePersonalApiKeyDialog(props: {
  open: boolean;
  onClose: () => void;
}) {
  const { open, onClose } = props;

  const [keyType, setKeyType] = useState<KeyType>("standard");

  const { form, mutation } = useFormMutation({
    formOptions: {
      defaultValues: {
        description: "",
        expires_at: [] as DateValue[],
        scopes: [] as string[],
      },
    },
    mutationOptions: createPersonalApiKeyMutation,
    onMutate: (value) => {
      if (keyType == "opds")
        return {
          body: {
            description: value.description,
            scopes: [AccessScopeEnum.USER_READ],
            expires_at: today(getLocalTimeZone())
              .add({ years: 10 })
              .toDate(getLocalTimeZone()),
          },
        };

      return {
        body: {
          ...value,
          expires_at: value.expires_at?.[0].toDate(getLocalTimeZone()),
        },
      };
    },
  });

  const handleClose = () => {
    setKeyType("standard");
    form.reset();
    onClose();
    mutation.reset();
  };

  if (mutation.isSuccess)
    return (
      <ApiKeyResultDialog
        title={keyType == "opds" ? "OPDS Token" : "API Token"}
        open={open}
        onClose={handleClose}
        data={mutation.data}
      />
    );

  return (
    <FormModal
      open={open}
      close={handleClose}
      title="New API Key"
      onSubmit={() => form.handleSubmit()}
      confirmBtnText="Create"
      confirmBtnType="userWrite"
      size="lg"
    >
      <form.Field
        name="description"
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root invalid={!fieldState.meta.isValid} required>
            <Field.Label>
              Description <Field.RequiredIndicator />
            </Field.Label>
            <Input
              value={fieldState.value}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="What is this key for?"
              onBlur={handleBlur}
            />
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />

      <RadioCard.Root
        value={keyType}
        onValueChange={(e) => setKeyType(e.value as KeyType)}
        size="sm"
      >
        <RadioCard.Label>Key type</RadioCard.Label>
        <Group attached orientation="horizontal" grow>
          <RadioCard.Item value="standard" cursor="pointer">
            <RadioCard.ItemHiddenInput />
            <RadioCard.ItemControl>
              <RadioCard.ItemContent>
                <RadioCard.ItemText>Standard</RadioCard.ItemText>
                <RadioCard.ItemDescription>
                  Full API access with permissions you choose
                </RadioCard.ItemDescription>
              </RadioCard.ItemContent>
              <RadioCard.ItemIndicator />
            </RadioCard.ItemControl>
          </RadioCard.Item>
          <RadioCard.Item value="opds" cursor="pointer">
            <RadioCard.ItemHiddenInput />
            <RadioCard.ItemControl>
              <RadioCard.ItemContent>
                <RadioCard.ItemText>OPDS</RadioCard.ItemText>
                <RadioCard.ItemDescription>
                  Read-only, for e-reader apps
                </RadioCard.ItemDescription>
              </RadioCard.ItemContent>
              <RadioCard.ItemIndicator />
            </RadioCard.ItemControl>
          </RadioCard.Item>
        </Group>
      </RadioCard.Root>

      {keyType == "opds" && (
        <Alert.Root status="info" variant="subtle">
          <Alert.Indicator />
          <Stack gap={1}>
            <Alert.Title>Created with defaults</Alert.Title>
            <Alert.Description>
              Read-only access to your library and long expiry, so your reader
              keeps working. Nothing else to configure
            </Alert.Description>
          </Stack>
        </Alert.Root>
      )}

      {keyType == "standard" ? (
        <PersonalApiKeyForm FormField={form.Field} />
      ) : (
        <OpdsInstructions />
      )}

      <FormError errors={form.state.errorMap.onSubmit} />
    </FormModal>
  );
}

interface ExpiryDateSelectField {
  state: { value: DateValue[]; meta: { isValid: boolean; errors?: string } };
  handleChange: (value: DateValue[]) => void;
  handleBlur: () => void;
}

interface ScopesSelectField {
  state: { value: string[]; meta: { isValid: boolean; errors?: string } };
  handleChange: (value: string[]) => void;
  handleBlur: () => void;
}

export function PersonalApiKeyForm(props: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  FormField: React.FC<any>;
}) {
  const { FormField } = props;

  const userScopes = useGlobalStore(
    useShallow((state) => state.session?.user.role.scopes ?? []),
  );

  return (
    <>
      <FormField
        name="expires_at"
        validators={{
          onChange: ({ value }: { value: DateValue[] }) =>
            value.length == 0 ? "Date is required" : undefined,
        }}
        children={({
          state: fieldState,
          handleChange,
          handleBlur,
        }: ExpiryDateSelectField) => (
          <Field.Root invalid={!fieldState.meta.isValid} required>
            <Field.Label>
              Expiry Date <Field.RequiredIndicator />
            </Field.Label>
            <Field.Context>
              {(ctx) => (
                <ExpiryDateSelect
                  onValueChange={(details) => handleChange(details.value)}
                  onBlur={handleBlur}
                  required
                  value={fieldState.value}
                  invalid={ctx.invalid}
                  presets={expiryDatePresets}
                  ids={{
                    label: () => ctx.ids.label,
                    input: () => ctx.ids.control,
                  }}
                />
              )}
            </Field.Context>

            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />

      <FormField
        name="scopes"
        validators={{
          onChange: ({ value }: { value: string[] }) =>
            !value ? "At least one permission is required" : undefined,
        }}
        children={({
          state: fieldState,
          handleChange,
          handleBlur,
        }: ScopesSelectField) => (
          <Field.Root invalid={!fieldState.meta.isValid} required>
            <Field.Label>
              Permissions <Field.RequiredIndicator />
            </Field.Label>
            <ScopeSelect
              scopes={userScopes}
              onValueChange={handleChange}
              onBlur={handleBlur}
              required
              value={fieldState.value}
            />
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />
    </>
  );
}

function OpdsURL() {
  const opdsURL = useGlobalStore(
    useShallow((state) => state.appState?.opds_url ?? ""),
  );

  return (
    <Clipboard.Root value={opdsURL} w="full">
      <InputGroup
        endElement={
          <Clipboard.Trigger asChild>
            <GenericIconButton
              size="xs"
              variant="ghost"
              me="-2"
              aria-label="Copy catalog URL"
            >
              <Clipboard.Indicator />
            </GenericIconButton>
          </Clipboard.Trigger>
        }
      >
        <Clipboard.Input asChild>
          <Input readOnly fontSize="sm" variant="subtle" />
        </Clipboard.Input>
      </InputGroup>
    </Clipboard.Root>
  );
}

export function OpdsInstructions() {
  return (
    <Stack gap={3} borderWidth="1px" borderColor="border" rounded="md" p={4}>
      <Text fontWeight="medium">Using this key in a reader</Text>

      <OpdsURL />

      <List.Root gap={1} fontSize="sm" color="fg.muted" variant="plain">
        <List.Item>
          <List.Indicator asChild color="green.500">
            <LuCircleDashed />
          </List.Indicator>
          Add the catalog URL above in your reader (KOReader, Thorium, Foliate,
          Moon+ Reader)
        </List.Item>
        <List.Item>
          <List.Indicator asChild color="green.500">
            <LuCircleDashed />
          </List.Indicator>
          Username: anything - it is ignored
        </List.Item>
        <List.Item>
          <List.Indicator asChild color="green.500">
            <LuCircleDashed />
          </List.Indicator>
          Password: this key
        </List.Item>
      </List.Root>

      <Text fontSize="xs" color="fg.muted">
        The key grants read access to your whole library. Revoke it here if a
        device is lost
      </Text>
    </Stack>
  );
}

type RowAction = "revoke" | "reset" | null;

function TableRowActions({ apiKey }: { apiKey: ApiKeyResponse }) {
  const [dialog, setDialog] = useState<RowAction>(null);
  const onClose = () => setDialog(null);

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
              <Menu.Item value="reset" onSelect={() => setDialog("reset")}>
                Reset
              </Menu.Item>
              <Menu.Item
                value="revoke"
                color="fg.error"
                _hover={{ bg: "bg.error", color: "fg.error" }}
                onSelect={() => setDialog("revoke")}
              >
                Revoke
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
      <RevokeApiKeyDialog
        open={dialog == "revoke"}
        onClose={onClose}
        keyId={apiKey.id}
      />
      <ResetApiKeyDialog
        open={dialog == "reset"}
        onClose={onClose}
        keyId={apiKey.id}
        confirmBtnType="userWrite"
        mutationOptions={resetPersonalApiKeyMutation}
      />
    </>
  );
}

export function RevokeApiKeyDialog(props: {
  open: boolean;
  onClose: () => void;
  keyId: string;
}) {
  const { open, onClose, keyId } = props;

  const { mutate: remokeRequest } = useAPIMutation({
    ...revokePersonalApiKeyMutation(),
    onSuccess() {
      showSuccessNotification("Token revoked successfully");
      onClose();
    },
    onError(error) {
      onClose();
      showErrorNotification(
        "Token revoketion failed",
        parseAPIError(error).message,
      );
    },
  });

  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      title="Are you sure?"
      onConfirm={() => remokeRequest({ path: { id: keyId } })}
      confirmBtnText="Revoke"
      confirmBtnPalette="red"
      confirmBtnType="userWrite"
    >
      This action cannot be undone. This will revoke token
    </ConfirmModal>
  );
}
