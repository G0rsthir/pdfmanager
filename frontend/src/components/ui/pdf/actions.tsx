import {
  ActionBar,
  Box,
  Button,
  Grid,
  GridItem,
  Group,
  Input,
  Menu,
  Popover,
  Separator,
  Stack,
  Text,
} from "@chakra-ui/react";
import {
  LuArrowLeft,
  LuBookmark,
  LuCaseSensitive,
  LuChevronDown,
  LuChevronUp,
  LuDownload,
  LuMaximize,
  LuMinimize,
  LuMinus,
  LuPanelRight,
  LuPlus,
  LuRotateCcw,
  LuRotateCw,
  LuSearch,
  LuSettings2,
  LuWholeWord,
} from "react-icons/lu";
import { GenericCloseButton } from "../button";
import { ViewerIconButton, ViewerPortal } from "./portal";
import type { Bookmark, SearchOptions, ToolId, ZoomPreset } from "./types";

function isSpecialScale(value: string): boolean {
  return ["auto", "page-fit", "page-width", "page-actual"].includes(value);
}

interface ToolbarProps {
  currentPage: number;
  numPages: number;
  pageInputValue: string;
  zoomPresets: ZoomPreset[];
  scaleValue: string;
  handlePageInput: (value: string) => void;
  handleDownload: () => void;
  commitPageInput: () => void;
  goToPage: (page: number) => void;
  setZoom: (level: number | string) => void;
  rotateCCW: () => void;
  rotateCW: () => void;
  toggleShowSearch: () => void;
  toggleAnnotations: () => void;
  showAnnotations: boolean;
  activeTool: ToolId;
  setTool: (tool: ToolId) => void;
  canAnnotate: boolean;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

export function Toolbar(props: ToolbarProps) {
  const {
    currentPage,
    pageInputValue,
    numPages,
    zoomPresets,
    scaleValue,
    commitPageInput,
    handlePageInput,
    handleDownload,
    goToPage,
    setZoom,
    rotateCCW,
    rotateCW,
    toggleShowSearch,
    toggleAnnotations,
    showAnnotations,
    isFullscreen,
    toggleFullscreen,
    zoomIn,
    zoomOut,
  } = props;

  const displayScale = isSpecialScale(scaleValue)
    ? scaleValue
    : `${Math.round(parseFloat(scaleValue) * 100)}%`;

  return (
    <Grid
      templateColumns="1fr auto 1fr"
      alignItems="center"
      gap="1"
      px="3"
      py="2"
      bg="bg.subtle"
      borderBottomWidth="1px"
      flexShrink={0}
    >
      <GridItem />

      <Group gap="1">
        <Group gap="1" align="center">
          <ViewerIconButton
            label="Previous page"
            size="xs"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <LuChevronUp />
          </ViewerIconButton>
          <Group gap="1" align="center">
            <Input
              size="xs"
              w="12"
              textAlign="center"
              value={pageInputValue}
              onChange={(e) => handlePageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key == "Enter") commitPageInput();
              }}
              onBlur={commitPageInput}
            />
            <Text textStyle="xs" color="fg.muted" whiteSpace="nowrap">
              / {numPages}
            </Text>
          </Group>
          <ViewerIconButton
            label="Next page"
            size="xs"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= numPages}
          >
            <LuChevronDown />
          </ViewerIconButton>
        </Group>

        <Separator orientation="vertical" h="5" />

        <Group gap="1" align="center">
          <ViewerIconButton label="Zoom out" size="xs" onClick={zoomOut}>
            <LuMinus />
          </ViewerIconButton>

          <Menu.Root>
            <Menu.Trigger asChild>
              <Box
                as="button"
                textStyle="xs"
                minW="16"
                textAlign="center"
                whiteSpace="nowrap"
                cursor="pointer"
                borderRadius="sm"
                _hover={{ bg: "bg.emphasized" }}
                px="1"
                py="0.5"
              >
                {displayScale}
              </Box>
            </Menu.Trigger>
            <ViewerPortal>
              <Menu.Positioner>
                <Menu.Content minW="28">
                  {zoomPresets.map((preset) => (
                    <Menu.Item
                      key={preset.value}
                      value={String(preset.value)}
                      onClick={() => setZoom(preset.value)}
                      fontWeight={
                        scaleValue == preset.value ? "bold" : "normal"
                      }
                    >
                      {preset.label}
                    </Menu.Item>
                  ))}
                </Menu.Content>
              </Menu.Positioner>
            </ViewerPortal>
          </Menu.Root>

          <ViewerIconButton label="Zoom in" size="xs" onClick={zoomIn}>
            <LuPlus />
          </ViewerIconButton>
        </Group>

        <Separator orientation="vertical" h="5" />

        <ViewerIconButton label="Search" size="xs" onClick={toggleShowSearch}>
          <LuSearch />
        </ViewerIconButton>
        <ViewerIconButton
          label={showAnnotations ? "Hide annotations" : "Show annotations"}
          size="xs"
          variant={showAnnotations ? "subtle" : "ghost"}
          colorPalette={showAnnotations ? "colorPalette.600" : undefined}
          aria-pressed={showAnnotations}
          onClick={toggleAnnotations}
        >
          <LuPanelRight />
        </ViewerIconButton>
      </Group>

      <GridItem justifySelf="end">
        <ViewerIconButton
          label={isFullscreen ? "Exit full screen" : "Full screen"}
          size="xs"
          variant={isFullscreen ? "subtle" : "ghost"}
          colorPalette={isFullscreen ? "colorPalette.600" : undefined}
          onClick={toggleFullscreen}
        >
          {isFullscreen ? <LuMinimize /> : <LuMaximize />}
        </ViewerIconButton>

        <SettingsPopover
          rotateCCW={rotateCCW}
          rotateCW={rotateCW}
          download={handleDownload}
        />
      </GridItem>
    </Grid>
  );
}

