import { LuFiles } from "react-icons/lu";
import type { AppNotification } from "./hooks";

export function describeNotification(notification: AppNotification): {
  icon: React.ReactNode;
  title: string;
  description: string;
} {
  switch (notification.type) {
    case "duplicate_files":
      return {
        icon: <LuFiles />,
        title: "Duplicate files",
        description:
          notification.group_count == 1
            ? `${notification.count} copies of the same file`
            : `${notification.count} copies of ${notification.group_count} different files`,
      };
  }
}
