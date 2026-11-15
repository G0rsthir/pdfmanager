import { Alert, Box, Group, HStack, Link, Stack, Text } from "@chakra-ui/react";
import { useLocation, useNavigate } from "react-router";

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
              isLastLocationExists ? void navigate(-1) : void navigate("/")
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
