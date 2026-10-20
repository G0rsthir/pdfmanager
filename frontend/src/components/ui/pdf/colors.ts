import { PaletteColors } from "@/config/theme";

export const HighlightColors = PaletteColors.filter((color) =>
  ["yellow", "green", "blue", "pink", "red"].includes(color.value),
);
