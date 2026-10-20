import { Box, Stack, Table } from "@chakra-ui/react";
import {
  DEFAULT_TABLE_FRAME_VARIANT,
  TableFrameContext,
  useTableFrameCss,
  type TableFrameVariant,
} from "./frame-context";

/**
 * ```tsx
 * <TableFrame>
 *   <TableToolbar>
 *     <DebouncedSearchInput … />
 *   </TableToolbar>
 *   <SimpleTable … />
 * </TableFrame>
 * ```
 */
export function TableFrame(props: {
  variant?: TableFrameVariant;
  children: React.ReactNode;
}) {
  const { variant = DEFAULT_TABLE_FRAME_VARIANT, children } = props;

  return (
    <TableFrameContext value={variant}>
      {variant == "workspace" ? (
        <Box
          bg="bg.panel"
          borderWidth="1px"
          rounded="l3"
          shadow="sm"
          overflow="hidden"
        >
          {children}
        </Box>
      ) : (
        <Stack gap={6}>{children}</Stack>
      )}
    </TableFrameContext>
  );
}

export function SimpleTable(
  props: Omit<Table.RootProps, "css"> & {
    rowHover?: boolean;
  },
) {
  const { rowHover = true, ...rootProps } = props;

  const frameCss = useTableFrameCss(rowHover);

  return (
    <Box overflowX="auto">
      <Table.Root {...rootProps} css={frameCss} />
    </Box>
  );
}
