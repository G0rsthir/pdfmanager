import { Portal } from "@chakra-ui/react";
import { createContext, use } from "react";
import { TooltipIconButton } from "../button";
import { Tooltip, type TooltipProps } from "../tooltip";

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

export function ViewerTooltip(props: TooltipProps) {
  const container = use(ViewerPortalContext);

  return <Tooltip portalRef={container ?? undefined} {...props} />;
}

export function ViewerIconButton(
  props: React.ComponentProps<typeof TooltipIconButton>,
) {
  const { tooltipProps, ...other } = props;
  const container = use(ViewerPortalContext);

  return (
    <TooltipIconButton
      variant="ghost"
      tooltipProps={{ portalRef: container ?? undefined, ...tooltipProps }}
      {...other}
    />
  );
}