interface SettingsPopoverProps {
  rotateCCW: () => void;
  rotateCW: () => void;
  download: () => void;
}

function SettingsPopover(props: SettingsPopoverProps) {
  const { rotateCCW, rotateCW, download } = props;

  return (
    <Popover.Root positioning={{ placement: "bottom-end" }}>
      <Popover.Trigger asChild>
        <ViewerIconButton label="Settings" size="xs">
          <LuSettings2 />
        </ViewerIconButton>
      </Popover.Trigger>
      <ViewerPortal>
        <Popover.Positioner>
          <Popover.Content width="64">
            <Popover.Body p="3">
              <Stack gap="4">
                <SettingsRow label="Rotation">
                  <Group attached>
                    <Button
                      size="xs"
                      variant="outline"
                      colorPalette="gray"
                      onClick={rotateCCW}
                    >
                      <LuRotateCcw />
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      colorPalette="gray"
                      onClick={rotateCW}
                    >
                      <LuRotateCw />
                    </Button>
                  </Group>
                </SettingsRow>

                <SettingsRow label="Document">
                  <Button
                    size="xs"
                    variant="subtle"
                    colorPalette="green"
                    onClick={download}
                  >
                    <LuDownload />
                    Download
                  </Button>
                </SettingsRow>
              </Stack>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </ViewerPortal>
    </Popover.Root>
  );
}

function SettingsRow(props: { label: string; children: React.ReactNode }) {
  const { label, children } = props;

  return (
    <Group justify="space-between" align="center" gap="3">
      <Text textStyle="xs" color="fg.muted" whiteSpace="nowrap">
        {label}
      </Text>
      {children}
    </Group>
  );
}

interface SearchBarProps {
  ref: React.Ref<HTMLInputElement>;
  searchQuery: string;
  matchCount: {
    current: number;
    total: number;
  };
  handleSearchChange: (value: string) => void;
  closeSearch: () => void;
  findNextMatch: () => void;
  findPrevMatch: () => void;
  searchOptions: SearchOptions;
  onToggleSearchOption: (option: keyof SearchOptions) => void;
}

