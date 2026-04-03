import { EmptyState, VStack } from "@chakra-ui/react";

export function Empty(props: {
  title: React.ReactNode;
  icon: React.ReactNode;
}) {
  const { title, icon } = props;

  return (
    <EmptyState.Root bg="bg.subtle">
      <EmptyState.Content>
        <EmptyState.Indicator>{icon}</EmptyState.Indicator>
        <VStack textAlign="center">
          <EmptyState.Title fontWeight="normal">{title}</EmptyState.Title>
        </VStack>
      </EmptyState.Content>
    </EmptyState.Root>
  );
}
