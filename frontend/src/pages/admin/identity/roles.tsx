import { listRolesOptions } from "@/api/@tanstack/react-query.gen";
import type { RoleResponse } from "@/api/types.gen";
import { QueryView } from "@/components/ui/feedback";
import { ScopesEnum } from "@/config/const";
import { useAPIQuery } from "@/hooks/query";
import { Card, Group, Heading, Stack, Tag, Text, Wrap } from "@chakra-ui/react";
import { LuCheck, LuX } from "react-icons/lu";

export function RolesPage() {
  const query = useAPIQuery({
    ...listRolesOptions(),
  });

  return (
    <Stack gap={6}>
      <Group justify="space-between" align="center">
        <Heading size="2xl" fontWeight="normal">
          Roles
        </Heading>
      </Group>
      <QueryView query={query}>
        {(data) => <RolesView roles={data} />}
      </QueryView>
    </Stack>
  );
}

function RolesView({ roles }: { roles: RoleResponse[] }) {
  return (
    <Stack gap={4}>
      {roles.map((role) => (
        <RoleCard key={role.id} role={role} />
      ))}
    </Stack>
  );
}

function RoleCard({ role }: { role: RoleResponse }) {
  return (
    <Card.Root>
      <Card.Body>
        <Stack gap={4}>
          <Group justify="space-between" align="center">
            <Text fontSize="lg">{role.name}</Text>
            <Text color="fg.muted" fontSize="sm">
              {role.description}
            </Text>
          </Group>
          <ScopesList scopeList={role.scope_list} />
        </Stack>
      </Card.Body>
    </Card.Root>
  );
}

function ScopesList({ scopeList }: { scopeList: string[] }) {
  const allScopes = Object.values(ScopesEnum);

  return (
    <Wrap gap={4}>
      {allScopes.map((scope) => {
        const active = scopeList.includes(scope);

        return (
          <Tag.Root
            size="sm"
            key={scope}
            colorPalette={active ? "green" : "gray"}
            variant="surface"
          >
            <Tag.StartElement color={active ? "" : "fg.subtle"}>
              {active ? <LuCheck /> : <LuX />}
            </Tag.StartElement>
            <Tag.Label color={active ? "" : "fg.subtle"}>{scope}</Tag.Label>
          </Tag.Root>
        );
      })}
    </Wrap>
  );
}
