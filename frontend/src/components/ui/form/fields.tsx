import { expiryDatePresets } from "@/common/format";
import {
  Field,
  Input,
  Switch,
  type DateValue,
  type FieldRootProps,
  type InputProps,
} from "@chakra-ui/react";
import { useSelector, type ValidationErrorMapKeys } from "@tanstack/react-form";
import { ExpiryDateSelect, type ExpiryDateSelectProps } from "../date";
import { PasswordInput, type PasswordInputProps } from "../password-input";
import { MultiOptionSelect, OptionSelect, type SelectOption } from "../select";
import { TokensInput, type TokensInputProps } from "../tokens";
import { useFieldContext, useFormContext } from "./context";
import { FormError } from "./error";

export function SubscribeFormError(props: {
  cause?: ValidationErrorMapKeys;
  errorField?: string;
}) {
  const { cause = "onSubmit", errorField } = props;

  const form = useFormContext();

  const error = useSelector(
    form.store,
    (state): unknown => state.errorMap[cause],
  );

  return <FormError errors={error} errorField={errorField} />;
}

type FieldRootOwnProps = Omit<FieldRootProps, "children" | "label">;

export interface FieldProps extends FieldRootOwnProps {
  label?: React.ReactNode;
  helperText?: React.ReactNode;
}

function FieldRoot(props: FieldRootProps) {
  const { children, ...rest } = props;

  const field = useFieldContext<unknown>();

  return (
    <Field.Root {...rest} invalid={!field.state.meta.isValid}>
      {children}
      <Field.ErrorText>{field.state.meta.errors}</Field.ErrorText>
    </Field.Root>
  );
}

export function LabeledField(
  props: FieldProps & { children: React.ReactNode },
) {
  const { label, helperText, children, ...rest } = props;

  return (
    <FieldRoot {...rest}>
      {label && (
        <Field.Label>
          {label} <Field.RequiredIndicator />
        </Field.Label>
      )}
      {children}
      {helperText && <Field.HelperText>{helperText}</Field.HelperText>}
    </FieldRoot>
  );
}

export function TextField(
  props: FieldProps &
    Pick<InputProps, "placeholder" | "autoComplete" | "type" | "size">,
) {
  const { placeholder, autoComplete, type, size, ...rest } = props;

  const field = useFieldContext<string>();

  return (
    <LabeledField {...rest}>
      <Input
        type={type}
        size={size}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
      />
    </LabeledField>
  );
}

export function PasswordField(
  props: FieldProps & Pick<PasswordInputProps, "placeholder" | "autoComplete">,
) {
  const { placeholder, autoComplete, ...rest } = props;

  const field = useFieldContext<string>();

  return (
    <LabeledField {...rest}>
      <PasswordInput
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
      />
    </LabeledField>
  );
}

export function ExpiryDateField(
  props: FieldProps & Pick<ExpiryDateSelectProps, "presets">,
) {
  const { presets = expiryDatePresets, ...rest } = props;

  const field = useFieldContext<DateValue[]>();

  return (
    <LabeledField {...rest}>
      <Field.Context>
        {(ctx) => (
          <ExpiryDateSelect
            value={field.state.value}
            onValueChange={(e) => field.handleChange(e.value)}
            onBlur={field.handleBlur}
            presets={presets}
            required={ctx.required}
            invalid={ctx.invalid}
            disabled={ctx.disabled}
            // The ids of the field, so that its label is the label of the date input
            ids={{ label: () => ctx.ids.label, input: () => ctx.ids.control }}
          />
        )}
      </Field.Context>
    </LabeledField>
  );
}

export function SelectField(
  props: FieldProps & {
    items: SelectOption[];
    placeholder?: string;
    multiple?: boolean;
  },
) {
  const { label, helperText, items, placeholder, multiple, ...rest } = props;

  const field = useFieldContext<string | string[]>();
  const value = field.state.value;

  const selectProps = {
    items,
    placeholder,
    onBlur: field.handleBlur,
    label: label && (
      <>
        {label} <Field.RequiredIndicator />
      </>
    ),
  };

  return (
    <FieldRoot {...rest}>
      {multiple ? (
        <MultiOptionSelect
          {...selectProps}
          value={Array.isArray(value) ? value : []}
          onValueChange={field.handleChange}
        />
      ) : (
        <OptionSelect
          {...selectProps}
          value={typeof value == "string" ? value : ""}
          onValueChange={field.handleChange}
        />
      )}
      {helperText && <Field.HelperText>{helperText}</Field.HelperText>}
    </FieldRoot>
  );
}

export function SwitchField(
  props: FieldRootOwnProps & {
    label?: React.ReactNode;
  },
) {
  const { label, ...rest } = props;

  const field = useFieldContext<boolean>();

  return (
    <FieldRoot {...rest}>
      <Switch.Root
        checked={field.state.value}
        onCheckedChange={(e) => field.handleChange(e.checked)}
      >
        <Switch.HiddenInput onBlur={field.handleBlur} />
        <Switch.Control />
        {label && <Switch.Label>{label}</Switch.Label>}
      </Switch.Root>
    </FieldRoot>
  );
}

export function TokensField(
  props: FieldProps &
    Pick<
      TokensInputProps,
      "suggestions" | "description" | "placeholder" | "colorPalette"
    >,
) {
  const { suggestions, description, placeholder, colorPalette, ...rest } =
    props;

  const field = useFieldContext<string[]>();

  return (
    <LabeledField {...rest}>
      <TokensInput
        defaultValue={field.state.value}
        onValueChange={field.handleChange}
        onBlur={field.handleBlur}
        suggestions={suggestions}
        description={description}
        placeholder={placeholder}
        colorPalette={colorPalette}
      />
    </LabeledField>
  );
}
