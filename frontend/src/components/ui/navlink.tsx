import { Stack } from "@chakra-ui/react";
import { NavLink, type NavLinkProps } from "react-router";

interface NavLinksProps extends NavLinkProps {
  label: string;
}

export function ReactNavLink({ to, label, ...rest }: NavLinksProps) {
  return (
    <Stack
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
      _currentPage={{ color: "colorPalette.300", bg: "colorPalette.900" }}
    >
      <NavLink to={to} {...rest}>
        {label}
      </NavLink>
    </Stack>
  );
}
