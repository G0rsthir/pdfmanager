import {
  Box,
  Flex,
  Group,
  Icon,
  Input,
  Kbd,
  Popover,
  Portal,
  Stack,
  Text,
  type BoxProps,
} from "@chakra-ui/react";
import { useCallback, useMemo, useRef, useState } from "react";
import { LuSearch, LuX } from "react-icons/lu";

export interface SearchKeyDef {
  label: string;
  values: string[];
}

export interface SearchTokenData {
  type: "text" | "filter";
  key?: string;
  value: string;
}

interface Suggestion {
  label: string;
  completion: string;
  description?: string;
}

type InputContext =
  | { mode: "key"; partial: string }
  | { mode: "value"; key: string; partial: string }
  | { mode: "text"; partial: string };

function parseInputContext(
  input: string,
  keyNames: string[],
  keys: Record<string, SearchKeyDef>,
): InputContext {
  const colonIdx = input.lastIndexOf(":");
  if (colonIdx == -1) {
    const trimmed = input.trimStart();
    const matchesKey = keyNames.some(
      (k) => k.startsWith(trimmed.toLowerCase()) && trimmed.length > 0,
    );
    if (matchesKey && !trimmed.includes(" ")) {
      return { mode: "key", partial: trimmed };
    }
    return { mode: "text", partial: input };
  }

  const key = input.slice(0, colonIdx).trimStart().toLowerCase();
  if (key in keys) {
    return { mode: "value", key, partial: input.slice(colonIdx + 1) };
  }

  return { mode: "text", partial: input };
}

function getSuggestions(
  ctx: InputContext,
  keyNames: string[],
  keys: Record<string, SearchKeyDef>,
): Suggestion[] {
  switch (ctx.mode) {
    case "key": {
      const lower = ctx.partial.toLowerCase();
      return keyNames
        .filter((k) => k.startsWith(lower))
        .map((k) => ({
          label: `${k}:`,
          completion: `${k}:`,
          description: keys[k].label,
        }));
    }
    case "value": {
      const lower = ctx.partial.toLowerCase();
      const keyDef = keys[ctx.key];
      if (!keyDef) return [];
      return keyDef.values
        .filter((v) => v.toLowerCase().includes(lower))
        .map((v) => ({
          label: v,
          completion: `${ctx.key}:${v}`,
          description: keyDef.label,
        }));
    }
    case "text":
      if (!ctx.partial.trim()) {
        return keyNames.map((k) => ({
          label: `${k}:`,
          completion: `${k}:`,
          description: keys[k].label,
        }));
      }
      return [];
  }
}

function parseTokenFromInput(
  input: string,
  keys: Record<string, SearchKeyDef>,
): SearchTokenData | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const colonIdx = trimmed.indexOf(":");
  if (colonIdx > 0) {
    const key = trimmed.slice(0, colonIdx).toLowerCase();
    const value = trimmed.slice(colonIdx + 1);
    if (key in keys && value) {
      return { type: "filter", key, value };
    }
  }

  return { type: "text", value: trimmed };
}

