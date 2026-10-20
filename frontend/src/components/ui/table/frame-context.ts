import type { SystemStyleObject } from "@chakra-ui/react";
import { createContext, use } from "react";

export type TableFrameVariant = "plain" | "workspace";

export const DEFAULT_TABLE_FRAME_VARIANT: TableFrameVariant = "workspace";

export const TableFrameContext = createContext<TableFrameVariant | null>(null);

export function useTableFrameVariant() {
  return use(TableFrameContext);
}

const WORKSPACE_TABLE: SystemStyleObject = {
  "& > tbody > tr": { bg: "transparent" },
  "& > thead > tr": { bg: "bg.muted" },
  "& > thead th": {
    color: "fg.muted",
    fontSize: "xs",
    textTransform: "uppercase",
    letterSpacing: "wider",
  },
  // The frame's footer or bottom border draws the line under the last row
  "& > tbody > tr:last-of-type > td": { borderBottomWidth: 0 },
};

const WORKSPACE_ROW_HOVER: SystemStyleObject = {
  "& > tbody > tr:hover": { bg: "bg.muted" },
};

export function useTableFrameCss(rowHover: boolean) {
  return useTableFrameVariant() == "workspace"
    ? { ...WORKSPACE_TABLE, ...(rowHover && WORKSPACE_ROW_HOVER) }
    : undefined;
}
