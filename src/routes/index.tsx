import { createFileRoute } from "@tanstack/react-router";
import { CyberRescueGame } from "@/components/game/CyberRescueGame";

export const Route = createFileRoute("/")({
  // The game reads browser APIs (audio, canvas, fullscreen, realtime) on mount.
  ssr: false,
  head: () => ({
    meta: [
      { title: "CyberRescue — 1v1 Cyber Defence Challenge" },
      {
        name: "description",
        content:
          "Race a friend through three cyber-rescue stages: build a shield, reveal a hidden picture, and restore a corrupted file.",
      },
      { property: "og:title", content: "CyberRescue — 1v1 Cyber Defence Challenge" },
      {
        property: "og:description",
        content:
          "Create a room, share the code, and go head-to-head in a live three-stage cyber-defence duel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CyberRescueGame,
});
