import { Alert, Box, Group, HStack, Link, Stack, Text } from "@chakra-ui/react";
import { useLocation, useNavigate } from "react-router";

/**
 * This can be used to show form errors that are returned from the API and are not field validation errors.
 * By default, it looks for the "form" field. This field is automatically set using the parseFormError function.
 */
export function FormError(props: {
  errors?: Record<string, React.ReactNode>;
  errorField?: string;
}) {
  const { errors, errorField = "form", ...other } = props;

  const errorMessage = errors?.[errorField];
  if (!errorMessage) return null;

  return (
    <Alert.Root status="error" {...other}>
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{errorMessage}</Alert.Title>
      </Alert.Content>
    </Alert.Root>
  );
}

interface UnrecoverableErrorProps {
  description?: string;
  children?: React.ReactNode;
  errorCode?: React.ReactNode;
  title?: React.ReactNode;
}

export function UnrecoverableError(props: UnrecoverableErrorProps) {
  const { description, title, errorCode } = props;

  const navigate = useNavigate();
  const location = useLocation();

  const isLastLocationExists = location.key !== "default";

  return (
    <Box>
      <Text fontWeight="normal" textStyle="lg" color="blue.600">
        {errorCode}
      </Text>
      <Stack>
        <Text fontWeight={700} textStyle="2xl" w="40vw">
          {title}
        </Text>
        {description && (
          <Text color="red" width="40vw">
            {description}
          </Text>
        )}

        <Text textStyle="lg" mt="3rem">
          Here are some helpful links:
        </Text>
        <Group>
          <Link
            onClick={() =>
              isLastLocationExists ? navigate(-1) : navigate("/")
            }
            variant="underline"
          >
            Return
          </Link>
        </Group>
      </Stack>
    </Box>
  );
}

export function ErrorScreen(props: UnrecoverableErrorProps) {
  const { description, title, errorCode } = props;

  return (
    <HStack h="100vh" mx="15rem">
      <UnrecoverableError
        description={description}
        title={title}
        errorCode={errorCode}
      />
    </HStack>
  );
}

interface ApplicationErrorProps {
  description?: string;
  children?: React.ReactNode;
}

export function ApplicationError({
  description,
  children,
}: ApplicationErrorProps) {
  return (
    <ErrorScreen
      errorCode="500 Internal Server Error"
      title="An unexpected error has occurred"
      description={description}
    >
      {children}
    </ErrorScreen>
  );
}

export function LoadingError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;

  return (
    <Alert.Root status="error">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>
          An unexpected error occurred while loading data
        </Alert.Title>
        <Alert.Description>{children}</Alert.Description>
      </Alert.Content>
    </Alert.Root>
  );
}

interface ForbiddenErrorProps {
  description?: string;
}

export function ForbiddenError({ description }: ForbiddenErrorProps) {
  return (
    <HStack h="full" mx="15rem">
      <UnrecoverableError
        errorCode="403 Forbidden"
        title="We are sorry, but you don't have the required permissions to access this page"
        description={description}
      />
    </HStack>
  );
}
