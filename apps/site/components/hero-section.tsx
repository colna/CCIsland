import { heroStats, siteConfig } from "@/lib/site";
import { CopyButton } from "./copy-button";
import { IslandDemo } from "./island-demo";
import { Reveal } from "./reveal";

export function HeroSection() {
  return (
    <section className="section section-dark pt-16 pb-24">
      <div className="container" style={{ display: "flex", flexDirection: "column", gap: 48 }}>
        {/* Top: Title + Demo */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 48, alignItems: "center" }}>
          <div style={{ flex: "1 1 400px", display: "flex", flexDirection: "column", gap: 20 }}>
            <Reveal>
              <p className="eyebrow text-white/64">For Claude Code</p>
            </Reveal>
            <Reveal delay={0.1}>
              <h1 className="hero-title">Dynamic Island for Claude Code.</h1>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="section-copy text-white/72" style={{ maxWidth: 560 }}>
                See progress, approvals, and questions at the top of your screen — without ever losing focus.
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.3} className="reveal-scale hero-surface" style={{ flex: "1 1 380px", padding: "16px 24px" }}>
            <IslandDemo />
          </Reveal>
        </div>

        {/* Download Cards */}
        <Reveal delay={0.35}>
          <div className="download-cards">
            {/* macOS */}
            <div className="download-card">
              <span className="download-label">Recommended</span>
              <h2 className="download-title">macOS</h2>
              <p className="download-desc">
                Best experience on Sonoma and later. Use the one-line install script to set up in <code>/Applications</code>.
              </p>
              <a className="primary-button" href={siteConfig.releasesUrl} target="_blank" rel="noreferrer">
                Open Releases
              </a>
              <div className="curl-box">
                <code>{siteConfig.installCommand}</code>
                <CopyButton text={siteConfig.installCommand} />
              </div>
            </div>

            {/* Windows */}
            <div className="download-card">
              <span className="download-label secondary">Also available</span>
              <h2 className="download-title">Windows</h2>
              <p className="download-desc">
                Basic runtime support is available. Download the installer from GitHub Releases.
              </p>
              <a className="primary-button" href={siteConfig.releasesUrl} target="_blank" rel="noreferrer">
                Download installers
              </a>
              <p className="download-note">
                Some OS-level features like terminal focus switching are more refined on macOS.
              </p>
            </div>
          </div>
        </Reveal>

        {/* Stats */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          {heroStats.map((item, i) => (
            <Reveal key={item.label} delay={0.4 + i * 0.1}>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-4">
                <p className="text-sm text-white/52">{item.label}</p>
                <p className="mt-2 text-base font-medium tracking-[-0.01em] text-white">{item.value}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
