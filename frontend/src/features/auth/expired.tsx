import {
  Button,
  Card,
  Center,
  Container,
  Heading,
  Icon,
  Stack,
  Text,
} from "@chakra-ui/react";
import { LuShieldAlert } from "react-icons/lu";
import { useNavigate } from "react-router";

export function SessionExpiredPage() {
  const navigate = useNavigate();

  const handleSignIn = () => {
    navigate("/login", { replace: true });
  };

  return (
    <Center h="100vh">
      <Container maxW="md">
        <Card.Root padding="8">
          <Card.Body>
            <Stack gap={4} align="center" textAlign="center">
              <Icon size="2xl" color="fg.muted">
                <LuShieldAlert />
              </Icon>
              <Heading size="2xl">Session expired</Heading>
              <Text color="fg.muted">
                Your session has expired. Please sign in again to continue.
              </Text>
            </Stack>
          </Card.Body>
          <Card.Footer>
            <Button w="full" onClick={handleSignIn}>
              Sign in
            </Button>
          </Card.Footer>
        </Card.Root>
      </Container>
    </Center>
  );
}
