"use client";

import { ChakraProvider, createSystem, defaultConfig } from "@chakra-ui/react";
import { useMemo } from "react";
import { ColorModeProvider, type ColorModeProviderProps } from "./color-mode";

export function Provider(
  props: ColorModeProviderProps & { primaryColor: string },
) {
  const { primaryColor = "blue", ...rest } = props;

  const system = useMemo(
    () =>
      createSystem(defaultConfig, {
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
            radii: {
              l1: { value: "0.125rem" },
              l2: { value: "0.25rem" },
              l3: { value: "0.375rem" },
            },
          },
        },
      }),
    [primaryColor],
  );

  return (
    <ChakraProvider value={system}>
      <ColorModeProvider {...rest} />
    </ChakraProvider>
  );
}
