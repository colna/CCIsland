import Link from "next/link";
import Image from "next/image";

export function SiteHeader() {
  return (
    <header className="glass-nav sticky top-0 z-50 border-b border-white/10">
      <div className="container flex h-12 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 text-sm text-white">
          <Image src="/screenshots/icon.png" alt="CCIsland icon" width={28} height={28} className="rounded-full" />
          <span className="font-medium tracking-[-0.01em]">CCIsland</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-white/78">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#notifications">Notifications</a>
          <Link href="/download">Download</Link>
          <a href="https://github.com/colna/CCIsland" target="_blank" rel="noreferrer">GitHub</a>
        </nav>
      </div>
    </header>
  );
}
