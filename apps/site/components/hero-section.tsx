import { heroStats } from "@/lib/site";
import { DownloadCard } from "./download-card";
import { IslandDemo } from "./island-demo";
import { Reveal } from "./reveal";

export function HeroSection() {
  return (
    <section className="section section-dark hero-section">
      <div className="container hero-layout">
        {/* Left: copy + CTA */}
        <div className="hero-left">
          <Reveal>
            <p className="eyebrow text-white/64">For Claude Code</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="hero-title">
              Dynamic Island for Claude&nbsp;Code.
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="section-copy text-white/72">
              See progress, approvals, and questions at the top of your
              screen&nbsp;— without ever losing focus.
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <DownloadCard />
          </Reveal>
        </div>

        {/* Right: demo */}
        <Reveal delay={0.35} className="reveal-scale hero-right">
          <div className="hero-surface">
            <IslandDemo />
          </div>
        </Reveal>
      </div>

      {/* Stats */}
      <div className="hero-stats">
        {heroStats.map((item, i) => (
          <Reveal key={item.label} delay={0.4 + i * 0.1}>
            <div className="hero-stat-item">
              <p className="hero-stat-label">{item.label}</p>
              <p className="hero-stat-value">{item.value}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
