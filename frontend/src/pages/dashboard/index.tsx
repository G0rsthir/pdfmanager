import {
  listFilesOptions,
  listTagsOptions,
} from "@/api/@tanstack/react-query.gen";
import type { FileResponse } from "@/api/types.gen";
import { QueryView } from "@/components/ui/feedback";
import { useAPIQuery } from "@/hooks/query";
import {
  Card,
  Group,
  Heading,
  Icon,
  SimpleGrid,
  Skeleton,
  Stack,
  Stat,
  Text,
} from "@chakra-ui/react";
import { LuBookOpen, LuFile, LuTag } from "react-icons/lu";
import { NavLink } from "react-router";
import { Empty } from "../library/shared/common";
import { FileCard } from "../library/shared/file";

export function DashboardPage() {
  return (
    <Stack gap={8}>
      <Heading size="3xl" fontWeight="normal">
        Overview
      </Heading>

      <StatsSection />
      <ContinueReadingSection />
    </Stack>
  );
}

function StatsSection() {
  const filesQ = useAPIQuery({ ...listFilesOptions() });
  const tagsQ = useAPIQuery({ ...listTagsOptions() });

  return (
    <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
      <StatCard
        icon={<LuFile />}
        label="Files"
        value={filesQ.data?.length ?? 0}
        loading={filesQ.isLoading}
        iconColor="orange"
      />
      <StatCard
        icon={<LuTag />}
        label="Tags"
        value={tagsQ.data?.length ?? 0}
        loading={tagsQ.isLoading}
        iconColor="green"
      />
    </SimpleGrid>
  );
}

function StatCard(props: {
  icon: React.ReactNode;
  label: string;
  value: number;
  loading: boolean;
  iconColor?: string;
}) {
  const { icon, label, value, loading, iconColor = "purple" } = props;
  return (
    <Card.Root variant="outline" size="sm">
      <Card.Body>
        <Group gap={4} align="center" colorPalette={iconColor}>
          <Stack
            align="center"
            justify="center"
            w="12"
            h="12"
            rounded="full"
            bg="colorPalette.subtle"
            color="colorPalette.fg"
            flexShrink={0}
            fontSize="xl"
          >
            {icon}
          </Stack>
          <Stat.Root gap={0}>
            <Stat.Label color="fg.muted">{label}</Stat.Label>
            {loading ? (
              <Skeleton h="7" w="16" mb={1} />
            ) : (
              <Stat.ValueText fontSize="2xl" fontWeight="bold">
                {value}
              </Stat.ValueText>
            )}
          </Stat.Root>
        </Group>
      </Card.Body>
    </Card.Root>
  );
}

function ContinueReadingSection() {
  const query = useAPIQuery({ ...listFilesOptions() });

  return (
    <Section title="Continue reading" icon={<LuBookOpen />}>
      <QueryView query={query}>
        {(files) => {
          const items = files
            .filter(isInProgress)
            .sort((a, b) => progressRatio(b) - progressRatio(a))
            .slice(0, 6);

          if (items.length === 0) {
            return (
              <Empty
                icon={<LuBookOpen />}
                title="Nothing in progress. Open a file to start reading."
              />
            );
          }

          return (
            <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
              {items.map((f) => (
                <FileCard key={f.id} file={f} includeReadDate />
              ))}
            </SimpleGrid>
          );
        }}
      </QueryView>
    </Section>
  );
}

function Section(props: {
  title: string;
  icon?: React.ReactNode;
  link?: string;
  children: React.ReactNode;
}) {
  const { title, icon, link, children } = props;
  return (
    <Stack gap={4}>
      <Group justify="space-between" align="center">
        <Group gap={2}>
          {icon && <Icon color="fg.muted">{icon}</Icon>}
          <Heading size="lg">{title}</Heading>
        </Group>
        {link && (
          <NavLink to={link}>
            <Text textStyle="sm">See all</Text>
          </NavLink>
        )}
      </Group>
      {children}
    </Stack>
  );
}

function isInProgress(f: FileResponse) {
  return (
    f.page_count > 0 &&
    f.state.current_page > 1 &&
    f.state.current_page < f.page_count
  );
}

function progressRatio(f: FileResponse) {
  if (!f.page_count) return 0;
  return f.state.updated_at?.getTime() ?? 0;
}
