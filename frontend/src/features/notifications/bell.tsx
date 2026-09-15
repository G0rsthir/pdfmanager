import { GenericCloseButton, GenericIconButton } from "@/components/ui/button";
import {
  Button,
  Circle,
  Float,
  HStack,
  Icon,
  Popover,
  Portal,
  Stack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { LuBell } from "react-icons/lu";
import { NavLink } from "react-router";
import { describeNotification } from "./content";
import { useNotifications, type AppNotification } from "./hooks";

export function NotificationBell() {
  const { open, onToggle } = useDisclosure();

  const { unread, markRead } = useNotifications();
  const count = unread.length;

  return (
    <Popover.Root
      open={open}
      onOpenChange={onToggle}
      positioning={{ placement: "right-end" }}
    >
      <Popover.Trigger asChild>
        <GenericIconButton variant="ghost" size="xs" position="relative">
          <LuBell />

          {count > 0 && (
            <Float offset="1">
              <Circle size="3" bg="red" color="white">
                {count > 9 ? "9+" : count}
              </Circle>
            </Float>
          )}
        </GenericIconButton>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content width="xs">
            <Popover.Header>
              <Popover.Title fontWeight="semibold">Notifications</Popover.Title>
            </Popover.Header>
            <Popover.Body>
              {count == 0 ? (
                <Text textStyle="sm" color="fg.muted">
                  You're all caught up
                </Text>
              ) : (
                <Stack gap="3">
                  {unread.map((notification) => (
                    <NotificationRow
                      key={notification.type}
                      notification={notification}
                      onOpen={onToggle}
                      onMarkRead={() => markRead(notification)}
                    />
                  ))}
                </Stack>
              )}
            </Popover.Body>
            <Popover.Footer>
              <Button
                asChild
                variant="ghost"
                size="sm"
                colorPalette="gray"
                w="full"
              >
                <NavLink to="/notifications" onClick={onToggle}>
                  View all notifications
                </NavLink>
              </Button>
            </Popover.Footer>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}

function NotificationRow(props: {
  notification: AppNotification;
  onOpen: () => void;
  onMarkRead: () => void;
}) {
  const { notification, onOpen, onMarkRead } = props;

  const { icon, title, description } = describeNotification(notification);

  return (
    <HStack align="start" gap="3">
      <Icon color="fg.muted" mt="0.5">
        {icon}
      </Icon>
      <Stack gap="0.5" flex="1">
        <NavLink to="/notifications" onClick={onOpen}>
          <Text
            textStyle="sm"
            fontWeight="medium"
            _hover={{ color: "colorPalette.fg" }}
            transition="color 0.2s"
          >
            {title}
          </Text>
        </NavLink>
        <Text textStyle="xs" color="fg.muted">
          {description}
        </Text>
      </Stack>
      <GenericCloseButton onClick={onMarkRead} size="2xs" />
    </HStack>
  );
}
