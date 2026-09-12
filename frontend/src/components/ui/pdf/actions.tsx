import {
  ActionBar,
  Box,
  Button,
  Grid,
  GridItem,
  Group,
  Icon,
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
  LuHighlighter,
  LuMaximize,
  LuMessageSquare,
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
import { GenericCloseButton, GenericIconButton } from "../button";
import { useSelectionPopover } from "./hooks";
import { ViewerPortal } from "./portal";
import type {
  Bookmark,
  PopoverAction,
  SearchOptions,
  SelectionPopoverState,
  ZoomPreset,
} from "./types";

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
          <GenericIconButton
            size="xs"
            variant="ghost"
            aria-label="Previous page"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <LuChevronUp />
          </GenericIconButton>
          <Group gap="1" align="center">
            <Input
              size="xs"
              w="12"
              textAlign="center"
              value={pageInputValue}
              onChange={(e) => handlePageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitPageInput();
              }}
              onBlur={commitPageInput}
            />
            <Text textStyle="xs" color="fg.muted" whiteSpace="nowrap">
              / {numPages}
            </Text>
          </Group>
          <GenericIconButton
            size="xs"
            variant="ghost"
            aria-label="Next page"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= numPages}
          >
            <LuChevronDown />
          </GenericIconButton>
        </Group>

        <Separator orientation="vertical" h="5" />

        <Group gap="1" align="center">
          <GenericIconButton
            size="xs"
            variant="ghost"
            aria-label="Zoom out"
            onClick={zoomOut}
          >
            <LuMinus />
          </GenericIconButton>

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
                        scaleValue === preset.value ? "bold" : "normal"
                      }
                    >
                      {preset.label}
                    </Menu.Item>
                  ))}
                </Menu.Content>
              </Menu.Positioner>
            </ViewerPortal>
          </Menu.Root>

          <GenericIconButton
            size="xs"
            variant="ghost"
            aria-label="Zoom in"
            onClick={zoomIn}
          >
            <LuPlus />
          </GenericIconButton>
        </Group>

        <Separator orientation="vertical" h="5" />

        <GenericIconButton
          size="xs"
          variant="ghost"
          aria-label="Search"
          onClick={toggleShowSearch}
        >
          <LuSearch />
        </GenericIconButton>
        <GenericIconButton
          size="xs"
          variant={showAnnotations ? "subtle" : "ghost"}
          aria-label="Toggle annotations"
          colorPalette={showAnnotations ? "colorPalette.600" : undefined}
          aria-pressed={showAnnotations}
          onClick={toggleAnnotations}
        >
          <LuPanelRight />
        </GenericIconButton>
      </Group>

      <GridItem justifySelf="end">
        <SettingsPopover
          rotateCCW={rotateCCW}
          rotateCW={rotateCW}
          download={handleDownload}
          isFullscreen={isFullscreen}
          toggleFullscreen={toggleFullscreen}
        />
      </GridItem>
    </Grid>
  );
}

interface SettingsPopoverProps {
  rotateCCW: () => void;
  rotateCW: () => void;
  download: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

function SettingsPopover(props: SettingsPopoverProps) {
  const { rotateCCW, rotateCW, download, isFullscreen, toggleFullscreen } =
    props;

  return (
    <Popover.Root positioning={{ placement: "bottom-end" }}>
      <Popover.Trigger asChild>
        <GenericIconButton size="xs" variant="ghost" aria-label="More actions">
          <LuSettings2 />
        </GenericIconButton>
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
                      aria-label="Rotate counter-clockwise"
                      onClick={rotateCCW}
                    >
                      <LuRotateCcw />
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      colorPalette="gray"
                      aria-label="Rotate clockwise"
                      onClick={rotateCW}
                    >
                      <LuRotateCw />
                    </Button>
                  </Group>
                </SettingsRow>

                <SettingsRow label="View">
                  <Button
                    size="xs"
                    variant="outline"
                    colorPalette="gray"
                    onClick={toggleFullscreen}
                  >
                    {isFullscreen ? <LuMinimize /> : <LuMaximize />}
                    {isFullscreen ? "Exit full screen" : "Full screen"}
                  </Button>
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
          if (e.key === "Enter") {
            if (e.shiftKey) findPrevMatch();
            else findNextMatch();
          } else if (e.key === "Escape") {
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
      {searchQuery && matchCount.total === 0 && (
        <Text textStyle="xs" color="fg.error" whiteSpace="nowrap">
          No results
        </Text>
      )}
      <Group gap="0">
        <GenericIconButton
          size="xs"
          variant="ghost"
          aria-label="Previous match"
          onClick={findPrevMatch}
          disabled={!searchQuery}
        >
          <LuChevronUp />
        </GenericIconButton>
        <GenericIconButton
          size="xs"
          variant="ghost"
          aria-label="Next match"
          onClick={findNextMatch}
          disabled={!searchQuery}
        >
          <LuChevronDown />
        </GenericIconButton>
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

export function SelectionPopover(props: {
  containerRef: React.RefObject<HTMLElement | null>;
  disabled?: boolean;
  onSelect: (action: PopoverAction, popover: SelectionPopoverState) => void;
}) {
  const { containerRef, disabled, onSelect } = props;

  const [popover] = useSelectionPopover(containerRef);

  if (!popover || disabled) return null;

  return (
    <Box
      position="absolute"
      top={`${popover.anchor.y + 4}px`}
      left={`${popover.anchor.x - 50}px`}
      zIndex={50}
      bg="bg.panel"
      rounded="md"
      shadow="md"
      borderWidth="1px"
      px={2}
      py={1}
      // Block native focus loss.
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <Group gap="2">
        <Icon
          size="xs"
          cursor="pointer"
          onClick={() => onSelect("comment", popover)}
          _hover={{
            color: "colorPalette.400",
          }}
        >
          <LuMessageSquare />
        </Icon>
        <Icon
          size="xs"
          cursor="pointer"
          onClick={() => onSelect("highlight", popover)}
          _hover={{
            color: "colorPalette.400",
          }}
        >
          <LuHighlighter />
        </Icon>
      </Group>
    </Box>
  );
}
