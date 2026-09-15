import {
  listNotificationsOptions,
  listNotificationsQueryKey,
} from "@/api/@tanstack/react-query.gen";
import type { ListNotificationsResponse } from "@/api/types.gen";
import { queryClient } from "@/config/query";
import { useAPIQuery } from "@/hooks/query";
import { useGlobalStore } from "@/store";
import { useEffect } from "react";
import { useShallow } from "zustand/shallow";

export type AppNotification = ListNotificationsResponse[number];

export function useNotifications() {
  const query = useAPIQuery({
    ...listNotificationsOptions(),
    meta: {
      skipInvalidation: true,
    },
  });

  const [readNotifications, markNotificationsRead] = useGlobalStore(
    useShallow((state) => [
      state.readNotifications,
      state.markNotificationsRead,
    ]),
  );

  const pruneReadNotifications = useGlobalStore(
    (state) => state.pruneReadNotifications,
  );

  // Temp solution while notifications don't have persistent storage
  useEffect(() => {
    if (query.data) pruneReadNotifications(query.data.map((item) => item.type));
  }, [query.data, pruneReadNotifications]);

  const notifications = query.data ?? [];

  const isRead = (notification: AppNotification) => {
    return notification.count == (readNotifications[notification.type] ?? 0);
  };

  const unread = notifications.filter((notification) => !isRead(notification));

  const markRead = (...items: AppNotification[]) => {
    queryClient.invalidateQueries({
      queryKey: listNotificationsQueryKey(),
    });

    markNotificationsRead(
      Object.fromEntries(items.map((item) => [item.type, item.count])),
    );
  };

  return { query, notifications, unread, isRead, markRead };
}
