import { Badge } from "@chakra-ui/react";
import {
  fromDate,
  getLocalTimeZone,
  toCalendarDate,
} from "@internationalized/date";

export function TokenExpiresIndicator({
  date,
  isExpired,
}: {
  date: Date;
  isExpired: boolean;
}) {
  const dateFormatted = toCalendarDate(
    fromDate(date, getLocalTimeZone()),
  ).toString();

  if (isExpired) {
    return <Badge colorPalette="red">{dateFormatted}</Badge>;
  }
  return <Badge colorPalette="green">{dateFormatted}</Badge>;
}
