import {
  type SearchKeyDef,
  type SearchTokenData,
} from "@/components/ui/searchBar";
import { showErrorNotification } from "@/components/ui/toaster";
import { useSearchParamMulti, type ParamState } from "@/hooks/url";
import { useCallback, useMemo } from "react";

/** Resolved URL state for a set of array-valued search param keys. */
export type UrlSearchParamState<K extends string> = ParamState<
  Record<K, { type: "array" }>
>;

export function useUrlSearchParams<const K extends string>(keys: readonly K[]) {
  const paramDef = useMemo(
    () =>
      keys.reduce(
        (acc, key) => ({ ...acc, [key]: { type: "array" } }),
        {} as Record<K, { type: "array" }>,
      ),
    [keys],
  );

  const [searchParams, setSearchParams] = useSearchParamMulti(paramDef);

  const tokens = useMemo(() => {
    return Object.entries(
      searchParams as unknown as Record<string, string[]>,
    ).flatMap(([key, val]): SearchTokenData[] => {
      if (key == "text")
        return val.map((item) => ({ type: "text", value: item }));

      return val.map((item) => ({ type: "filter", key, value: item }));
    });
  }, [searchParams]);

  const setTokens = useCallback(
    (tokens: SearchTokenData[]) => {
      const values: Record<string, string[]> = Object.fromEntries(
        Object.keys(paramDef).map((k) => [k, []]),
      );

      for (const token of tokens) {
        const key = token.key ?? token.type;
        if (key in values) values[key].push(token.value);
        else values[key] = [token.value];
      }
      setSearchParams(values as ParamState<Record<K, { type: "array" }>>);
    },
    [setSearchParams, paramDef],
  );

  return { searchParams, tokens, setTokens };
}

export type SearchFilterDef = SearchKeyDef & { isSingleUse?: boolean };

export function useUrlSearchBar<const K extends string>(props: {
  items: Record<K, SearchFilterDef>;
}) {
  const { items } = props;

  const searchParamDef = useMemo(() => Object.keys(items) as K[], [items]);

  const {
    tokens,
    setTokens: setTokensRaw,
    searchParams,
  } = useUrlSearchParams(searchParamDef);

  const activeKeys = useMemo(() => {
    const usedKeys = new Set(tokens.map((t) => t.key ?? t.type));
    return Object.fromEntries(
      Object.entries(items as Record<string, SearchFilterDef>).filter(
        ([key, def]) => !def.isSingleUse || !usedKeys.has(key),
      ),
    );
  }, [items, tokens]);

  const setSafeTokens = useCallback(
    (next: SearchTokenData[]) => {
      const seen = new Set<string>();
      let blocked = false;
      const filtered = next.filter((t) => {
        const key = t.key ?? t.type;
        const def = (items as Record<string, SearchFilterDef>)[key];
        if (def?.isSingleUse) {
          if (seen.has(key)) {
            blocked = true;
            return false;
          }
          seen.add(key);
        }
        return true;
      });
      if (blocked) {
        showErrorNotification("This filter can only be used once");
      }
      setTokensRaw(filtered);
    },
    [items, setTokensRaw],
  );

  return {
    searchParams,
    activeKeys,
    tokens,
    setSafeTokens,
  };
}
