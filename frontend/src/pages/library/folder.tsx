import {
  getFolderOptions,
  uploadFileMutation,
} from "@/api/@tanstack/react-query.gen";
import type { FolderResponse } from "@/api/types.gen";
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
import { CardEmpty } from "./shared/common";
import { FileCard, FileTagsInput } from "./shared/file";

export function FolderPage() {
  const { folderid } = useParams();
  const query = useAPIQuery({
    ...getFolderOptions({ path: { id: folderid! } }),
  });

  return (
    <QueryView query={query}>
      {(data) => <FolderView folder={data} />}
    </QueryView>
  );
}

function FolderView({ folder }: { folder: FolderResponse }) {
  return (
    <Stack gap={6}>
      <Group justify="space-between" align="center">
        <Heading size="3xl" fontWeight="normal">
          {folder.name}
        </Heading>

        <UploadFileAction folder_id={folder.id} />
      </Group>

      {folder.files?.length === 0 && (
        <CardEmpty>
          <Icon size="xl" color="fg.muted">
            <LuFileText />
          </Icon>
          <Text color="fg.muted" textStyle="sm">
            No files yet. Upload a PDF to get started.
          </Text>
        </CardEmpty>
      )}

      {folder.files?.map((file) => (
        <FileCard file={file} key={file.id} />
      ))}
    </Stack>
  );
}

function UploadFileAction({ folder_id }: { folder_id: string }) {
  const { open, onOpen, onClose } = useDisclosure();

  return (
    <Flex justifyContent="end">
      <Button size="sm" onClick={onOpen}>
        <LuHardDriveUpload /> Upload file
      </Button>
      <UploadFileDialog open={open} onClose={onClose} folder_id={folder_id} />
    </Flex>
  );
}

interface UploadFormValues {
  name: string;
  folder_id: string;
  description: string;
  tags: string[];
  file?: File;
}

function UploadFileDialog(props: {
  open: boolean;
  onClose: () => void;
  folder_id: string;
}) {
  const { open, onClose, folder_id } = props;

  const defaultValues: UploadFormValues = {
    name: "",
    folder_id: folder_id,
    description: "",
    tags: [],
    file: undefined,
  };

  const {
    Field: FormField,
    handleSubmit,
    state,
    reset,
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
    >
      <FormField
        name="name"
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root invalid={!fieldState.meta.isValid}>
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
          <Field.Root invalid={!fieldState.meta.isValid}>
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
          <Field.Root invalid={!fieldState.meta.isValid}>
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
          <Field.Root invalid={!fieldState.meta.isValid}>
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
