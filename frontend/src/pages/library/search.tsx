import {
  listFilesOptions,
  listTagsOptions,
} from "@/api/@tanstack/react-query.gen";
import type { FileResponse, TagResponse } from "@/api/types.gen";
import { QueryView } from "@/components/ui/feedback";
import { SearchBar, type SearchTokenData } from "@/components/ui/searchBar";
import { useAPIQuery } from "@/hooks/query";
import { useSearchParamMulti, type ParamState } from "@/hooks/url";
import {
  Badge,
  Card,
  Grid,
  GridItem,
  Group,
  Heading,
  Highlight,
  Icon,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useCallback, useMemo } from "react";
import { LuCompass, LuFileText, LuSearch } from "react-icons/lu";
import { NavLink } from "react-router";
import { CardEmpty } from "./shared/common";
import { FavoriteButton, FileCardActions } from "./shared/file";
import { toFileUrl } from "./shared/path";

type SearchParamKeys = "tag" | "text" | "name" | "description";

type SearchParamDef = Record<SearchParamKeys, { type: "array" }>;

const searchParamDef: SearchParamDef = {
  tag: { type: "array" },
  text: { type: "array" },
  name: { type: "array" },
  description: { type: "array" },
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
  const query = useAPIQuery({
    ...listTagsOptions(),
  });

  return (
    <QueryView query={query}>{(data) => <SearchView tags={data} />}</QueryView>
  );
}

function SearchView({ tags }: { tags: TagResponse[] }) {
  const { tokens, setTokens, searchParams } = useLibrarySearchParams();

  const searchkeys = useMemo(
    () => ({
      tag: {
        label: "Tag",
        values: tags.map((item) => item.name),
      },
      name: {
        label: "Name",
        values: [],
      },
      description: {
        label: "Description",
        values: [],
      },
    }),
    [tags],
  );

  return (
    <Stack gap={6}>
      <Heading size="3xl" fontWeight="normal">
        Search
      </Heading>

      <SearchBar keys={searchkeys} value={tokens} onSearch={setTokens} />

      {tokens.length === 0 && (
        <CardEmpty>
          <Icon size="xl" color="fg.muted">
            <LuCompass />
          </Icon>
          <Text color="fg.muted" textStyle="sm">
            Use the search bar above to find files by name, tag, or other
            filters.
          </Text>
        </CardEmpty>
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
    ...listFilesOptions({
      query: {
        tags: searchParams.tag,
        text: searchParams.text,
        names: searchParams.name,
        descriptions: searchParams.description,
      },
    }),
  });

  return (
    <QueryView query={query}>
      {(data) => <SearchResults files={data} textQuery={searchParams.text} />}
    </QueryView>
  );
}

interface SearchResultsProps {
  files: FileResponse[];
  textQuery: string[];
}

function SearchResults(props: SearchResultsProps) {
  const { files, textQuery } = props;

  if (files.length === 0) {
    return (
      <CardEmpty>
        <Icon size="xl" color="fg.muted">
          <LuSearch />
        </Icon>
        <Text color="fg.muted" textStyle="sm">
          No files match your search. Try adjusting your filters.
        </Text>
      </CardEmpty>
    );
  }

  return (
    <Stack gap={6}>
      {files.map((file) => (
        <SearchFileCard file={file} textQuery={textQuery} key={file.id} />
      ))}
    </Stack>
  );
}

const highlightStyles = { bg: "yellow.subtle", px: "0.5" };

function SearchFileCard(props: { file: FileResponse; textQuery: string[] }) {
  const { file, textQuery } = props;

  return (
    <Card.Root
      variant="outline"
      _hover={{ borderColor: "border.emphasized" }}
      transition="border-color 0.2s"
    >
      <Card.Body>
        <Grid templateColumns="auto 1fr auto" templateRows="1fr auto" gap={4}>
          <GridItem>
            <Stack
              align="center"
              justify="center"
              bg="colorPalette.700"
              color="colorPalette.200"
              rounded="md"
              w="12"
              minH="12"
            >
              <LuFileText />
            </Stack>
          </GridItem>
          <GridItem>
            <Stack gap={1}>
              <NavLink
                to={toFileUrl({ folderId: file.folder_id, fileId: file.id })}
              >
                <Card.Title
                  _hover={{ color: "colorPalette.fg" }}
                  transition="color 0.2s"
                >
                  {textQuery.length > 0 ? (
                    <Highlight
                      query={textQuery}
                      ignoreCase
                      styles={highlightStyles}
                    >
                      {file.name}
                    </Highlight>
                  ) : (
                    file.name
                  )}
                </Card.Title>
              </NavLink>
              {file.description && (
                <Text textStyle="xs" color="fg.muted" truncate>
                  {textQuery.length > 0 ? (
                    <Highlight
                      query={textQuery}
                      ignoreCase
                      styles={highlightStyles}
                    >
                      {file.description}
                    </Highlight>
                  ) : (
                    file.description
                  )}
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
              <Group gap={2}>
                {file.tags?.map((tag) => (
                  <FilterTag key={tag.id} tag={tag} />
                ))}
              </Group>
              <Group gap={3} justifyContent="end">
                {file.page_count != null && (
                  <Text textStyle="xs">
                    {file.current_page} / {file.page_count} pages
                  </Text>
                )}
              </Group>
            </Group>
          </GridItem>
        </Grid>
      </Card.Body>
    </Card.Root>
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
