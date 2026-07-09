import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "MVPB" },
      { name: "description", content: "MVPB" },
      { property: "og:title", content: "MVPB" },
      { property: "og:description", content: "MVPB" },
    ],
  }),
});

function Index() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <h1 className="text-7xl font-bold tracking-tighter text-foreground sm:text-9xl">
        MVPB
      </h1>
    </div>
  );
}

