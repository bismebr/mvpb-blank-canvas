import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <h1 className="text-6xl font-bold tracking-tight text-foreground">
        Bisme
      </h1>
    </div>
  );
}
