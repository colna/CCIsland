"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CCIsland]", error);
  }, [error]);

  return (
    <div className="site-shell">
      <main className="section section-dark">
        <div className="container flex min-h-screen flex-col items-center justify-center text-center">
          <Image
            src="/screenshots/icon.png"
            alt="CCIsland"
            width={64}
            height={64}
            className="error-icon-pulse rounded-full"
          />

          <p className="eyebrow mt-8" style={{ color: "#FF453A" }}>
            Something went wrong
          </p>
          <h1 className="section-title mt-4 max-w-lg">
            An unexpected error occurred.
          </h1>
          <p className="section-copy text-white/62 mt-4 max-w-md">
            This shouldn&apos;t happen. Try refreshing the page or going back to the home page.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button onClick={reset} className="primary-button" type="button">
              Try again
            </button>
            <Link href="/" className="secondary-button">
              Back to home &rsaquo;
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
