import {
  ColorModeSegment,
  ColorPaletteSelectList,
} from "@/components/ui/color-mode";
import { Block, SettingsOption } from "@/components/ui/display";
import { PaletteColors } from "@/config/theme";
import { useFileClickAction } from "@/hooks/layout";
import { LayoutRadioCards } from "@/pages/library/shared/layout";
import { useGlobalStore } from "@/store";
import { Stack } from "@chakra-ui/react";
import { useShallow } from "zustand/shallow";
import { FileClickActionRadioCards } from "../library/shared/file";

export function PreferencesContent() {
  return (
    <Block bg="bg.panel">
      <Stack gap={8}>
        <SettingsOption
          title="Color mode"
          description="Only applies to this browser"
          labelSpan={4}
          fieldSpan={8}
        >
          <ColorModeSegment />
        </SettingsOption>
        <SettingsOption
          title="Color palette"
          description="Only applies to this browser"
          labelSpan={4}
          fieldSpan={8}
        >
          <PaletteSelect />
        </SettingsOption>
        <SettingsOption
          title="Default Library Layout"
          description="Only applies to this browser"
          labelSpan={4}
          fieldSpan={8}
        >
          <DefaultLayoutSelect />
        </SettingsOption>
        <SettingsOption
          title="Opening a file"
          description="Where clicking a file in the library takes you"
          labelSpan={4}
          fieldSpan={8}
        >
          <FileClickActionSelect />
        </SettingsOption>
      </Stack>
    </Block>
  );
}

const colors = PaletteColors.filter(
  (color) => !["black", "white"].includes(color.value),
);

export function PaletteSelect() {
  const state = useGlobalStore(
    useShallow((state) => ({
      primaryColor: state.primaryColor,
      updatePrimaryColor: state.updatePrimaryColor,
    })),
  );

  return (
    <ColorPaletteSelectList
      colors={colors}
      onValueChange={state.updatePrimaryColor}
      defaultValue={state.primaryColor}
    />
  );
}

function DefaultLayoutSelect() {
  const state = useGlobalStore(
    useShallow((state) => ({
      defaultLibraryLayout: state.defaultLibraryLayout,
      setDefaultLibraryLayout: state.setDefaultLibraryLayout,
    })),
  );

  return (
    <LayoutRadioCards
      value={state.defaultLibraryLayout}
      onChange={state.setDefaultLibraryLayout}
    />
  );
}

function FileClickActionSelect() {
  const [action, setAction] = useFileClickAction();

  return <FileClickActionRadioCards value={action} onChange={setAction} />;
}
