import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <span className="text-foreground text-9xl font-bold tracking-tight">mvpb</span>
    </div>
  );
}