export function SearchBar(props: {
  keys: Record<string, SearchKeyDef>;
  placeholder?: string;
  defaultValues?: SearchTokenData[];
  value?: SearchTokenData[];
  onSearch: (tokens: SearchTokenData[]) => void;
}) {
  const {
    keys,
    defaultValues = [],
    value,
    placeholder = "Search files...",
    onSearch,
  } = props;

  const keyNames = useMemo(() => Object.keys(keys), [keys]);

  const isControlled = value !== undefined;
  const [internalTokens, setInternalTokens] = useState<SearchTokenData[]>(
    defaultValues ?? [],
  );

  const tokens = isControlled ? value : internalTokens;
  const setTokens = isControlled ? onSearch : setInternalTokens;

  const [input, setInput] = useState("");
  const highlightIdx = useRef(0);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /**
   * Currently, list navigation is implemented using native JS for performance reasons.
   * In the future, if list state management is required, move the list to a separate JSX component.
   */
  const updateHighlight = useCallback((idx: number) => {
    const list = listRef.current;
    if (!list) return;
    const items = list.children;
    for (let i = 0; i < items.length; i++) {
      const el = items[i] as HTMLElement;
      el.dataset.highlighted = i == idx ? "true" : "false";
    }
    items[idx]?.scrollIntoView({ block: "nearest" });
    highlightIdx.current = idx;
  }, []);

  const ctx = useMemo(
    () => parseInputContext(input, keyNames, keys),
    [input, keyNames, keys],
  );
  const suggestions = useMemo(
    () => getSuggestions(ctx, keyNames, keys),
    [ctx, keyNames, keys],
  );

  const commitToken = useCallback(
    (text?: string) => {
      const token = parseTokenFromInput(text ?? input, keys);
      if (token) {
        inputRef.current?.blur();
        setPopoverOpen(false);
        const next = [...tokens, token];
        setTokens(next);
        setInput("");
      }
    },
    [input, tokens, keys, setTokens],
  );

  const removeLastToken = useCallback(() => {
    if (input || tokens.length == 0) return false;
    const next = tokens.slice(0, -1);
    setTokens(next);
    return true;
  }, [input, tokens, setTokens]);

  const acceptSuggestion = useCallback(
    (suggestion: Suggestion) => {
      if (suggestion.completion.endsWith(":")) {
        setInput(suggestion.completion);
        updateHighlight(0);
        setPopoverOpen(true);
        inputRef.current?.focus();
      } else {
        commitToken(suggestion.completion);
      }
    },
    [commitToken, updateHighlight],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key == "Tab" && suggestions.length > 0) {
      e.preventDefault();
      acceptSuggestion(suggestions[highlightIdx.current]);
      return;
    }

    if (e.key == "Enter") {
      e.preventDefault();
      if (suggestions.length > 0 && popoverOpen) {
        acceptSuggestion(suggestions[highlightIdx.current]);
      } else if (input.trim()) {
        commitToken();
      }
      return;
    }

    if (e.key == "Backspace" && !input && tokens.length > 0) {
      if (pendingDelete) {
        removeLastToken();
        setPendingDelete(false);
      } else {
        setPendingDelete(true);
      }
      return;
    }

    if (pendingDelete) {
      setPendingDelete(false);
    }

    if (e.key == "ArrowDown") {
      e.preventDefault();
      updateHighlight(
        Math.min(highlightIdx.current + 1, suggestions.length - 1),
      );
      return;
    }

    if (e.key == "ArrowUp") {
      e.preventDefault();
      updateHighlight(Math.max(highlightIdx.current - 1, 0));
      return;
    }

    if (e.key == "Escape") {
      setPopoverOpen(false);
      return;
    }
  };

  const handleTokenEdit = useCallback(
    (token: SearchTokenData, idx: number) => {
      const text =
        token.type == "filter" ? `${token.key}:${token.value}` : token.value;
      const next = tokens.filter((_, i) => i != idx);
      setTokens(next);
      setInput(text);
      setPopoverOpen(true);
      inputRef.current?.focus();
    },
    [setTokens, tokens],
  );

  const handleTokenRemove = useCallback(
    (idx: number) => {
      const next = tokens.filter((_, i) => i != idx);
      setTokens(next);
    },
    [setTokens, tokens],
  );

  return (
    <Popover.Root
      open={popoverOpen && suggestions.length > 0}
      autoFocus={false}
      closeOnInteractOutside
      positioning={{ sameWidth: true, placement: "bottom-start" }}
    >
      <Popover.Anchor asChild>
        <Flex
          alignItems="center"
          flexWrap="wrap"
          gap={2}
          w="full"
          borderWidth="2px"
          borderColor="border"
          rounded="md"
          px={3}
          py={1.5}
          cursor="text"
          onClick={() => inputRef.current?.focus()}
          _focusWithin={{
            borderColor: "colorPalette.500",
          }}
        >
          <Icon color="fg.muted">
            <LuSearch />
          </Icon>
          {tokens.map((token, idx) => (
            <SearchToken
              key={idx}
              token={token}
              isPending={pendingDelete && idx == tokens.length - 1 && !input}
              onEdit={() => handleTokenEdit(token, idx)}
              onRemove={() => handleTokenRemove(idx)}
            />
          ))}
          <Input
            ref={inputRef}
            variant="flushed"
            borderBottom="none"
            _focus={{ boxShadow: "none" }}
            size="sm"
            flex="1"
            minW="120px"
            placeholder={tokens.length == 0 ? placeholder : ""}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              updateHighlight(0);
              setPopoverOpen(true);
              if (pendingDelete) setPendingDelete(false);
            }}
            onFocus={() => setPopoverOpen(true)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              // Blur Event must be delayed
              requestAnimationFrame(() => {
                if (!inputRef.current?.contains(document.activeElement)) {
                  setPopoverOpen(false);
                }
              });
            }}
          />
        </Flex>
      </Popover.Anchor>

      <Portal>
        <Popover.Positioner>
          <Popover.Content
            width="full"
            p={1}
            onPointerDown={(e) => e.preventDefault()}
          >
            <Stack gap={0} ref={listRef} maxH="240px" overflowY="auto">
              {suggestions.map((suggest, i) => (
                <Flex
                  key={suggest.completion}
                  data-highlighted={i == 0 ? "true" : "false"}
                  px={3}
                  py={1.5}
                  rounded="sm"
                  cursor="pointer"
                  _hover={{ bg: "bg.emphasized" }}
                  css={{
                    '&[data-highlighted="true"]': { bg: "bg.emphasized" },
                  }}
                  onClick={() => acceptSuggestion(suggest)}
                  justifyContent="space-between"
                  alignItems="center"
                  gap={4}
                >
                  <Group gap={2}>
                    <Text textStyle="sm" fontWeight="medium">
                      {suggest.label}
                    </Text>
                    {suggest.description && (
                      <Text textStyle="xs" color="fg.muted">
                        {suggest.description}
                      </Text>
                    )}
                  </Group>
                  <Kbd
                    size="sm"
                    display="none"
                    css={{
                      '[data-highlighted="true"] > &': {
                        display: "flex",
                      },
                    }}
                  >
                    Tab
                  </Kbd>
                </Flex>
              ))}
            </Stack>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}

function TokenLabel(props: BoxProps) {
  return (
    <Box
      px={1.5}
      py={0.5}
      _hover={{ bg: "bg.emphasized" }}
      transition="background 0.15s"
      {...props}
    >
      {props.children}
    </Box>
  );
}

function SearchToken(props: {
  token: SearchTokenData;
  isPending?: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { token, isPending, onEdit, onRemove } = props;

  return (
    <Flex
      alignItems="center"
      rounded="sm"
      overflow="hidden"
      cursor="pointer"
      onClick={onEdit}
      fontSize="sm"
      lineHeight="1"
      borderWidth="1px"
      borderColor={isPending ? "gray" : "transparent"}
      transition="border-color 0.15s"
      bg="bg.muted"
    >
      {token.type == "filter" ? (
        <>
          <TokenLabel color="fg.muted">{token.key}:</TokenLabel>
          <TokenLabel>{token.value}</TokenLabel>
        </>
      ) : (
        <TokenLabel>{token.value}</TokenLabel>
      )}
      <Box
        as="button"
        px={1}
        py={0.5}
        cursor="pointer"
        color="fg.muted"
        _hover={{ color: "red.500" }}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <LuX size={12} />
      </Box>
    </Flex>
  );
}
