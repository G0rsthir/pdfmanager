"use client";

import { createAppConfig, DEFAULT_PRIMARY_COLOR } from "@/config/system";
import { ChakraProvider, createSystem, defaultConfig } from "@chakra-ui/react";
import { useMemo } from "react";
import { ColorModeProvider, type ColorModeProviderProps } from "./color-mode";

export function Provider(
  props: ColorModeProviderProps & { primaryColor: string },
) {
  const { primaryColor = DEFAULT_PRIMARY_COLOR, ...rest } = props;

  const system = useMemo(
    () => createSystem(defaultConfig, createAppConfig(primaryColor)),
    [primaryColor],
  );

  return (
    <ChakraProvider value={system}>
      <ColorModeProvider {...rest} />
    </ChakraProvider>
  );
}
