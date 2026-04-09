import type { APIError } from "@/common/error";
import {
  Center,
  Spinner,
  Text,
  VStack,
  type CenterProps,
} from "@chakra-ui/react";
import type { ReactNode } from "react";
import { LoadingError } from "./error";

export function AppLoadingOverlay() {
  return (
    <Center h="100vh">
      <VStack>
        <Spinner size="lg" color="fg.muted" />
        <Text colorPalette="fg.muted">Loading...</Text>
      </VStack>
    </Center>
  );
}

export function ContentLoadingOverlay(
  props: CenterProps & React.RefAttributes<HTMLDivElement>,
) {
  const { ref, ...other } = props;

  return (
    <Center ref={ref} p="4" {...other}>
      <Spinner size="lg" color="fg.muted" />
    </Center>
  );
}

interface QueryViewProps<T> {
  query: {
    isLoading: boolean;
    isError: boolean;
    isSuccess: boolean;
    data: T | undefined;
    apiError: APIError | null;
  };
  children: (data: T) => ReactNode;
}

export function QueryView<T>({ query, children }: QueryViewProps<T>) {
  if (query.isError)
    return <LoadingError>{query.apiError?.message}</LoadingError>;
  if (query.isLoading) return <ContentLoadingOverlay />;
  if (query.isSuccess && query.data !== undefined) return children(query.data);
  return null;
}

/**
 * TODO: Write proper generic types
 */
interface MultiQueryViewProps {
  queries: QueryViewProps<unknown>["query"][];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: (data: (any | undefined)[]) => ReactNode;
}

export function MultiQueryView({ queries, children }: MultiQueryViewProps) {
  const error = queries.find((query) => query.isError);
  if (error) return <LoadingError>{error.apiError?.message}</LoadingError>;

  if (queries.some((query) => query.isLoading))
    return <ContentLoadingOverlay />;

  if (queries.every((query) => query.isSuccess && query.data !== undefined)) {
    return children(queries.map((query) => query.data));
  }

  return null;
}