function SearchToggle(props: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onToggle: () => void;
}) {
  const { label, icon, active, onToggle } = props;

  return (
    <Button
      size="xs"
      variant={active ? "subtle" : "ghost"}
      colorPalette={active ? undefined : "gray"}
      color={active ? "colorPalette.fg" : "fg.muted"}
      aria-pressed={active}
      title={label}
      onClick={onToggle}
      fontWeight={active ? "medium" : "normal"}
    >
      {icon}
      {label}
    </Button>
  );
}

export function SearchBar(props: SearchBarProps) {
  const {
    ref,
    searchQuery,
    matchCount,
    handleSearchChange,
    closeSearch,
    findNextMatch,
    findPrevMatch,
    searchOptions,
    onToggleSearchOption,
  } = props;

  return (
    <Group
      gap="2"
      px="3"
      py="2"
      bg="bg.panel"
      borderBottomWidth="1px"
      flexShrink={0}
    >
      <Input
        ref={ref}
        size="xs"
        placeholder="Find in document..."
        value={searchQuery}
        onChange={(e) => handleSearchChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key == "Enter") {
            if (e.shiftKey) findPrevMatch();
            else findNextMatch();
          } else if (e.key == "Escape") {
            closeSearch();
          }
        }}
        maxW="64"
      />
      {searchQuery && matchCount.total > 0 && (
        <Text textStyle="xs" color="fg.muted" whiteSpace="nowrap">
          {matchCount.current} / {matchCount.total}
        </Text>
      )}
      {searchQuery && matchCount.total == 0 && (
        <Text textStyle="xs" color="fg.error" whiteSpace="nowrap">
          No results
        </Text>
      )}
      <Group gap="0">
        <ViewerIconButton
          label="Previous match"
          size="xs"
          onClick={findPrevMatch}
          disabled={!searchQuery}
        >
          <LuChevronUp />
        </ViewerIconButton>
        <ViewerIconButton
          label="Next match"
          size="xs"
          onClick={findNextMatch}
          disabled={!searchQuery}
        >
          <LuChevronDown />
        </ViewerIconButton>
      </Group>

      <Group gap="2">
        <SearchToggle
          label="Match case"
          icon={<LuCaseSensitive />}
          active={searchOptions.caseSensitive}
          onToggle={() => onToggleSearchOption("caseSensitive")}
        />
        <SearchToggle
          label="Whole words"
          icon={<LuWholeWord />}
          active={searchOptions.entireWord}
          onToggle={() => onToggleSearchOption("entireWord")}
        />
      </Group>

      <GenericCloseButton size="xs" onClick={closeSearch} />
    </Group>
  );
}

interface PagePeekBarProps {
  open: boolean;
  bookmark: Bookmark | null;
  currentPage: number;
  onReturn: () => void;
  onContinue: () => void;
}

export function PagePeekBar(props: PagePeekBarProps) {
  const { open, bookmark, currentPage, onReturn, onContinue } = props;

  return (
    <ActionBar.Root
      open={open}
      closeOnInteractOutside={false}
      placement="bottom"
    >
      <ActionBar.Positioner position="absolute">
        <ActionBar.Content>
          <ActionBar.SelectionTrigger>
            Peeking page {currentPage}
          </ActionBar.SelectionTrigger>
          <ActionBar.Separator />
          <Button
            colorPalette="gray"
            variant="outline"
            size="sm"
            onClick={onReturn}
            disabled={currentPage == bookmark?.page}
          >
            <LuArrowLeft />
            Back to page {bookmark?.page ?? 1}
          </Button>
          <Button variant="surface" size="sm" onClick={onContinue}>
            <LuBookmark />
            Continue from here
          </Button>
        </ActionBar.Content>
      </ActionBar.Positioner>
    </ActionBar.Root>
  );
}
