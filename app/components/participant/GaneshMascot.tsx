import { useState } from "react";
import blessingSrc from "~/assets/images/ganesh-blessing.png";
import happySrc from "~/assets/images/ganesh-happy.png";
import readingSrc from "~/assets/images/ganesh-reading.png";
import thinkingSrc from "~/assets/images/ganesh-thinking-borderless.png";
import leaderboardSrc from "~/assets/images/ganesh-leaderboard.png";
import surprisedSrc from "~/assets/images/ganesh-surprised-borderless.png";

export type MascotPose =
  | "modak"
  | "wave"
  | "quizTime"
  | "thinking"
  | "celebrate"
  | "surprised"
  | "firstPlace"
  | "blessing"
  | "happy"
  | "reading"
  | "leaderboard";

type GaneshMascotProps = {
  pose: MascotPose;
  size?: "sm" | "md" | "lg" | "hero" | "tiny";
  className?: string;
};

const SRC: Record<MascotPose, string | undefined> = {
  modak: blessingSrc,
  wave: happySrc,
  quizTime: readingSrc,
  thinking: thinkingSrc,
  celebrate: happySrc,
  surprised: surprisedSrc,
  firstPlace: leaderboardSrc,
  blessing: blessingSrc,
  happy: happySrc,
  reading: readingSrc,
  leaderboard: leaderboardSrc,
};

const SIZE_CLASS: Record<NonNullable<GaneshMascotProps["size"]>, string> = {
  tiny: "h-14 w-14",
  sm: "h-20 w-20",
  md: "h-28 w-28",
  lg: "h-36 w-36",
  hero: "h-44 w-44 max-h-[220px] max-w-[220px]",
};

export const GaneshMascot = ({
  pose,
  size = "md",
  className = "",
}: GaneshMascotProps) => {
  const src = SRC[pose];
  const [failed, setFailed] = useState(false);

  if (!src || failed) return null;

  return (
    <img
      src={src}
      alt=""
      decoding="async"
      draggable={false}
      loading={size === "hero" ? "eager" : "lazy"}
      onError={() => setFailed(true)}
      className={`mx-auto object-contain ${SIZE_CLASS[size]} ${className}`}
    />
  );
};
