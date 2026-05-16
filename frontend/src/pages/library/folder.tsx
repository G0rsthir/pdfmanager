import {
  getCollectionOptions,
  uploadFileMutation,
} from "@/api/@tanstack/react-query.gen";
import type { CollectionWithDetailsResponse } from "@/api/types.gen";
import { FormError } from "@/components/ui/error";
import { QueryView } from "@/components/ui/feedback";
import { FormModal } from "@/components/ui/form/modal";
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
import { useCallback } from "react";
import { LuFileText, LuHardDriveUpload, LuUpload } from "react-icons/lu";
import { useParams } from "react-router";
import { Empty } from "./shared/common";
import { FileTagsInput } from "./shared/file";
import { FileList, LayoutSwitch } from "./shared/layout";

export function FolderPage() {
  const { folderid } = useParams();
  const query = useAPIQuery({
    ...getCollectionOptions({ path: { id: folderid! } }),
  });

  return (
    <QueryView query={query}>
      {(data) => <FolderView collection={data} />}
    </QueryView>
  );
}

function FolderView({
  collection,
}: {
  collection: CollectionWithDetailsResponse;
}) {
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
          <LayoutSwitch layoutKey={collection.id} />
          <UploadFileAction
            folder_id={collection.id}
            readOnly={collection.is_read_only_by_current_user}
          />
        </Group>
      </Group>

      {collection.files?.length == 0 && (
        <Empty
          icon={<LuFileText />}
          title="No files yet. Upload a PDF to get started."
        />
      )}

      {collection.files && (
        <FileList files={collection.files} layoutKey={collection.id} />
      )}
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

  const {
    Field: FormField,
    handleSubmit,
    state,
    reset,
    isPending,
  } = useFormMutation({
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
    reset();
    onClose();
  }, [onClose, reset]);

  return (
    <FormModal
      open={open}
      close={handleClose}
      title="Upload file"
      onSubmit={() => handleSubmit()}
      confirmBtnText="Upload"
      isPending={isPending}
      disabled={readOnly}
    >
      <FormField
        name="name"
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root invalid={!fieldState.meta.isValid} disabled={readOnly}>
            <Field.Label>Name</Field.Label>
            <Input
              value={fieldState.value}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={handleBlur}
            />
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />
      <FormField
        name="description"
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root invalid={!fieldState.meta.isValid} disabled={readOnly}>
            <Field.Label>Description</Field.Label>
            <Input
              value={fieldState.value}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={handleBlur}
            />
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />
      <FormField
        name="tags"
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root invalid={!fieldState.meta.isValid} disabled={readOnly}>
            <FileTagsInput
              defaultValue={[]}
              onValueChange={handleChange}
              onBlur={handleBlur}
            />
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />
      <FormField
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

      <FormError errors={state.errorMap.onSubmit} />
    </FormModal>
  );
}
