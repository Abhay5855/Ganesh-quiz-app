import { useState } from "react";
import modakSrc from "~/assets/images/ganesh-modak.jpg";
import waveSrc from "~/assets/images/ganesh-wave.jpg";
import quizTimeSrc from "~/assets/images/ganesh-quiz-time.jpg";
import thinkingSrc from "~/assets/images/ganesh-thinking.jpg";
import celebrateSrc from "~/assets/images/ganesh-celebrate.jpg";
import surprisedSrc from "~/assets/images/ganesh-surprised.jpg";
import firstPlaceSrc from "~/assets/images/ganesh-first-place.jpg";

export type MascotPose =
  | "modak"
  | "wave"
  | "quizTime"
  | "thinking"
  | "celebrate"
  | "surprised"
  | "firstPlace";

type GaneshMascotProps = {
  pose: MascotPose;
  size?: "sm" | "md" | "lg" | "hero" | "tiny";
  className?: string;
};

const SRC: Record<MascotPose, string | undefined> = {
  modak: modakSrc,
  wave: waveSrc,
  quizTime: quizTimeSrc,
  thinking: thinkingSrc,
  celebrate: celebrateSrc,
  surprised: surprisedSrc,
  firstPlace: firstPlaceSrc,
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
      draggable={false}
      onError={() => setFailed(true)}
      className={`mx-auto object-contain ${SIZE_CLASS[size]} ${className}`}
    />
  );
};
