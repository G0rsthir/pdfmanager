import { HoverCard, parseColor, Text } from "@chakra-ui/react";
import { createPortal } from "react-dom";
import { boundingRect, toRenderedRects } from "./geometry";
import { useElementSize } from "./hooks";
import { ViewerPortal } from "./portal";
import type { AnnotationDraft, AnnotationItem, NormalizedRect } from "./types";
import { AnnotationVector } from "./vector";

function percent(value: number): string {
  return `${value * 100}%`;
}

function boxStyle(rect: NormalizedRect): React.CSSProperties {
  return {
    top: percent(rect.top),
    left: percent(rect.left),
    width: percent(rect.width),
    height: percent(rect.height),
  };
}

export function AnnotationLayers(props: {
  roots: Record<number, HTMLElement>;
  annotations: AnnotationItem[];
  selectedId: string | null;
  rotation: number;
  draft?: AnnotationDraft | null;
  onOpen: (annotation: AnnotationItem) => void;
}) {
  const { roots, annotations, selectedId, rotation, draft, onOpen } = props;

  return (
    <>
      {Object.entries(roots).map(([page, root]) =>
        createPortal(
          <PageAnnotations
            root={root}
            annotations={annotations.filter(
              (item) => item.page == Number(page),
            )}
            selectedId={selectedId}
            rotation={rotation}
            draft={draft?.page == Number(page) ? draft : null}
            onOpen={onOpen}
          />,
          root,
          String(page),
        ),
      )}
    </>
  );
}

function PageAnnotations(props: {
  root: HTMLElement;
  annotations: AnnotationItem[];
  selectedId: string | null;
  rotation: number;
  draft: AnnotationDraft | null;
  onOpen: (annotation: AnnotationItem) => void;
}) {
  const { root, annotations, selectedId, rotation, draft, onOpen } = props;

  // The root fills the page, so this is the rendered page size
  const size = useElementSize(root);

  return (
    <>
      {annotations.map((annotation) => (
        <Annotation
          key={annotation.id}
          annotation={annotation}
          selected={annotation.id == selectedId}
          rotation={rotation}
          size={size}
          onOpen={onOpen}
        />
      ))}

      {draft && draft.geometry.type != "highlight" && size.width > 0 && (
        <svg
          className="custom-annotation-vector"
          viewBox={`0 0 ${size.width} ${size.height}`}
          width="100%"
          height="100%"
          opacity={0.5}
        >
          <AnnotationVector
            geometry={draft.geometry}
            color="gray"
            rotation={rotation}
            size={size}
          />
        </svg>
      )}
    </>
  );
}

function Annotation(props: {
  annotation: AnnotationItem;
  selected: boolean;
  rotation: number;
  size: { width: number; height: number };
  onOpen: (annotation: AnnotationItem) => void;
}) {
  const { annotation, selected, rotation, size, onOpen } = props;

  // Stored rects are unrotated
  const rects = toRenderedRects(annotation.rects, rotation);
  const bounds = boundingRect(rects);
  if (!bounds) return null;

  const fill = parseColor(annotation.color)
    .withChannelValue("alpha", 0.3)
    .toString("rgba");

  return (
    <>
      {annotation.geometry.type == "highlight" &&
        rects.map((rect, index) => (
          <div
            key={index}
            className="custom-annotation-highlight"
            style={{ ...boxStyle(rect), background: fill }}
          />
        ))}

      {annotation.geometry.type != "highlight" && size.width > 0 && (
        <svg
          className="custom-annotation-vector"
          viewBox={`0 0 ${size.width} ${size.height}`}
          width="100%"
          height="100%"
        >
          <AnnotationVector
            geometry={annotation.geometry}
            color={annotation.color}
            rotation={rotation}
            size={size}
          />
        </svg>
      )}

      {selected && (
        <div className="custom-annotation-selection" style={boxStyle(bounds)} />
      )}

      <AnnotationMarker
        annotation={annotation}
        bounds={bounds}
        onOpen={onOpen}
      />
    </>
  );
}

function AnnotationMarker(props: {
  annotation: AnnotationItem;
  bounds: NormalizedRect;
  onOpen: (annotation: AnnotationItem) => void;
}) {
  const { annotation, bounds } = props;

  const marker = (
    <button
      type="button"
      className="custom-annotation-marker"
      style={{
        top: percent(bounds.top),
        height: percent(bounds.height),
        background: annotation.color,
      }}
    />
  );

  return (
    <HoverCard.Root
      openDelay={300}
      closeDelay={100}
      positioning={{ placement: "left-start" }}
    >
      <HoverCard.Trigger asChild>{marker}</HoverCard.Trigger>
      <ViewerPortal>
        <HoverCard.Positioner maxW="sm">
          <HoverCard.Content p="3">
            <HoverCard.Arrow>
              <HoverCard.ArrowTip />
            </HoverCard.Arrow>
            {annotation.body ? (
              <Text
                textStyle="sm"
                whiteSpace="pre-wrap"
                wordBreak="break-word"
                lineClamp={8}
              >
                {annotation.body}
              </Text>
            ) : (
              <Text textStyle="sm" fontStyle="italic">
                No comment
              </Text>
            )}
          </HoverCard.Content>
        </HoverCard.Positioner>
      </ViewerPortal>
    </HoverCard.Root>
  );
}
