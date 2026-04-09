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

export function LogoutPage() {
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
              <Heading size="2xl">Logged out</Heading>
              <Text color="fg.muted">
                You have been logged out successfully
              </Text>
            </Stack>
          </Card.Body>
          <Card.Footer>
            <Button w="full" onClick={handleSignIn}>
              Log in again
            </Button>
          </Card.Footer>
        </Card.Root>
      </Container>
    </Center>
  );
}
