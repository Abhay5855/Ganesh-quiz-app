import { GaneshMascot } from "~/components/participant/GaneshMascot";

export const LockedInBanner = () => (
  <div
    className="relative overflow-hidden rounded-lg border border-festival-success/30 bg-festival-success/10 px-4 py-6 text-center"
    role="status"
    aria-live="polite"
  >
    <GaneshMascot pose="thinking" size="md" className="mb-3" />
    <p className="font-display text-xl font-bold text-festival-navy">
      Answer locked in
    </p>
    <p className="mt-2 font-sans text-sm text-festival-muted">
      Waiting for other players…
    </p>
  </div>
);
