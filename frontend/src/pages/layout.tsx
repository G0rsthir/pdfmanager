import { Box, Flex, Separator, Stack, Text } from "@chakra-ui/react";
import { Outlet } from "react-router";
import { Library } from "./sidebar/library";
import { Overview } from "./sidebar/overview";
import { UserProfileHeader } from "./sidebar/profile";

export function Layout() {
  return (
    <Flex h="100vh">
      <Stack
        as="nav"
        position="sticky"
        top="0"
        h="100vh"
        w="1/6"
        flexShrink={0}
        bg="bg.panel"
        borderRightWidth="1px"
        justify="space-between"
        p="4"
      >
        <Stack gap="4" overflow="auto">
          <Text fontWeight="bold" fontSize="lg">
            PDF Manager
          </Text>
          <Stack gap="1">
            <Overview />
            <Library />
          </Stack>
        </Stack>
        <Stack gap="2">
          <Separator />
          <UserProfileHeader />
        </Stack>
      </Stack>
      <Box as="main" flex="1">
        <Outlet />
      </Box>
    </Flex>
  );
}
