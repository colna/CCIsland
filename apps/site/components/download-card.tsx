"use client";

import { useEffect, useState } from "react";
import { siteConfig } from "@/lib/site";
import { CopyButton } from "./copy-button";

type Platform = "mac" | "win";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "mac";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "win";
  return "mac";
}

export function DownloadCard() {
  const [platform, setPlatform] = useState<Platform | null>(null);

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  if (!platform) {
    return <div className="hero-cta-group" style={{ minHeight: 100 }} />;
  }

  if (platform === "win") {
    return (
      <div className="hero-cta-group">
        <a
          className="primary-button"
          href={siteConfig.releasesUrl}
          target="_blank"
          rel="noreferrer"
        >
          Download for Windows
        </a>
        <a
          className="secondary-button"
          href={siteConfig.githubUrl}
          target="_blank"
          rel="noreferrer"
        >
          View on GitHub &rsaquo;
        </a>
      </div>
    );
  }

  return (
    <div className="hero-cta-group">
      <div className="hero-cta-row">
        <a
          className="primary-button"
          href={siteConfig.releasesUrl}
          target="_blank"
          rel="noreferrer"
        >
          Download for Mac
        </a>
        <a
          className="secondary-button"
          href={siteConfig.githubUrl}
          target="_blank"
          rel="noreferrer"
        >
          GitHub &rsaquo;
        </a>
      </div>
      <div className="curl-box">
        <code>{siteConfig.installCommand}</code>
        <CopyButton text={siteConfig.installCommand} />
      </div>
    </div>
  );
}
