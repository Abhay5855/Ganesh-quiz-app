import { useRef } from "react";
import type { CorrectArea } from "~/types/questions";

type AreaRegionEditorProps = {
  imageUrl: string;
  area: CorrectArea;
  onChange: (area: CorrectArea) => void;
};

/**
 * Click-drag to define a normalized 0–1 correct area on the image.
 */
export const AreaRegionEditor = ({
  imageUrl,
  area,
  onChange,
}: AreaRegionEditorProps) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  const toNorm = (clientX: number, clientY: number) => {
    const img = imgRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    };
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-600">
        Drag on the image to set the correct area (normalized 0–1).
      </p>
      <div className="relative inline-block max-w-full overflow-hidden rounded-lg border border-slate-200">
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Define correct area"
          className="block max-h-80 max-w-full select-none"
          draggable={false}
          onMouseDown={(e) => {
            const p = toNorm(e.clientX, e.clientY);
            if (!p) return;
            dragStart.current = p;
          }}
          onMouseUp={(e) => {
            if (!dragStart.current) return;
            const end = toNorm(e.clientX, e.clientY);
            if (!end) return;
            const x = Math.min(dragStart.current.x, end.x);
            const y = Math.min(dragStart.current.y, end.y);
            const width = Math.abs(end.x - dragStart.current.x);
            const height = Math.abs(end.y - dragStart.current.y);
            dragStart.current = null;
            if (width < 0.02 || height < 0.02) return;
            onChange({ x, y, width, height });
          }}
        />
        <div
          className="pointer-events-none absolute border-2 border-amber-500 bg-amber-400/30"
          style={{
            left: `${area.x * 100}%`,
            top: `${area.y * 100}%`,
            width: `${area.width * 100}%`,
            height: `${area.height * 100}%`,
          }}
          aria-hidden
        />
      </div>
      <p className="font-mono text-xs text-slate-500">
        x={area.x.toFixed(2)} y={area.y.toFixed(2)} w={area.width.toFixed(2)} h=
        {area.height.toFixed(2)}
      </p>
    </div>
  );
};
