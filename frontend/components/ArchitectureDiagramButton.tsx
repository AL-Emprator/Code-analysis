
"use client";

type ArchitectureDiagramButtonProps = {
  repoUrl: string;
};

export default function ArchitectureDiagramButton({
  repoUrl,
}: ArchitectureDiagramButtonProps) {
  function openArchitectureDiagram() {
    try {
      const url = new URL(repoUrl);

      if (
        url.protocol !== "https:" ||
        url.hostname !== "github.com"
      ) {
        return;
      }

      const segments = url.pathname
        .split("/")
        .filter(Boolean);

      if (segments.length !== 2) {
        return;
      }

      const owner = segments[0];
      const repo = segments[1].replace(/\.git$/, "");

      const diagramUrl =
        `https://gitdiagram.com/` +
        `${encodeURIComponent(owner)}/` +
        `${encodeURIComponent(repo)}`;

      window.open(
        diagramUrl,
        "_blank",
        "noopener,noreferrer"
      );
    } catch {
      console.error("Ungültige GitHub-Repository-URL");
    }
  }

  return (
    <button
      type="button"
      onClick={openArchitectureDiagram}
      className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/20"
    >
      <span aria-hidden="true">◇</span>
      Architekturdiagramm anzeigen
      <span aria-hidden="true">↗</span>
    </button>
  );
}
