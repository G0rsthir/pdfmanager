import { NOTE_RADIUS } from "./annotations";
import { toRenderedPoint } from "./geometry";
import type { AnnotationGeometry, NormalizedPoint } from "./types";

interface VectorProps {
  geometry: AnnotationGeometry;
  color: string;
  rotation: number;
  /**
   * Rendered page size in CSS px, so one SVG user unit is one px at any zoom
   */
  size: { width: number; height: number };
}

/**
 * The SVG body of a note, ink or shape annotation
 */
export function AnnotationVector(props: VectorProps) {
  const { geometry, color, rotation, size } = props;

  const at = (point: NormalizedPoint) => {
    const rendered = toRenderedPoint(point, rotation);
    return { x: rendered.x * size.width, y: rendered.y * size.height };
  };

  switch (geometry.type) {
    case "highlight":
      return null;

    case "note": {
      const center = at(geometry.point);
      return (
        <circle
          cx={center.x}
          cy={center.y}
          r={NOTE_RADIUS * size.width}
          fill={color}
          stroke="white"
          strokeWidth={1.5}
        />
      );
    }

    case "ink":
      return (
        <>
          {geometry.paths.map((path, index) => (
            <polyline
              key={index}
              points={path
                .map(at)
                .map((p) => `${p.x},${p.y}`)
                .join(" ")}
              fill="none"
              stroke={color}
              strokeWidth={geometry.width * size.width}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </>
      );

    case "shape": {
      const start = at(geometry.start);
      const end = at(geometry.end);
      const stroke = {
        stroke: color,
        strokeWidth: geometry.width * size.width,
        fill: geometry.fill ?? "none",
      };

      switch (geometry.shape) {
        case "rect":
          return (
            <rect
              x={Math.min(start.x, end.x)}
              y={Math.min(start.y, end.y)}
              width={Math.abs(end.x - start.x)}
              height={Math.abs(end.y - start.y)}
              {...stroke}
            />
          );

        case "ellipse":
          return (
            <ellipse
              cx={(start.x + end.x) / 2}
              cy={(start.y + end.y) / 2}
              rx={Math.abs(end.x - start.x) / 2}
              ry={Math.abs(end.y - start.y) / 2}
              {...stroke}
            />
          );

        case "line":
          return (
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              {...stroke}
              fill="none"
            />
          );

        case "arrow": {
          const head = geometry.width * size.width * 4;
          const angle = Math.atan2(end.y - start.y, end.x - start.x);
          const wing = (offset: number) => ({
            x: end.x - head * Math.cos(angle - offset),
            y: end.y - head * Math.sin(angle - offset),
          });
          const left = wing(Math.PI / 7);
          const right = wing(-Math.PI / 7);

          return (
            <>
              <line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                {...stroke}
                fill="none"
                strokeLinecap="round"
              />
              <polygon
                points={`${end.x},${end.y} ${left.x},${left.y} ${right.x},${right.y}`}
                fill={color}
              />
            </>
          );
        }
      }
    }
  }
}
