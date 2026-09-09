import type { TagResponse } from "@/api/types.gen";
import { useSearchParamMulti } from "@/hooks/url";
import { Badge } from "@chakra-ui/react";
import { NavLink } from "react-router";

export function SearchTag({ tag }: { tag: TagResponse }) {
  return (
    <NavLink to={`/search?tag=${tag.name}`}>
      <Badge
        key={tag.id}
        size="sm"
        colorPalette={tag.color}
        transition="background 0.15s, color 0.15s"
        _hover={{
          bg: "colorPalette.solid",
          color: "colorPalette.contrast",
        }}
      >
        {tag.name}
      </Badge>
    </NavLink>
  );
}

export function FilterTag({ tag }: { tag: TagResponse }) {
  const [searchParams, setSearchParams] = useSearchParamMulti({
    tag: { type: "array" },
  });

  return (
    <Badge
      onClick={() =>
        setSearchParams({ tag: [...new Set([...searchParams.tag, tag.name])] })
      }
      key={tag.id}
      size="sm"
      colorPalette={tag.color}
      transition="background 0.15s, color 0.15s"
      _hover={{
        bg: "colorPalette.solid",
        color: "colorPalette.contrast",
      }}
    >
      {tag.name}
    </Badge>
  );
}
