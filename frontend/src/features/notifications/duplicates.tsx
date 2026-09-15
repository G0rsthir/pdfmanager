import { listDuplicateFilesOptions } from "@/api/@tanstack/react-query.gen";
import type { DuplicateFileGroupResponse } from "@/api/types.gen";
import { formatBytes } from "@/common/format";
import { Checksum } from "@/components/ui/display";
import { QueryView } from "@/components/ui/feedback";
import { useAPIQuery } from "@/hooks/query";
import { Group, Stack, Text } from "@chakra-ui/react";
import { FileTable } from "../library/file/views";

export function DuplicateFilesDetails() {
  const query = useAPIQuery({ ...listDuplicateFilesOptions() });

  return (
    <QueryView query={query}>
      {(groups) => (
        <Stack gap="6">
          <Text textStyle="sm" color="fg.muted">
            Files in each group have identical content
          </Text>
          {groups.map((group) => (
            <DuplicateGroup key={group.file_hash} group={group} />
          ))}
        </Stack>
      )}
    </QueryView>
  );
}

function DuplicateGroup({ group }: { group: DuplicateFileGroupResponse }) {
  return (
    <Stack gap="2">
      <Group gap="3" textStyle="xs" color="fg.muted">
        <Text fontWeight="medium" color="fg">
          {group.files.length} copies
        </Text>
        <Text>{formatBytes(group.files[0].file_size)}</Text>
        <Checksum
          value={group.file_hash}
          label={`${group.file_hash.slice(0, 12)}…`}
        />
      </Group>
      <FileTable files={group.files} />
    </Stack>
  );
}
