import { ReactNavLink } from "@/components/ui/navlink";
import { Box, Group, Icon, Text } from "@chakra-ui/react";
import { LuSearch } from "react-icons/lu";
import { useNavigate } from "react-router";

export function Overview() {
  return (
    <Box mb={10}>
      <SearchLink />
      <Text fontWeight="semibold" mb="2" mt="4">
        Overview
      </Text>
      <ReactNavLink label="Favorites" to="/favorites" />
      <ReactNavLink label="Tags" to="/tags" />
    </Box>
  );
}

function SearchLink() {
  const navigate = useNavigate();

  return (
    <Group
      as="button"
      onClick={() => navigate("/search")}
      w="full"
      px="3"
      py="2"
      rounded="md"
      border="1px solid"
      borderColor="border"
      cursor="pointer"
      _hover={{ bg: "bg.muted" }}
      transition="background 0.15s"
      gap="2"
    >
      <Icon color="fg.muted">
        <LuSearch size={14} />
      </Icon>
      <Text textStyle="sm" color="fg.muted">
        Search...
      </Text>
    </Group>
  );
}
