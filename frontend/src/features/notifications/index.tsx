import { Empty } from "@/components/ui/display";
import { QueryView } from "@/components/ui/feedback";
import {
  Badge,
  Button,
  Card,
  Group,
  Heading,
  HStack,
  Icon,
  Stack,
} from "@chakra-ui/react";
import { LuBellOff, LuCheck, LuCheckCheck } from "react-icons/lu";
import { describeNotification } from "./content";
import { DuplicateFilesDetails } from "./duplicates";
import { useNotifications, type AppNotification } from "./hooks";

export function NotificationsPage() {
  const { query, notifications, unread, isRead, markRead } = useNotifications();

  return (
    <QueryView query={query}>
      {() => (
        <Stack gap={6}>
          <Group justify="space-between" align="center">
            <Heading size="3xl" fontWeight="normal">
              Notifications
            </Heading>

            {unread.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                colorPalette="gray"
                onClick={() => markRead(...unread)}
              >
                <LuCheckCheck />
                Mark all as read
              </Button>
            )}
          </Group>

          {notifications.length == 0 && (
            <Empty
              icon={<LuBellOff />}
              title="You're all caught up. Notifications will appear here when something needs your attention"
            />
          )}

          {notifications.map((notification) => (
            <NotificationCard
              key={notification.type}
              notification={notification}
              read={isRead(notification)}
              onMarkRead={() => markRead(notification)}
            />
          ))}
        </Stack>
      )}
    </QueryView>
  );
}

function NotificationCard(props: {
  notification: AppNotification;
  read: boolean;
  onMarkRead: () => void;
}) {
  const { notification, read, onMarkRead } = props;

  const { icon, title, description } = describeNotification(notification);

  return (
    <Card.Root variant="outline">
      <Card.Header>
        <Group justify="space-between" align="start" gap="4">
          <HStack gap="3" align="start">
            <Icon size="lg" color="fg.muted" mt="0.5">
              {icon}
            </Icon>
            <Stack gap="1">
              <HStack gap="2">
                <Card.Title>{title}</Card.Title>
                {!read && (
                  <Badge size="sm" colorPalette="red">
                    New
                  </Badge>
                )}
              </HStack>
              <Card.Description>{description}</Card.Description>
            </Stack>
          </HStack>

          {!read && (
            <Button
              size="xs"
              variant="ghost"
              colorPalette="orange"
              onClick={onMarkRead}
            >
              <LuCheck />
              Mark as read
            </Button>
          )}
        </Group>
      </Card.Header>
      <Card.Body>
        <NotificationDetails notification={notification} />
      </Card.Body>
    </Card.Root>
  );
}

function NotificationDetails({
  notification,
}: {
  notification: AppNotification;
}) {
  switch (notification.type) {
    case "duplicate_files":
      return <DuplicateFilesDetails />;
  }
}
