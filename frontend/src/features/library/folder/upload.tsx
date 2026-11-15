import {
  listTagsOptions,
  uploadFileMutation,
} from "@/api/@tanstack/react-query.gen";
import { LabeledField } from "@/components/ui/form/fields";
import { FormModal } from "@/components/ui/form/modal";
import { useFormMutation } from "@/hooks/form";
import { useAPIQuery } from "@/hooks/query";
import { Box, FileUpload, Icon } from "@chakra-ui/react";
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
      requestValidator: () => Promise.resolve(true),
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
      onSubmit={() => void form.handleSubmit()}
      confirmBtnText="Upload"
      isPending={mutation.isPending}
      disabled={readOnly}
    >
      <form.AppField
        name="name"
        children={(field) => (
          <field.TextField
            label="Name"
            helperText="Leave empty to use the PDF's title or the file name"
            disabled={readOnly}
          />
        )}
      />
      <form.AppField
        name="description"
        children={(field) => (
          <field.TextField
            label="Description"
            helperText="Leave empty to use the PDF's description"
            disabled={readOnly}
          />
        )}
      />
      <form.AppField
        name="tags"
        children={(field) => (
          <field.TokensField
            label="Tags"
            suggestions={listTagsQ.data?.map((item) => item.name)}
            description="Press Enter or Return to add tag"
            disabled={readOnly}
          />
        )}
      />
      <form.AppField
        name="file"
        validators={{
          onSubmit: ({ value }) =>
            !value ? "Please select a file" : undefined,
        }}
        children={(field) => (
          <LabeledField disabled={readOnly}>
            <FileUpload.Root
              alignItems="stretch"
              maxFiles={1}
              accept={["application/pdf"]}
              invalid={!field.state.meta.isValid}
              onFileChange={(details) => {
                field.handleChange(details.acceptedFiles[0]);
              }}
            >
              <FileUpload.HiddenInput />
              {!field.state.value && (
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
          </LabeledField>
        )}
      />

      <form.AppForm>
        <form.SubscribeFormError />
      </form.AppForm>
    </FormModal>
  );
}
