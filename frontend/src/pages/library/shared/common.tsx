import { Card, Stack } from "@chakra-ui/react";

export function CardEmpty({ children }: { children: React.ReactNode }) {
  return (
    <Card.Root variant="subtle">
      <Card.Body>
        <Stack align="center" gap={2} py={6}>
          {children}
        </Stack>
      </Card.Body>
    </Card.Root>
  );
}
