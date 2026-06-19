import {
  listAnnotationLabelsOptions,
  listTagsOptions,
  searchFilesOptions,
} from "@/api/@tanstack/react-query.gen";
import type {
  FileSearchResponse,
  SearchHitResponse,
  TagResponse,
} from "@/api/types.gen";
import { MultiQueryView, QueryView } from "@/components/ui/feedback";
import {
  SearchBar,
  type SearchKeyDef,
  type SearchTokenData,
} from "@/components/ui/searchBar";
import { showErrorNotification } from "@/components/ui/toaster";
import { useAPIQuery } from "@/hooks/query";
import { useSearchParamMulti, type ParamState } from "@/hooks/url";
import {
  Badge,
  Box,
  Card,
  Grid,
  GridItem,
  Group,
  Heading,
  Mark,
  ScrollArea,
  Separator,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useCallback, useMemo } from "react";
import { LuCompass, LuFileText, LuSearch } from "react-icons/lu";
import { NavLink } from "react-router";
import { Empty } from "../shared/common";
import { FavoriteButton, FileCardActions } from "./shared/file";
import { toFileUrl } from "./shared/path";

type SearchParamKeys =
  | "tag"
  | "text"
  | "name"
  | "description"
  | "label"
  | "annotation";

type SearchParamDef = Record<SearchParamKeys, { type: "array" }>;

const searchParamDef: SearchParamDef = {
  tag: { type: "array" },
  text: { type: "array" },
  name: { type: "array" },
  description: { type: "array" },
  label: { type: "array" },
  annotation: { type: "array" },
};

function useLibrarySearchParams() {
  const [searchParams, setSearchParams] = useSearchParamMulti(searchParamDef);

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
        Object.keys(searchParamDef).map((k) => [k, []]),
      );

      for (const token of tokens) {
        const key = token.key ?? token.type;
        if (key in values) values[key].push(token.value);
        else values[key] = [token.value];
      }
      setSearchParams(values);
    },
    [setSearchParams],
  );

  return { searchParams, tokens, setTokens };
}

export function SearchPage() {
  const tagsQ = useAPIQuery({
    ...listTagsOptions(),
  });

  const labelsQ = useAPIQuery({
    ...listAnnotationLabelsOptions(),
  });

  return (
    <MultiQueryView queries={[tagsQ, labelsQ]}>
      {(data) => <SearchView tags={data[0]} labels={data[1]} />}
    </MultiQueryView>
  );
}

type SearchFilterKeyDef = SearchKeyDef & { isSingleUse?: boolean };

