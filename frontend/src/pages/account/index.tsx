import { useAuth } from "@/common/auth/hooks";
import { Heading, Stack, Tabs, Text } from "@chakra-ui/react";
import { LuCircleUser, LuSlidersVertical } from "react-icons/lu";
import { PreferencesContent } from "./preferences";
import { ProfileContent } from "./profile";

export function CurrentUserAccountPage() {
  const { session } = useAuth();

  return (
    <Stack gap={6}>
      <Stack>
        <Heading size="3xl" fontWeight="normal">
          {session?.user.name}
        </Heading>
        <Text color="fg.muted" truncate>
          Manage your account settings and preferences
        </Text>
      </Stack>

      <Tabs.Root defaultValue="profile">
        <Tabs.List>
          <Tabs.Trigger value="profile">
            <LuCircleUser />
            Profile
          </Tabs.Trigger>
          <Tabs.Trigger value="preferences">
            <LuSlidersVertical />
            Preferences
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="preferences">
          <PreferencesContent />
        </Tabs.Content>
        <Tabs.Content value="profile">
          <ProfileContent />
        </Tabs.Content>
      </Tabs.Root>
    </Stack>
  );
}
