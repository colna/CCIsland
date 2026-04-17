import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="section section-dark border-t border-white/10 py-8">
      <div className="container footer-grid text-sm text-white/62">
        <p>CCIsland</p>
        <div className="flex flex-wrap items-center gap-4">
          <a href="https://github.com/colna/CCIsland" target="_blank" rel="noreferrer">GitHub</a>
          <a href="https://github.com/colna/CCIsland/releases" target="_blank" rel="noreferrer">Releases</a>
          <Link href="/privacy">Privacy</Link>
          <a href="https://github.com/colna/CCIsland/blob/main/LICENSE" target="_blank" rel="noreferrer">License</a>
        </div>
      </div>
    </footer>
  );
}
