import { GenericIconButton } from "@/components/ui/button";
import { ReactNavLink } from "@/components/ui/navlink";
import { useGlobalStore } from "@/store";
import { Box, Collapsible, Group, Icon, Text } from "@chakra-ui/react";
import { LuChevronDown, LuPin, LuPinOff, LuSearch } from "react-icons/lu";
import { useNavigate } from "react-router";
import { useShallow } from "zustand/shallow";

interface NavItemData {
  label: string;
  to: string;
}

const NAV_ITEMS: NavItemData[] = [
  { label: "Favorites", to: "/favorites" },
  { label: "Tags", to: "/tags" },
];

export function Overview() {
  const [pinned, setPinned] = useGlobalStore(
    useShallow((state) => [
      state.pinnedOverviewNodes,
      state.setPinnedOverviewNodes,
    ]),
  );

  const togglePin = (to: string) =>
    setPinned(
      pinned.includes(to)
        ? pinned.filter((item) => item !== to)
        : [...pinned, to],
    );

  const pinnedItems = NAV_ITEMS.filter((item) => pinned.includes(item.to));
  const unpinnedItems = NAV_ITEMS.filter((item) => !pinned.includes(item.to));

  return (
    <Box mb={10}>
      <SearchLink />
      <Collapsible.Root defaultOpen={pinned.length == 0} mt="4">
        <Collapsible.Trigger asChild>
          <Group
            as="button"
            w="full"
            justifyContent="space-between"
            cursor="pointer"
            mb="2"
          >
            <Text fontWeight="semibold">Overview</Text>
            <Collapsible.Indicator
              transition="transform 0.2s"
              _open={{ transform: "rotate(180deg)" }}
            >
              <Icon color="fg.muted">
                <LuChevronDown size={16} />
              </Icon>
            </Collapsible.Indicator>
          </Group>
        </Collapsible.Trigger>

        {/* Pinned items stay visible even when the section is collapsed */}
        {pinnedItems.map((item) => (
          <NavItem key={item.to} item={item} pinned onTogglePin={togglePin} />
        ))}

        <Collapsible.Content>
          {unpinnedItems.map((item) => (
            <NavItem
              key={item.to}
              item={item}
              pinned={false}
              onTogglePin={togglePin}
            />
          ))}
        </Collapsible.Content>
      </Collapsible.Root>
    </Box>
  );
}

function NavItem(props: {
  item: NavItemData;
  pinned: boolean;
  onTogglePin: (to: string) => void;
}) {
  const { item, pinned, onTogglePin } = props;

  return (
    <Box position="relative" className="group">
      <ReactNavLink label={item.label} to={item.to} />
      <GenericIconButton
        size="2xs"
        variant="ghost"
        color="fg.muted"
        position="absolute"
        top="50%"
        right="1"
        transform="translateY(-50%)"
        opacity={pinned ? 1 : 0}
        _groupHover={{ opacity: 1 }}
        onClick={(e) => {
          e.stopPropagation();
          onTogglePin(item.to);
        }}
      >
        {pinned ? <LuPinOff /> : <LuPin />}
      </GenericIconButton>
    </Box>
  );
}

function SearchLink() {
  const navigate = useNavigate();

  return (
    <Group
      as="button"
      onClick={() => navigate("/search")}
      w="full"
      px="3"
      py="2"
      rounded="md"
      border="1px solid"
      borderColor="border"
      cursor="pointer"
      _hover={{ bg: "bg.muted" }}
      transition="background 0.15s"
      gap="2"
    >
      <Icon color="fg.muted">
        <LuSearch size={14} />
      </Icon>
      <Text textStyle="sm" color="fg.muted">
        Search...
      </Text>
    </Group>
  );
}
