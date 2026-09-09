import { ReactNavLink } from "@/components/ui/navlink";
import { Box, Flex, Heading, Separator, Stack, Text } from "@chakra-ui/react";
import {
  LuClipboardList,
  LuFingerprint,
  LuKeyRound,
  LuNavigation,
  LuShieldCheck,
  LuUsers,
} from "react-icons/lu";
import { Outlet } from "react-router";

export function AdminLayout() {
  return (
    <Stack padding={6} gap={6} h="100vh">
      <Stack gap={1}>
        <Heading size="3xl" fontWeight="normal">
          Administration
        </Heading>
        <Text color="fg.muted">
          Manage identity, authentication, and settings
        </Text>
      </Stack>

      <Flex gap={4} overflow="hidden" flexGrow={1}>
        <Stack as="nav" width="180px" flexShrink={0} gap={1}>
          <ReactNavLink label="Users" to="/admin/users" icon={<LuUsers />} />
          <ReactNavLink
            label="Roles"
            to="/admin/roles"
            icon={<LuShieldCheck />}
          />
          <ReactNavLink
            label="Auth Providers"
            to="/admin/providers"
            icon={<LuFingerprint />}
          />
          <Separator />
          <Text color="fg.muted" letterSpacing="wider" px={2} pt={2}>
            API
          </Text>

          <ReactNavLink
            label="Docs"
            to="/admin/api-docs"
            icon={<LuNavigation />}
          />
          <ReactNavLink
            label="Keys"
            to="/admin/api-keys"
            icon={<LuKeyRound />}
          />

          <Text color="fg.muted" letterSpacing="wider" px={2} pt={2}>
            Tools
          </Text>
          <ReactNavLink
            label="Tasks"
            to="/admin/tasks"
            icon={<LuClipboardList />}
          />
        </Stack>
        <Separator orientation="vertical" />
        <Box flexGrow={1} overflowY="auto">
          <Outlet />
        </Box>
      </Flex>
    </Stack>
  );
}
