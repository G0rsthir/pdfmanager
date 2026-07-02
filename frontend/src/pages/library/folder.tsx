import {
  getCollectionFilesOptions,
  getCollectionOptions,
  listAuthorsOptions,
  listTagsOptions,
  uploadFileMutation,
} from "@/api/@tanstack/react-query.gen";
import type { CollectionWithDetailsResponse } from "@/api/types.gen";
import { FormError } from "@/components/ui/error";
import { QueryView } from "@/components/ui/feedback";
import { FormModal } from "@/components/ui/form/modal";
import { SearchBar } from "@/components/ui/searchBar";
import { useFormMutation } from "@/hooks/form";
import { useAPIQuery } from "@/hooks/query";
import {
  Box,
  Button,
  Field,
  FileUpload,
  Flex,
  Group,
  Heading,
  Icon,
  Input,
  Stack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { useCallback, useMemo } from "react";
import {
  LuFileText,
  LuFilter,
  LuHardDriveUpload,
  LuUpload,
} from "react-icons/lu";
import { useParams } from "react-router";
import { Empty } from "../shared/common";
import { TokensInput } from "../shared/input";
import {
  useUrlSearchBar,
  type SearchFilterDef,
} from "../shared/smartSearchBar/hooks";
import { FileList, LayoutSwitch } from "./shared/layout";

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

type SearchParamKeys = "tag" | "name" | "description" | "author";

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
      },
    }),
  });

  return (
    <Stack gap={6}>
      <Group justify="space-between" align="center">
        <Stack>
          <Heading size="3xl" fontWeight="normal">
            {collection.name}
          </Heading>
          {collection.is_shared_with_current_user && (
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
          <UploadFileAction
            folder_id={collection.id}
            readOnly={collection.is_read_only_by_current_user}
          />
        </Group>
      </Group>

      <QueryView query={collectionFilesQ}>
        {(data) => {
          if (data?.length == 0 && tokens.length > 0) {
            return (
              <Empty
                icon={<LuFilter />}
                title="No files match your search. Try adjusting your filters."
              />
            );
          }

          if (data?.length == 0)
            return (
              <Empty
                icon={<LuFileText />}
                title="No files yet. Upload a PDF to get started."
              />
            );

          return (
            <FileList files={data} layoutKey={collection.id} tagType="filter" />
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
      <Button size="sm" onClick={onOpen}>
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

interface UploadFormValues {
  name: string;
  collection_id: string;
  description: string;
  tags: string[];
  file?: File;
}

function UploadFileDialog(props: {
  open: boolean;
  onClose: () => void;
  collection_id: string;
  readOnly?: boolean;
}) {
  const { open, onClose, collection_id, readOnly } = props;

  const defaultValues: UploadFormValues = {
    name: "",
    collection_id: collection_id,
    description: "",
    tags: [],
    file: undefined,
  };

  const { form, mutation } = useFormMutation({
    formOptions: {
      defaultValues: defaultValues,
    },
    mutationOptions: uploadFileMutation,
    onMutate: (value) => ({
      body: {
        ...value,
        file: value.file!,
      },
      // Request validation does not work for the file upload
      requestValidator: async () => true,
    }),
    successMessage: "File uploaded successfully",
    onSuccess: onClose,
  });

  const handleClose = useCallback(() => {
    form.reset();
    onClose();
  }, [onClose, form]);

  const listTagsQ = useAPIQuery({
    ...listTagsOptions(),
  });

  return (
    <FormModal
      open={open}
      close={handleClose}
      title="Upload file"
      onSubmit={() => form.handleSubmit()}
      confirmBtnText="Upload"
      isPending={mutation.isPending}
      disabled={readOnly}
    >
      <form.Field
        name="name"
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root invalid={!fieldState.meta.isValid} disabled={readOnly}>
            <Field.Label>Name</Field.Label>
            <Input
              value={fieldState.value}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={handleBlur}
            />
            <Field.HelperText>
              Leave empty to use the PDF's title, or the file name.
            </Field.HelperText>
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />
      <form.Field
        name="description"
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root invalid={!fieldState.meta.isValid} disabled={readOnly}>
            <Field.Label>Description</Field.Label>
            <Input
              value={fieldState.value}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={handleBlur}
            />
            <Field.HelperText>
              Leave empty to use the PDF's description.
            </Field.HelperText>
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />
      <form.Field
        name="tags"
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root invalid={!fieldState.meta.isValid} disabled={readOnly}>
            <Field.Label>Tags</Field.Label>
            <TokensInput
              defaultValue={[]}
              onValueChange={handleChange}
              onBlur={handleBlur}
              suggestions={listTagsQ.data?.map((item) => item.name)}
              description="Press Enter or Return to add tag"
            />
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />
      <form.Field
        name="file"
        validators={{
          onSubmit: ({ value }) =>
            !value ? "Please select a file" : undefined,
        }}
        children={({ state: fieldState, handleChange }) => (
          <Field.Root invalid={!fieldState.meta.isValid} disabled={readOnly}>
            <FileUpload.Root
              alignItems="stretch"
              maxFiles={1}
              accept={["application/pdf"]}
              invalid={!fieldState.meta.isValid}
              onFileChange={(details) => {
                handleChange(details.acceptedFiles[0]);
              }}
            >
              <FileUpload.HiddenInput />
              {!fieldState.value && (
                <FileUpload.Dropzone _invalid={{ border: "1px solid red" }}>
                  <Icon size="md" color="fg.muted">
                    <LuUpload />
                  </Icon>
                  <FileUpload.DropzoneContent>
                    <Box>Drag and drop files here</Box>
                  </FileUpload.DropzoneContent>
                </FileUpload.Dropzone>
              )}
              <FileUpload.List clearable />
            </FileUpload.Root>
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />

      <FormError errors={form.state.errorMap.onSubmit} />
    </FormModal>
  );
}
