import { APIError, parseAPIError, parseFormError } from "@/utils/error";
import {
  type DefaultError,
  QueryClient,
  type QueryKey,
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";

export function useAPIQuery<
  TQueryFnData,
  TData = TQueryFnData,
  TError = DefaultError,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
): UseQueryResult<TData, TError> & { apiError: APIError | null } {
  const query = useQuery({ ...options });

  return {
    ...query,
    apiError: query.isError ? parseAPIError(query.error) : null,
  };
}

export function useAPIMutation<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TOnMutateResult = unknown,
>(
  options: UseMutationOptions<TData, TError, TVariables, TOnMutateResult> & {
    // Allows to automatically update form errors using api response
    setErrorMap?: (errorMap: Record<string, unknown>) => void;
  },
  queryClient?: QueryClient,
): UseMutationResult<TData, TError, TVariables, TOnMutateResult> {
  const opt: UseMutationOptions<TData, TError, TVariables, TOnMutateResult> = {
    ...options,
    onError: (error, variables, onMutateResult, context) => {
      options.onError?.(error, variables, onMutateResult, context);
      if (options.setErrorMap) {
        const formErrors = parseFormError(error);
        options.setErrorMap({
          onSubmit: formErrors,
        });
      }
    },
  };

  return useMutation(opt, queryClient);
}
