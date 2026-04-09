import { HStack, Icon, Text } from "@chakra-ui/react";
import { NavLink, type NavLinkProps } from "react-router";

interface NavLinksProps extends NavLinkProps {
  label: string;
  icon?: React.ReactNode;
}

export function ReactNavLink(props: NavLinksProps) {
  const { to, label, icon, ...rest } = props;
  return (
    <HStack
      asChild
      py={1}
      px={3}
      transition="all 0.3s"
      borderRadius="sm"
      color="fg.muted"
      css={{
        "&:hover:not([aria-current])": {
          background: "bg.muted",
          color: "fg",
        },
      }}
      _currentPage={{ color: "colorPalette.600", bg: "colorPalette.200" }}
      _dark={{
        _currentPage: { color: "colorPalette.300", bg: "colorPalette.900" },
      }}
    >
      <NavLink to={to} {...rest}>
        {icon && <Icon>{icon}</Icon>}
        <Text>{label}</Text>
      </NavLink>
    </HStack>
  );
}
