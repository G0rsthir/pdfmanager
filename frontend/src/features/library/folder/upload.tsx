import {
  listTagsOptions,
  uploadFileMutation,
} from "@/api/@tanstack/react-query.gen";
import { SubscribeFormError } from "@/components/ui/form/fields";
import { FormModal } from "@/components/ui/form/modal";
import { TokensInput } from "@/components/ui/tokens";
import { useFormMutation } from "@/hooks/form";
import { useAPIQuery } from "@/hooks/query";
import { Box, Field, FileUpload, Icon, Input } from "@chakra-ui/react";
import { LuUpload } from "react-icons/lu";

interface UploadFormValues {
  name: string;
  collection_id: string;
  description: string;
  tags: string[];
  file?: File;
}

export function UploadFileDialog(props: {
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
    successNotification: "File uploaded successfully",
    onSuccess: onClose,
  });

  const handleClose = () => {
    form.reset();
    onClose();
  };

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
              Leave empty to use the PDF's title or the file name
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
              Leave empty to use the PDF's description
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

      <SubscribeFormError form={form} />
    </FormModal>
  );
}