function SearchView({
  tags,
  labels,
}: {
  tags: TagResponse[];
  labels: string[];
}) {
  const {
    tokens,
    setTokens: setTokensRaw,
    searchParams,
  } = useLibrarySearchParams();

  const allKeys: Record<string, SearchFilterKeyDef> = useMemo(
    () => ({
      tag: {
        label: "Tag",
        values: tags.map((item) => item.name),
      },
      name: {
        label: "Name",
        values: [],
        isSingleUse: true,
      },
      description: {
        label: "Description",
        values: [],
        isSingleUse: true,
      },
      annotation: {
        label: "Annotation",
        values: [],
        isSingleUse: true,
      },
      label: {
        label: "Annotation Label",
        values: labels,
        isSingleUse: true,
      },
      text: {
        label: "This little action gonna cost you 51 years. Full text search",
        values: [],
        isSingleUse: true,
      },
    }),
    [tags, labels],
  );

  const activeKeys = useMemo(() => {
    const usedKeys = new Set(tokens.map((t) => t.key ?? t.type));
    return Object.fromEntries(
      Object.entries(allKeys).filter(
        ([key, def]) => !def.isSingleUse || !usedKeys.has(key),
      ),
    );
  }, [allKeys, tokens]);

  const setSafeTokens = useCallback(
    (next: SearchTokenData[]) => {
      const seen = new Set<string>();
      let blocked = false;
      const filtered = next.filter((t) => {
        const key = t.key ?? t.type;
        const def = allKeys[key];
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
    [allKeys, setTokensRaw],
  );

  return (
    <Stack gap={6}>
      <Heading size="3xl" fontWeight="normal">
        Search
      </Heading>

      <SearchBar keys={activeKeys} value={tokens} onSearch={setSafeTokens} />

      {tokens.length == 0 && (
        <Empty
          icon={<LuCompass />}
          title="Use the search bar above to find files by name, tag, or other filters."
        />
      )}

      {tokens.length > 0 && <SearchQuery searchParams={searchParams} />}
    </Stack>
  );
}

interface SearchQueryProps {
  searchParams: ParamState<SearchParamDef>;
}

function SearchQuery(props: SearchQueryProps) {
  const { searchParams } = props;

  const query = useAPIQuery({
    ...searchFilesOptions({
      query: {
        tags: searchParams.tag,
        text: searchParams.text?.[0],
        name: searchParams.name?.[0],
        description: searchParams.description?.[0],
        label: searchParams.label?.[0],
        annotation: searchParams.annotation?.[0],
      },
    }),
  });

  return (
    <QueryView query={query}>
      {(data) => <SearchResults results={data} textQuery={searchParams.text} />}
    </QueryView>
  );
}

interface SearchResultsProps {
  results: FileSearchResponse[];
  textQuery: string[];
}

function SearchResults(props: SearchResultsProps) {
  const { results, textQuery } = props;

  if (results.length === 0) {
    return (
      <Empty
        icon={<LuSearch />}
        title="No files match your search. Try adjusting your filters."
      />
    );
  }

  return (
    <Stack gap={6}>
      {results.map((result) => (
        <SearchFileHitsCard
          result={result}
          textQuery={textQuery}
          key={result.file.id}
        />
      ))}
    </Stack>
  );
}

export function SearchFileHitsCard(props: {
  result: FileSearchResponse;
  textQuery: string[];
}) {
  const {
    result: { file, hits, score },
    textQuery,
  } = props;

  const relevance = {
    strong: { label: "Strong relevance", color: "green.solid" },
    good: { label: "Good relevance", color: "yellow.solid" },
    weak: { label: "Weak relevance", color: "gray.solid" },
  }[score];

  return (
    <Card.Root variant="outline" size="sm">
      <Card.Body>
        <Grid templateColumns="auto 1fr auto" templateRows="1fr auto" gap={2}>
          <GridItem>
            <Stack
              align="center"
              justify="center"
              bg="colorPalette.700"
              color="colorPalette.200"
              rounded="md"
              w="10"
              h="10"
            >
              <LuFileText />
            </Stack>
          </GridItem>
          <GridItem>
            <Stack gap={1}>
              <NavLink
                to={toFileUrl({
                  folderId: file.collection_id,
                  fileId: file.id,
                })}
              >
                <Card.Title
                  _hover={{ color: "colorPalette.fg" }}
                  transition="color 0.2s"
                >
                  {file.name}
                </Card.Title>
              </NavLink>
              {file.description && (
                <Text textStyle="xs" color="fg.muted" truncate>
                  {file.description}
                </Text>
              )}
            </Stack>
          </GridItem>
          <GridItem>
            <Group gap={0}>
              <FavoriteButton file={file} />
              <FileCardActions file={file} />
            </Group>
          </GridItem>

          <GridItem />
          <GridItem colSpan={2} justifyContent="space-between">
            <Group justifyContent="space-between" grow>
              <Group gap={2} wrap="wrap" mt={1}>
                {file.tags?.map((tag) => (
                  <FilterTag key={tag.id} tag={tag} />
                ))}
              </Group>
              <Group gap={3} justifyContent="end" wrap="wrap" mt={1}>
                {textQuery.length && (
                  <Badge colorPalette="blue" variant="subtle" size="xs">
                    {hits.length} {hits.length === 1 ? "match" : "matches"}
                  </Badge>
                )}
                <Group gap={1.5}>
                  <Box boxSize={1.5} rounded="full" bg={relevance.color} />
                  <Text textStyle="xs" color="fg.muted">
                    {relevance.label}
                  </Text>
                </Group>
                <Text textStyle="xs" color="fg.muted">
                  {file.page_count} pages
                </Text>
              </Group>
            </Group>
          </GridItem>
        </Grid>
        {hits.length > 0 && (
          <ScrollArea.Root maxHeight="10rem" variant="hover" size="sm" mt="4">
            <ScrollArea.Viewport>
              <ScrollArea.Content paddingEnd="3" textStyle="sm">
                <Stack gap={1.5}>
                  {hits.map((hit, i) => (
                    <SearchHitItem
                      key={`${hit.fragment_type}-${hit.page_number ?? "meta"}-${i}`}
                      hit={hit}
                      fileId={file.id}
                      folderId={file.collection_id}
                    />
                  ))}
                </Stack>
              </ScrollArea.Content>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar />
          </ScrollArea.Root>
        )}
      </Card.Body>
    </Card.Root>
  );
}

const FRAGMENT_LABELS: Record<string, string> = {
  name: "Title",
  description: "Description",
  content: "Content",
  label: "Label",
  annotation: "Annotation",
  title: "Title",
  page: "Page",
};

function highlightSnippet(snippet: string) {
  return snippet.split(/(<mark>.*?<\/mark>)/g).map((part, i) =>
    part.startsWith("<mark>") ? (
      <Mark variant="subtle" colorPalette="yellow" key={i}>
        {part.slice(6, -7)}
      </Mark>
    ) : (
      part
    ),
  );
}

function SearchHitItem(props: {
  hit: SearchHitResponse;
  fileId: string;
  folderId: string | null | undefined;
}) {
  const { hit, fileId, folderId } = props;

  if (hit.fragment_type === "annotation" && hit.annotation) {
    return (
      <AnnotationHitItem
        hit={hit}
        annotation={hit.annotation}
        fileId={fileId}
        folderId={folderId}
      />
    );
  }

  return <GenericHitItem hit={hit} fileId={fileId} folderId={folderId} />;
}

function GenericHitItem(props: {
  hit: SearchHitResponse;
  fileId: string;
  folderId: string | null | undefined;
}) {
  const { hit, fileId, folderId } = props;
  const fragmentName = FRAGMENT_LABELS[hit.fragment_type] ?? hit.fragment_type;

  return (
    <NavLink
      to={toFileUrl({
        folderId,
        fileId,
        page: hit.page_number ?? undefined,
      })}
    >
      <Stack
        direction="row"
        gap={3}
        p={2.5}
        align="center"
        rounded="md"
        bg="bg.subtle"
        transition="background 0.15s"
        _hover={{ bg: "bg.muted" }}
      >
        <Stack align="center" justify="center" minW="14" gap={0} flexShrink={0}>
          <Text
            textStyle="xs"
            color="fg.muted"
            letterSpacing="wider"
            lineHeight={1}
          >
            {hit.page_number != null ? "PAGE" : "MATCH"}
          </Text>
          <Text textStyle="sm" fontWeight="semibold" lineHeight={1} mt="1">
            {hit.page_number != null ? hit.page_number : fragmentName}
          </Text>
        </Stack>

        <Separator orientation="vertical" height="6" />

        <Text textStyle="sm" color="fg.muted" lineClamp={2} flex={1}>
          {highlightSnippet(hit.snippet)}
        </Text>
      </Stack>
    </NavLink>
  );
}

function AnnotationHitItem(props: {
  hit: SearchHitResponse;
  annotation: NonNullable<SearchHitResponse["annotation"]>;
  fileId: string;
  folderId: string | null | undefined;
}) {
  const { hit, annotation, fileId, folderId } = props;

  return (
    <NavLink
      to={toFileUrl({
        folderId,
        fileId,
        page: annotation.page,
      })}
    >
      <Stack
        direction="row"
        gap={3}
        p={2.5}
        align="stretch"
        rounded="md"
        bg="bg.subtle"
        transition="background 0.15s"
        _hover={{ bg: "bg.muted" }}
      >
        <Stack align="center" justify="center" minW="14" gap={0} flexShrink={0}>
          <Text
            textStyle="xs"
            color="fg.muted"
            letterSpacing="wider"
            lineHeight={1}
          >
            PAGE
          </Text>
          <Text textStyle="sm" fontWeight="semibold" lineHeight={1} mt="1">
            {annotation.page}
          </Text>
        </Stack>

        <Separator orientation="vertical" />

        <Stack gap={1.5} flex={1} minW={0}>
          <Group gap={2} wrap="wrap">
            <Badge size="xs" variant="subtle" colorPalette="purple">
              Annotation
            </Badge>
            {annotation.label && (
              <Badge size="xs" variant="surface">
                {annotation.label}
              </Badge>
            )}
          </Group>

          {annotation.excerpt && (
            <Text
              textStyle="xs"
              color="fg.muted"
              fontStyle="italic"
              lineClamp={1}
              borderLeftWidth="2px"
              borderColor="border"
              pl={2}
            >
              "
              {hit.field === "excerpt"
                ? highlightSnippet(hit.snippet)
                : annotation.excerpt}
              "
            </Text>
          )}

          <Text textStyle="sm" lineClamp={2}>
            {hit.field === "body"
              ? highlightSnippet(hit.snippet)
              : annotation.body}
          </Text>
        </Stack>
      </Stack>
    </NavLink>
  );
}

export function FilterTag({ tag }: { tag: TagResponse }) {
  const [searchParams, setSearchParams] = useSearchParamMulti({
    tag: { type: "array" },
  });

  return (
    <Badge
      onClick={() =>
        setSearchParams({ tag: [...new Set([...searchParams.tag, tag.name])] })
      }
      key={tag.id}
      size="sm"
      colorPalette={tag.color}
      transition="background 0.15s, color 0.15s"
      _hover={{
        bg: "colorPalette.solid",
        color: "colorPalette.contrast",
      }}
    >
      {tag.name}
    </Badge>
  );
}
