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
  const [platform, setPlatform] = useState<Platform>("mac");

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  if (platform === "win") {
    return (
      <div className="download-card">
        <span className="download-label">Windows</span>
        <p className="download-desc">
          Download the installer from GitHub Releases. Some OS-level features are more refined on macOS.
        </p>
        <a
          className="primary-button"
          href={siteConfig.releasesUrl}
          target="_blank"
          rel="noreferrer"
        >
          Download installer
        </a>
      </div>
    );
  }

  return (
    <div className="download-card">
      <span className="download-label">macOS</span>
      <p className="download-desc">
        Best experience on Sonoma and later. One-line install to <code>/Applications</code>.
      </p>
      <a
        className="primary-button"
        href={siteConfig.releasesUrl}
        target="_blank"
        rel="noreferrer"
      >
        Open Releases
      </a>
      <div className="curl-box">
        <code>{siteConfig.installCommand}</code>
        <CopyButton text={siteConfig.installCommand} />
      </div>
    </div>
  );
}
