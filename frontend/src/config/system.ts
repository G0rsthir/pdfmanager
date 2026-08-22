import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

export const DEFAULT_PRIMARY_COLOR = "blue";

export const createAppConfig = (primaryColor: string) =>
  defineConfig({
    globalCss: {
      body: {
        colorPalette: primaryColor,
      },
    },
    theme: {
      tokens: {
        fonts: {
          body: { value: "var(--font-outfit)" },
        },
      },
      semanticTokens: {
        colors: {
          accent: {
            fg: { value: `{colors.${primaryColor}.fg}` },
            solid: { value: `{colors.${primaryColor}.solid}` },
            contrast: { value: `{colors.${primaryColor}.contrast}` },
            subtle: { value: `{colors.${primaryColor}.subtle}` },
          },
        },
        radii: {
          l1: { value: "0.125rem" },
          l2: { value: "0.25rem" },
          l3: { value: "0.375rem" },
        },
      },
    },
  });

/**
 * Static instance for 'chakra typegen' (see the 'typegen' npm script)
 */
export const system = createSystem(
  defaultConfig,
  createAppConfig(DEFAULT_PRIMARY_COLOR),
);

export default system;
