import { useAuth } from "@/common/auth/hooks";
import { GenericIconButton } from "@/components/ui/button";
import {
  Avatar,
  Group,
  HStack,
  Menu,
  Portal,
  Stack,
  Text,
} from "@chakra-ui/react";
import { LuSettings } from "react-icons/lu";

export function UserProfileHeader() {
  const { session, logout } = useAuth();

  return (
    <Group gap="3" justify="space-between">
      <HStack gap="3" minW="0">
        <Avatar.Root>
          <Avatar.Fallback name={session?.user.name} />
        </Avatar.Root>
        <Stack gap="0" minW="0">
          <Text fontSize="sm" fontWeight="medium" truncate>
            {session?.user.name}
          </Text>
          <Text fontSize="xs" color="fg.muted" truncate>
            {session?.user.email}
          </Text>
        </Stack>
      </HStack>
      <Menu.Root>
        <Menu.Trigger asChild>
          <GenericIconButton variant="ghost" size="xs" aria-label="User menu">
            <LuSettings />
          </GenericIconButton>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content>
              <Menu.Item
                value="logout"
                color="fg.error"
                _hover={{ bg: "bg.error", color: "fg.error" }}
                onClick={() => logout()}
              >
                Log out
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    </Group>
  );
}
