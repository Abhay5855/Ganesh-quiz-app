import { useCallback, useEffect, useRef, useState } from "react";
import { StatusMessage } from "~/components/participant/StatusMessage";

type PinImageProps = {
  imageUrl: string;
  selected: { x: number; y: number } | null;
  disabled?: boolean;
  onPin: (coords: { x: number; y: number }) => void;
  hotspot?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  playerPin?: { x: number; y: number } | null;
  interactive?: boolean;
};

type ContentBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * object-contain content rectangle inside an img's layout box.
 * Normalized coords must use this, not letterboxed padding.
 */
export const getContainedImageBox = (
  img: HTMLImageElement,
): ContentBox | null => {
  const naturalW = img.naturalWidth;
  const naturalH = img.naturalHeight;
  if (!naturalW || !naturalH) return null;

  const layoutW = img.clientWidth;
  const layoutH = img.clientHeight;
  if (!layoutW || !layoutH) return null;

  const scale = Math.min(layoutW / naturalW, layoutH / naturalH);
  const width = naturalW * scale;
  const height = naturalH * scale;
  const left = (layoutW - width) / 2;
  const top = (layoutH - height) / 2;
  return { left, top, width, height };
};

export const PinImage = ({
  imageUrl,
  selected,
  disabled,
  onPin,
  hotspot,
  playerPin,
  interactive = true,
}: PinImageProps) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loadError, setLoadError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [contentBox, setContentBox] = useState<ContentBox | null>(null);

  const refreshBox = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    setContentBox(getContainedImageBox(img));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    refreshBox();
    const img = imgRef.current;
    if (!img) return;

    const observer = new ResizeObserver(() => refreshBox());
    observer.observe(img);
    window.addEventListener("resize", refreshBox);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", refreshBox);
    };
  }, [loaded, refreshBox, imageUrl]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!interactive || disabled) return;
    const img = imgRef.current;
    if (!img) return;

    const box = getContainedImageBox(img);
    if (!box || box.width <= 0 || box.height <= 0) return;

    const rect = img.getBoundingClientRect();
    const x = (event.clientX - rect.left - box.left) / box.width;
    const y = (event.clientY - rect.top - box.top) / box.height;

    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    onPin({ x, y });
  };

  if (loadError) {
    return (
      <StatusMessage
        title="Couldn't load image"
        description="Check your connection and try again."
        tone="danger"
        pose="surprised"
      />
    );
  }

  const pinForDisplay = playerPin ?? selected;

  return (
    <div className="w-full overflow-hidden rounded-lg border border-festival-border bg-festival-cream-soft">
      <button
        type="button"
        disabled={disabled || !interactive}
        aria-label={
          interactive ? "Tap on the image to place your pin" : "Answer image"
        }
        tabIndex={interactive ? 0 : -1}
        onClick={handleClick}
        className="relative block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-festival-saffron disabled:cursor-default"
      >
        {!loaded ? (
          <div className="flex aspect-[4/3] items-center justify-center font-sans text-sm text-festival-muted">
            Loading image…
          </div>
        ) : null}
        <img
          ref={imgRef}
          src={imageUrl}
          alt=""
          className={`block max-h-72 w-full select-none object-contain ${
            loaded ? "" : "absolute opacity-0"
          }`}
          draggable={false}
          onLoad={() => {
            setLoaded(true);
            refreshBox();
          }}
          onError={() => setLoadError(true)}
        />
        {loaded && contentBox && pinForDisplay ? (
          <span
            className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-festival-gold shadow-md"
            style={{
              left: contentBox.left + pinForDisplay.x * contentBox.width,
              top: contentBox.top + pinForDisplay.y * contentBox.height,
            }}
            aria-hidden
          />
        ) : null}
        {loaded && contentBox && hotspot ? (
          <div
            className="pointer-events-none absolute border-2 border-festival-success bg-festival-success/25"
            style={{
              left: contentBox.left + hotspot.x * contentBox.width,
              top: contentBox.top + hotspot.y * contentBox.height,
              width: hotspot.width * contentBox.width,
              height: hotspot.height * contentBox.height,
            }}
            aria-hidden
          />
        ) : null}
      </button>
      {interactive ? (
        <p className="px-3 py-2 text-center font-sans text-sm text-festival-muted">
          Tap the image to place your answer
        </p>
      ) : null}
    </div>
  );
};
