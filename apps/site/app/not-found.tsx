import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function NotFound() {
  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="section section-dark">
        <div className="container flex min-h-[calc(100vh-48px-89px)] flex-col items-center justify-center text-center">
          <Image
            src="/screenshots/icon.png"
            alt="CCIsland"
            width={64}
            height={64}
            className="rounded-full opacity-40"
          />

          <p className="eyebrow text-white/48 mt-8">Page not found</p>
          <h1 className="section-title mt-4 max-w-lg">
            This page doesn&apos;t exist.
          </h1>
          <p className="section-copy text-white/62 mt-4 max-w-md">
            The page you&apos;re looking for may have been moved or no longer exists.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/" className="primary-button">
              Back to home
            </Link>
            <Link href="/download" className="secondary-button">
              Download &rsaquo;
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
