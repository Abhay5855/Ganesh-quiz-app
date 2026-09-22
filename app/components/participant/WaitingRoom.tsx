import { GaneshMascot } from "~/components/participant/GaneshMascot";

export const WaitingRoom = ({ displayName }: { displayName?: string }) => (
  <div className="flex flex-col items-center gap-4 py-8 text-center">
    <div className="festival-pulse">
      <GaneshMascot pose="reading" size="lg" />
    </div>
    <h2 className="font-display text-3xl font-bold text-festival-navy">
      You&apos;re in!
    </h2>
    {displayName ? (
      <p className="font-sans text-lg font-semibold text-festival-maroon">
        {displayName}
      </p>
    ) : null}
    <p className="max-w-xs font-sans text-base text-festival-muted">
      Waiting for the host to start the quiz...
    </p>
  </div>
);
