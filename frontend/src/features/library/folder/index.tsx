import {
  getCollectionFilesOptions,
  getCollectionOptions,
  listAuthorsOptions,
  listTagsOptions,
} from "@/api/@tanstack/react-query.gen";
import {
  FileStatusEnum,
  ResourcePermissionCapability,
  type CollectionWithDetailsResponse,
} from "@/api/types.gen";
import { useCan } from "@/common/auth/hooks";
import { Empty } from "@/components/ui/display";
import { QueryView } from "@/components/ui/feedback";
import { SearchBar } from "@/components/ui/smartSearchBar";
import {
  useUrlSearchBar,
  type SearchFilterDef,
} from "@/components/ui/smartSearchBar/hooks";
import { useAPIQuery } from "@/hooks/query";
import {
  Button,
  Flex,
  Group,
  Heading,
  Stack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { useMemo } from "react";
import { LuFileText, LuFilter, LuHardDriveUpload } from "react-icons/lu";
import { useParams } from "react-router";
import { FileBrowser } from "./browser";
import { LayoutSwitch } from "./layout";
import { UploadFileDialog } from "./upload";

export function FolderPage() {
  const { folderid } = useParams();
  const query = useAPIQuery({
    ...getCollectionOptions({
      path: { id: folderid! },
    }),
  });

  return (
    <QueryView query={query}>
      {(data) => <FolderView collection={data} />}
    </QueryView>
  );
}

type SearchParamKeys = "tag" | "name" | "description" | "author" | "status";

function FolderView(props: { collection: CollectionWithDetailsResponse }) {
  const { collection } = props;

  const { data: tags } = useAPIQuery({
    ...listTagsOptions(),
  });

  const { data: authors } = useAPIQuery({
    ...listAuthorsOptions(),
  });

  const allKeys: Record<SearchParamKeys, SearchFilterDef> = useMemo(
    () => ({
      tag: {
        label: "Tag",
        values: tags?.map((item) => item.name) ?? [],
      },
      author: {
        label: "Author",
        values: authors?.map((item) => item.name) ?? [],
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
      status: {
        label: "Status",
        values: Object.values(FileStatusEnum),
        isSingleUse: true,
      },
    }),
    [tags, authors],
  );

  const { activeKeys, setSafeTokens, tokens, searchParams } = useUrlSearchBar({
    items: allKeys,
  });

  const collectionFilesQ = useAPIQuery({
    ...getCollectionFilesOptions({
      path: { id: collection.id! },
      query: {
        tags: searchParams.tag,
        name: searchParams.name?.[0],
        description: searchParams.description?.[0],
        authors: searchParams.author,
        status: searchParams.status?.[0] as FileStatusEnum,
      },
    }),
  });

  const can = useCan(collection);

  const canWrite = can(ResourcePermissionCapability.WRITE);

  return (
    <Stack gap={6}>
      <Group justify="space-between" align="center">
        <Stack>
          <Heading size="3xl" fontWeight="normal">
            {collection.name}
          </Heading>
          {collection.is_shared_with_me && (
            <Text color="fg.muted" fontSize="sm">
              {collection.owner.name}'s files
            </Text>
          )}
        </Stack>

        <Group gap={6}>
          <SearchBar
            size="2xs"
            keys={activeKeys}
            value={tokens}
            onSearch={setSafeTokens}
            width="sm"
            placeholder="Filter files.."
          />

          <LayoutSwitch layoutKey={collection.id} />
          <UploadFileAction folder_id={collection.id} readOnly={!canWrite} />
        </Group>
      </Group>

      <QueryView query={collectionFilesQ}>
        {(data) => {
          if (data?.length == 0 && tokens.length > 0) {
            return (
              <Empty
                icon={<LuFilter />}
                title="No files match your search. Try adjusting your filters"
              />
            );
          }

          if (data?.length == 0)
            return (
              <Empty
                icon={<LuFileText />}
                title="No files yet. Upload a PDF to get started"
              />
            );

          return (
            <FileBrowser
              files={data}
              layoutKey={collection.id}
              tagType="filter"
            />
          );
        }}
      </QueryView>
    </Stack>
  );
}

function UploadFileAction({
  folder_id,
  readOnly,
}: {
  folder_id: string;
  readOnly?: boolean;
}) {
  const { open, onOpen, onClose } = useDisclosure();

  return (
    <Flex justifyContent="end">
      <Button size="sm" onClick={onOpen} disabled={readOnly}>
        <LuHardDriveUpload /> Upload file
      </Button>
      <UploadFileDialog
        readOnly={readOnly}
        open={open}
        onClose={onClose}
        collection_id={folder_id}
      />
    </Flex>
  );
}
