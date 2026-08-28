import { getFile } from "@/api/sdk.gen";
import { FileStatusEnum, type FileResponse } from "@/api/types.gen";
import { parseAPIError } from "@/common/error";
import { showErrorNotification } from "@/components/ui/toaster";
import { useFileThumbnail } from "@/hooks/asset";
import {
  Box,
  Button,
  Group,
  Heading,
  HStack,
  Image,
  Menu,
  Progress,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useState } from "react";
import { LuBookOpen, LuDownload } from "react-icons/lu";
import { NavLink, useNavigate } from "react-router";
import {
  DeleteFileDialog,
  FavoriteButton,
  GenericFileActionsMenu,
  SearchTag,
} from "../shared/file";
import { toFileReaderUrl } from "../shared/path";

export function FileHeader({ file }: { file: FileResponse }) {
  const thumbSrc = useFileThumbnail(file.id);

  const readUrl = toFileReaderUrl({
    folderId: file.collection_id,
    fileId: file.id,
  });

  const isInProgress = file.state.status == FileStatusEnum.READING;

  return (
    <Stack direction={{ base: "column", md: "row" }} gap={8}>
      <NavLink to={readUrl}>
        <Box width="160px" height="215px">
          {thumbSrc ? (
            <Image
              src={thumbSrc}
              rounded="md"
              width="full"
              height="full"
              objectFit="cover"
            />
          ) : (
            <Skeleton height="full" rounded="md" />
          )}
        </Box>
      </NavLink>

      <Stack gap={4} flex={1}>
        <Group justify="space-between" gap={4}>
          <Stack gap={1}>
            <Heading size="2xl" fontWeight="normal">
              {file.name}
            </Heading>
            {file.authors && file.authors.length > 0 && (
              <Text color="fg.muted">
                {file.authors.map((author) => author.name).join(", ")}
              </Text>
            )}
          </Stack>

          <Group gap={0}>
            <FavoriteButton file={file} />
            <HeaderActions file={file} />
          </Group>
        </Group>

        {file.description && (
          <Text color="fg.muted" textStyle="sm">
            {file.description}
          </Text>
        )}

        {file.tags && file.tags.length > 0 && (
          <Group gap={2} wrap="wrap">
            {file.tags.map((tag) => (
              <SearchTag key={tag.id} tag={tag} />
            ))}
          </Group>
        )}

        <ReadingProgress file={file} />

        <Group gap={3}>
          <NavLink to={readUrl}>
            <Button size="sm">
              <LuBookOpen /> {isInProgress ? "Continue reading" : "Read"}
            </Button>
          </NavLink>
          <DownloadButton file={file} />
        </Group>
      </Stack>
    </Stack>
  );
}

function ReadingProgress({ file }: { file: FileResponse }) {
  if (!file.page_count) return null;

  const percent = Math.round((file.state.current_page / file.page_count) * 100);

  return (
    <Progress.Root size="sm" value={percent} maxW="md" colorPalette="blue">
      <HStack>
        <Progress.Track flex="1">
          <Progress.Range />
        </Progress.Track>
        <Progress.ValueText textStyle="xs" color="fg.muted">
          Page {file.state.current_page} of {file.page_count}
        </Progress.ValueText>
      </HStack>
    </Progress.Root>
  );
}

function DownloadButton({ file }: { file: FileResponse }) {
  const [pending, setPending] = useState(false);

  const handleDownload = async () => {
    setPending(true);
    try {
      const res = await getFile({
        path: { id: file.id },
        parseAs: "blob",
        throwOnError: true,
      });

      const url = URL.createObjectURL(res.data as Blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name.toLowerCase().endsWith(".pdf")
        ? file.name
        : `${file.name}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      showErrorNotification("Download failed", parseAPIError(e).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="surface"
      colorPalette="green"
      loading={pending}
      onClick={handleDownload}
    >
      <LuDownload /> Download
    </Button>
  );
}

type HeaderDialog = "edit" | "delete" | null;

export function HeaderActions(props: { file: FileResponse }) {
  const { file } = props;

  const [dialog, setDialog] = useState<HeaderDialog>(null);

  const navigate = useNavigate();

  return (
    <>
      <GenericFileActionsMenu>
        <Menu.Item
          value="delete"
          color="fg.error"
          _hover={{ bg: "bg.error", color: "fg.error" }}
          onSelect={() => setDialog("delete")}
          disabled={file.is_read_only_by_current_user}
        >
          Delete
        </Menu.Item>
      </GenericFileActionsMenu>

      <DeleteFileDialog
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
        onSuccess={() => navigate(-1)}
        id={file.id}
      />
    </>
  );
}
