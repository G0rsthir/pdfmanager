import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

type ParamType = "string" | "array";

export type ParamDef = { type?: ParamType };

type ParamValue<T extends ParamDef> = T["type"] extends "array"
  ? string[]
  : string | undefined;

export type ParamState<T extends Record<string, ParamDef>> = {
  [K in keyof T]: ParamValue<T[K]>;
};

type ParamUpdate<T extends Record<string, ParamDef>> = Partial<ParamState<T>>;

/**
 * Hook to manage multiple search parameters in the URL.
 */
export function useSearchParamMulti<T extends Record<string, ParamDef>>(
  schema: T,
): [
  ParamState<T>,
  (values: ParamUpdate<T>, options?: { replace?: boolean }) => void,
] {
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo(() => {
    const result: Record<string, unknown> = {};
    for (const [key, def] of Object.entries(schema)) {
      result[key] =
        def.type == "array"
          ? searchParams.getAll(key)
          : (searchParams.get(key) ?? undefined);
    }
    return result as ParamState<T>;
  }, [searchParams, schema]);

  const update = useCallback(
    (values: ParamUpdate<T>, options?: { replace?: boolean }) => {
      setSearchParams(
        () => {
          const params = new URLSearchParams(window.location.search);

          for (const [key, value] of Object.entries(values)) {
            params.delete(key);

            if (value == null || value === "") continue;

            if (Array.isArray(value)) {
              for (const v of value) params.append(key, v);
            } else {
              params.set(key, value as string);
            }
          }

          return params;
        },
        { replace: options?.replace ?? true },
      );
    },
    [setSearchParams],
  );

  return [state, update];
}

export function usePagination({
  defaultSize = 10,
}: { defaultSize?: number } = {}) {
  const [params, setParams] = useSearchParamMulti({
    page_index: { type: "string" },
    page_size: { type: "string" },
  });

  const page_index = Math.max(Number(params.page_index) || 1, 1);
  const page_size = Math.max(Number(params.page_size) || defaultSize, 1);

  const setPage = (
    next: { page_index?: number; page_size?: number },
    options: { replace: boolean } = { replace: false },
  ) => {
    const newPageIndex =
      next.page_index != null
        ? String(Math.max(next.page_index, 1))
        : params.page_index;
    const newPageSize =
      next.page_size != null
        ? String(Math.max(next.page_size, 1))
        : params.page_size;

    setParams(
      {
        page_index: newPageIndex,
        page_size: newPageSize,
      },
      options,
    );
  };

  return [{ page_index, page_size }, setPage] as const;
}
