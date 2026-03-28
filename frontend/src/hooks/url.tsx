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
