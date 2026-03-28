import { MutationCache, QueryClient } from "@tanstack/react-query";

interface MutationMetaMeta extends Record<string, unknown> {
  /** Whether to invalidate queries. Defaults to true */
  invalidateQueries: boolean;
}

interface QueryMetaMeta extends Record<string, unknown> {
  /** Skip when global invalidateQueries is called */
  skipInvalidation?: boolean;
}

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: MutationMetaMeta;
    queryMeta: QueryMetaMeta;
  }
}

// Tanstack query config
export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: (_data, _variables, _context, mutation) => {
      if (!(mutation.options.meta?.invalidateQueries ?? true)) return;
      queryClient.invalidateQueries({
        predicate: (query) => query.meta?.skipInvalidation != true,
      });
    },
  }),
});
