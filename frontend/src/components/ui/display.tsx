import {
  Box,
  Field,
  Grid,
  GridItem,
  Stack,
  Text,
  type BoxProps,
} from "@chakra-ui/react";

export function Block(props: BoxProps & React.RefAttributes<HTMLDivElement>) {
  const { ref, children, ...other } = props;

  return (
    <Box ref={ref} p="6" {...other}>
      {children}
    </Box>
  );
}

export interface SettingsOptionProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  required?: boolean;
  labelSpan?: number;
  fieldSpan?: number;
  children: React.ReactNode;
}

export function SettingsOption(props: SettingsOptionProps) {
  const {
    title,
    description,
    required,
    children,
    labelSpan = 6,
    fieldSpan = 6,
  } = props;

  return (
    <Grid templateColumns="repeat(12, 1fr)">
      <GridItem colSpan={labelSpan}>
        <Stack gap={0}>
          <Text fontWeight="bold">
            {title} {required && <Field.RequiredIndicator />}
          </Text>
          <Text color="fg.muted" fontSize="md">
            {description}
          </Text>
        </Stack>
      </GridItem>
      <GridItem colSpan={fieldSpan}>{children}</GridItem>
    </Grid>
  );
}
