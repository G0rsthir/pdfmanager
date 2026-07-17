import {
  listActiveTasksOptions,
  listTaskHistoryOptions,
} from "@/api/@tanstack/react-query.gen";
import type {
  PaginatedResponseTaskHistoryResponse,
  TaskActiveResponse,
} from "@/api/types.gen";
import { formatRelativeTime } from "@/common/date";
import { GenericIconButton } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/display";
import { QueryView } from "@/components/ui/feedback";
import { useAPIQuery } from "@/hooks/query";
import { usePagination } from "@/hooks/url";
import { Empty } from "@/pages/shared/common";
import {
  Badge,
  Box,
  Button,
  ButtonGroup,
  Group,
  Heading,
  HStack,
  Pagination,
  Progress,
  Spinner,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import {
  LuBan,
  LuCheck,
  LuChevronLeft,
  LuChevronRight,
  LuClipboardList,
  LuClock,
  LuCoffee,
  LuRefreshCw,
  LuTriangleAlert,
  LuX,
} from "react-icons/lu";

type TaskStatus = TaskActiveResponse["status"];

const STATUS_META: Record<
  TaskStatus,
  { label: string; palette: string; icon: React.ReactNode }
> = {
  pending: { label: "Queued", palette: "gray", icon: <LuClock /> },
  running: { label: "Running", palette: "blue", icon: <Spinner size="xs" /> },
  succeeded: { label: "Succeeded", palette: "green", icon: <LuCheck /> },
  failed: { label: "Failed", palette: "red", icon: <LuX /> },
  cancelled: { label: "Cancelled", palette: "gray", icon: <LuBan /> },
  interrupted: {
    label: "Interrupted",
    palette: "orange",
    icon: <LuTriangleAlert />,
  },
};

function StatusBadge({ status }: { status: TaskStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge colorPalette={meta.palette} variant="subtle">
      {meta.icon}
      {meta.label}
    </Badge>
  );
}

export function TasksPage() {
  const [pageState, setPage] = usePagination({ defaultSize: 4 });

  const activeTasksQ = useAPIQuery({
    ...listActiveTasksOptions(),
    refetchInterval: 5000,
  });

  const historyTasksQ = useAPIQuery({
    ...listTaskHistoryOptions({
      query: {
        ...pageState,
      },
    }),
    // TODO
    refetchInterval: 5000,
  });

  const refresh = () => {
    historyTasksQ.refetch();
    activeTasksQ.refetch();
  };

  return (
    <Stack gap={6}>
      <Group justify="space-between" align="center">
        <Heading size="2xl" fontWeight="normal">
          Tasks
        </Heading>
        <Button
          size="sm"
          variant="subtle"
          colorPalette="green"
          onClick={refresh}
        >
          <LuRefreshCw /> Refresh
        </Button>
      </Group>

      <Stack gap={3}>
        <SectionLabel>In progress</SectionLabel>
        <QueryView query={activeTasksQ}>
          {(data) => <ActiveTasksView tasks={data} />}
        </QueryView>
      </Stack>

      <Stack gap={3}>
        <SectionLabel>Recent</SectionLabel>
        <QueryView query={historyTasksQ}>
          {(data) => (
            <RecentRunsView
              runs={data}
              setPage={(page) => setPage({ page_index: page })}
            />
          )}
        </QueryView>
      </Stack>
    </Stack>
  );
}

function ActiveTasksView({ tasks }: { tasks: TaskActiveResponse[] }) {
  if (tasks.length == 0)
    return <Empty icon={<LuCoffee />} title="Nothing running" />;

  return (
    <Stack gap={3}>
      {tasks.map((task) => (
        <ActiveTaskCard key={task.id} task={task} />
      ))}
    </Stack>
  );
}

function ActiveTaskCard({ task }: { task: TaskActiveResponse }) {
  const value =
    task.status == "pending"
      ? 0
      : task.progress != null
        ? Math.round(task.progress * 100)
        : null;

  return (
    <Box borderWidth="1px" borderColor="border" rounded="md" p={4}>
      <Stack gap={3}>
        <Group justify="space-between" align="start">
          <Stack gap={0.5}>
            <Text fontWeight="medium">{task.display_name}</Text>
            {task.subject && (
              <Text fontSize="sm" color="fg.muted">
                {task.subject}
              </Text>
            )}
          </Stack>
          <StatusBadge status={task.status} />
        </Group>

        <Stack gap={1}>
          <Progress.Root
            flex="1"
            size="sm"
            value={value}
            colorPalette={task.status == "pending" ? "gray" : "blue"}
          >
            <HStack>
              <Progress.Track flex="1">
                <Progress.Range />
              </Progress.Track>
              <Progress.ValueText>
                {value != null ? `${value}%` : ""}
              </Progress.ValueText>
            </HStack>
          </Progress.Root>
          {task.detail && (
            <Text fontSize="xs" color="fg.muted" lineClamp={1}>
              {task.detail}
            </Text>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

function RecentRunsView(props: {
  runs: PaginatedResponseTaskHistoryResponse;
  setPage: (page: number) => void;
}) {
  const { runs, setPage } = props;

  if (runs.results.length === 0)
    return <Empty icon={<LuClipboardList />} title="No recent activity" />;

  return (
    <Stack>
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Task</Table.ColumnHeader>
            <Table.ColumnHeader>Status</Table.ColumnHeader>
            <Table.ColumnHeader>When</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="end">Duration</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {runs.results.map((run) => (
            <Table.Row key={run.id}>
              <Table.Cell>
                <Stack gap={0.5}>
                  <Text>{run.display_name}</Text>
                  {run.subject && (
                    <Text fontSize="xs" color="fg.muted" lineClamp={1}>
                      {run.subject}
                    </Text>
                  )}
                  {run.error && (
                    <Text fontSize="xs" color="fg.error" lineClamp={1}>
                      {run.error}
                    </Text>
                  )}
                </Stack>
              </Table.Cell>
              <Table.Cell>
                <StatusBadge status={run.status} />
              </Table.Cell>
              <Table.Cell>
                <Text color="fg.muted">
                  {formatRelativeTime(run.started_at)}
                </Text>
              </Table.Cell>
              <Table.Cell textAlign="end">
                <Text color="fg.muted">{run.display_duration}</Text>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
      <Group justifyContent="end">
        <Pagination.Root
          count={runs.row_count}
          pageSize={runs.page_size}
          page={runs.page_index}
          onPageChange={(e) => setPage(e.page)}
        >
          <ButtonGroup variant="ghost" size="sm">
            <Pagination.PrevTrigger asChild>
              <GenericIconButton>
                <LuChevronLeft />
              </GenericIconButton>
            </Pagination.PrevTrigger>

            <Pagination.Items
              render={(page) => (
                <GenericIconButton
                  variant={{ base: "ghost", _selected: "subtle" }}
                  colorPalette={{ base: "gray", _selected: "current" }}
                >
                  {page.value}
                </GenericIconButton>
              )}
            />

            <Pagination.NextTrigger asChild>
              <GenericIconButton>
                <LuChevronRight />
              </GenericIconButton>
            </Pagination.NextTrigger>
          </ButtonGroup>
        </Pagination.Root>
      </Group>
    </Stack>
  );
}
