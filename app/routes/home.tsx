import type { Route } from "./+types/home";
import { Link } from "react-router";
import { PinForm } from "~/components/participant/PinForm";
import { ParticipantShell } from "~/components/participant/ParticipantShell";
import { GaneshMascot } from "~/components/participant/GaneshMascot";
import { Card } from "~/components/ui/Card";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Ganesh Festival Quiz" },
    {
      name: "description",
      content: "Join the live Ganesh festival quiz with your game PIN",
    },
  ];
}

export default function Home() {
  return (
    <ParticipantShell className="justify-center gap-6">
      <header className="text-center">
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.25em] text-festival-maroon">
          Company celebration
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold text-festival-navy sm:text-5xl">
          Ganesh Festival Quiz
        </h1>
        <p className="mt-3 font-sans text-base text-festival-muted">
          Knowledge brings us closer.
        </p>
      </header>

      <GaneshMascot pose="modak" size="hero" />

      <Card className="border-festival-border bg-white">
        <PinForm />
      </Card>

      <footer className="space-y-2 text-center font-sans text-sm text-festival-muted">
        <p>Ask your host for the game PIN.</p>
        <p>
          Hosting this quiz?{" "}
          <Link
            to="/host"
            className="font-semibold text-festival-saffron underline decoration-festival-saffron/40 underline-offset-2"
          >
            Host console
          </Link>
        </p>
      </footer>
    </ParticipantShell>
  );
}
