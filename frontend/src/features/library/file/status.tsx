import { patchFileStateMutation } from "@/api/@tanstack/react-query.gen";
import type { FileResponse } from "@/api/types.gen";
import { FileStatusEnum, ResourcePermissionCapability } from "@/api/types.gen";
import { useCan } from "@/common/auth/hooks";
import { useAPIMutation } from "@/hooks/query";
import {
  createListCollection,
  Icon,
  Portal,
  Select,
  Span,
  Text,
  useSelectContext,
  type SelectRootProps,
} from "@chakra-ui/react";
import {
  LuBookmark,
  LuBookOpen,
  LuCircleCheck,
  LuCircleDashed,
  LuCircleX,
  LuPause,
} from "react-icons/lu";

interface StatusMeta {
  label: string;
  palette: string;
  icon: React.ReactNode;
}

const STATUS_META: Record<FileStatusEnum, StatusMeta> = {
  unread: { label: "Unread", palette: "gray", icon: <LuCircleDashed /> },
  want_to_read: {
    label: "Want to read",
    palette: "purple",
    icon: <LuBookmark />,
  },
  reading: { label: "Reading", palette: "blue", icon: <LuBookOpen /> },
  on_hold: { label: "On hold", palette: "orange", icon: <LuPause /> },
  read: { label: "Read", palette: "green", icon: <LuCircleCheck /> },
  dropped: { label: "Dropped", palette: "red", icon: <LuCircleX /> },
};

const STATUS_ORDER: FileStatusEnum[] = [
  FileStatusEnum.UNREAD,
  FileStatusEnum.WANT_TO_READ,
  FileStatusEnum.READING,
  FileStatusEnum.ON_HOLD,
  FileStatusEnum.READ,
  FileStatusEnum.DROPPED,
];

const statusCollection = createListCollection({
  items: STATUS_ORDER.map((status) => ({
    value: status,
    label: STATUS_META[status].label,
  })),
});

export function StatusSelect(props: {
  value?: FileStatusEnum;
  onChange: (status: FileStatusEnum) => void;
  onBlur?: () => void;
  size?: SelectRootProps["size"];
  width?: string;
  disabled?: boolean;
}) {
  const {
    value,
    disabled,
    onChange,
    onBlur,
    size = "xs",
    width = "150px",
  } = props;

  return (
    <Select.Root
      collection={statusCollection}
      size={size}
      width={width}
      positioning={{ sameWidth: true }}
      value={value ? [value] : []}
      onValueChange={({ value: next }) => {
        const status = next[0] as FileStatusEnum | undefined;
        if (!status || status == value) return;
        onChange(status);
      }}
      onInteractOutside={onBlur}
      disabled={disabled}
    >
      <Select.HiddenSelect />
      <Select.Control>
        <Select.Trigger>
          <SelectedStatusValue />
        </Select.Trigger>
        <Select.IndicatorGroup>
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      <Portal>
        <Select.Positioner>
          <Select.Content>
            {statusCollection.items.map((item) => (
              <Select.Item item={item} key={item.value}>
                <StatusOption status={item.value} />
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  );
}

export function ReadingStatusSelect({ file }: { file: FileResponse }) {
  const { mutate } = useAPIMutation({
    ...patchFileStateMutation(),
    errorNotification: "Status update failed",
  });

  const can = useCan(file);

  const canWrite = can(ResourcePermissionCapability.WRITE);

  return (
    <StatusSelect
      value={file.state.status}
      onChange={(status) => mutate({ body: { status }, path: { id: file.id } })}
      disabled={!canWrite}
    />
  );
}

function SelectedStatusValue() {
  const select = useSelectContext();
  const selected = select.selectedItems.at(0) as
    | { value: FileStatusEnum }
    | undefined;

  if (!selected) return <Select.ValueText placeholder="Select status" />;

  return (
    <Select.ValueText>
      <StatusOption status={selected.value} />
    </Select.ValueText>
  );
}

function StatusOption({ status }: { status: FileStatusEnum }) {
  const meta = STATUS_META[status];

  return (
    <Span
      display="flex"
      alignItems="center"
      gap={2}
      colorPalette={meta.palette}
    >
      <Icon color="colorPalette.fg">{meta.icon}</Icon>
      <Text color="colorPalette.fg">{meta.label}</Text>
    </Span>
  );
}
