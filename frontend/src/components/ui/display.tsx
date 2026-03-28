import { Box, type BoxProps } from "@chakra-ui/react";

export function Block(props: BoxProps & React.RefAttributes<HTMLDivElement>) {
  const { ref, children, ...other } = props;

  return (
    <Box ref={ref} p="6" {...other}>
      {children}
    </Box>
  );
}
