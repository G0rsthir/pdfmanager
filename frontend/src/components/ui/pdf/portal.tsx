import { Portal } from "@chakra-ui/react";
import { createContext, use } from "react";

const ViewerPortalContext =
  createContext<React.RefObject<HTMLElement | null> | null>(null);

export function ViewerPortalProvider(props: {
  container: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) {
  const { container, children } = props;

  return (
    <ViewerPortalContext value={container}>{children}</ViewerPortalContext>
  );
}

export function ViewerPortal({ children }: { children: React.ReactNode }) {
  const container = use(ViewerPortalContext);

  return <Portal container={container ?? undefined}>{children}</Portal>;
}
