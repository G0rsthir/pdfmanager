import { listApiKeysOptions } from "@/api/@tanstack/react-query.gen";
import type { ApiKeyResponse } from "@/api/types.gen";
import { GenericIconButton } from "@/components/ui/button";
import { QueryView } from "@/components/ui/feedback";
import { useAPIQuery } from "@/hooks/query";
import {
  Alert,
  Badge,
  Button,
  Group,
  Heading,
  Menu,
  Portal,
  Stack,
  Table,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { useState } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import { LuKeyRound, LuPlus } from "react-icons/lu";
import {
  CreateApiKeyDialog,
  ResetApiKeyDialog,
  RevokeApiKeyDialog,
} from "./forms";

import { Empty } from "@/pages/shared/common";
import {
  fromDate,
  getLocalTimeZone,
  toCalendarDate,
} from "@internationalized/date";

export function ApiKeysPage() {
  const query = useAPIQuery({
    ...listApiKeysOptions(),
  });

  return (
    <Stack gap={6}>
      <Group justify="space-between" align="center">
        <Heading size="2xl" fontWeight="normal">
          API Keys
        </Heading>
        <CreateApiKeyAction />
      </Group>
      <Alert.Root status="info" variant="subtle">
        <Alert.Indicator />
        <Stack gap={1}>
          <Alert.Title>Keys are bound to a user</Alert.Title>
          <Alert.Description>
            Each key inherits state of the user it was issued to. Disabling or
            deleting the user also disables every key they own.
          </Alert.Description>
        </Stack>
      </Alert.Root>
      <QueryView query={query}>
        {(data) => <ApiKeysView apiKeys={data} />}
      </QueryView>
    </Stack>
  );
}

function CreateApiKeyAction() {
  const { open, onClose, onOpen } = useDisclosure();

  return (
    <>
      <Button size="sm" onClick={onOpen}>
        <LuPlus /> Add Key
      </Button>
      <CreateApiKeyDialog open={open} onClose={onClose} />
    </>
  );
}

function ApiKeysView({ apiKeys }: { apiKeys: ApiKeyResponse[] }) {
  if (apiKeys.length == 0)
    return <Empty icon={<LuKeyRound />} title="No keys yet." />;

  return (
    <Table.Root size="md">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>Description</Table.ColumnHeader>
          <Table.ColumnHeader>User</Table.ColumnHeader>
          <Table.ColumnHeader>Expires</Table.ColumnHeader>
          <Table.ColumnHeader>Scopes</Table.ColumnHeader>
          <Table.ColumnHeader textAlign="end">Actions</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {apiKeys.map((key) => (
          <Table.Row key={key.id}>
            <Table.Cell>{key.description}</Table.Cell>
            <Table.Cell>
              <Text>{key.user?.email}</Text>
            </Table.Cell>
            <Table.Cell>
              <TokenExpiresIndicator
                date={key.expires_at}
                isExpired={key.is_expired}
              />
            </Table.Cell>
            <Table.Cell>
              <Group>
                {key.scopes.map((item) => (
                  <Badge key={item} variant="subtle" colorPalette="purple">
                    {item}
                  </Badge>
                ))}
              </Group>
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

export function TokenExpiresIndicator({
  date,
  isExpired,
}: {
  date: Date;
  isExpired: boolean;
}) {
  const dateFormatted = toCalendarDate(
    fromDate(date, getLocalTimeZone()),
  ).toString();

  if (isExpired) {
    return <Badge colorPalette="red">{dateFormatted}</Badge>;
  }
  return <Badge colorPalette="green">{dateFormatted}</Badge>;
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
      />
    </>
  );
}
