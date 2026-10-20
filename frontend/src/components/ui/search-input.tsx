import {
  Input,
  InputGroup,
  type InputGroupProps,
  type InputProps,
} from "@chakra-ui/react";
import { LuSearch } from "react-icons/lu";
import { GenericCloseButton } from "./button";

interface SearchInputProps extends Omit<
  InputGroupProps,
  "children" | "startElement" | "endElement" | "onChange"
> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  size?: InputProps["size"];
}

export function SearchInput(props: SearchInputProps) {
  const {
    value,
    onChange,
    placeholder = "Search",
    size = "xs",
    ...rest
  } = props;

  return (
    <InputGroup
      startElement={<LuSearch />}
      endElement={
        value && <GenericCloseButton size="2xs" onClick={() => onChange("")} />
      }
      {...rest}
    >
      <Input
        size={size}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key == "Escape" && value) {
            e.stopPropagation();
            onChange("");
          }
        }}
      />
    </InputGroup>
  );
}
