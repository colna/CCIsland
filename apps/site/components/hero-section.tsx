import { heroStats, siteConfig } from "@/lib/site";
import { IslandDemo } from "./island-demo";
import { Reveal } from "./reveal";

export function HeroSection() {
  return (
    <section className="section section-dark pt-16 pb-24 md:pt-24 md:pb-32">
      <div className="container grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="space-y-8">
          <div className="space-y-5">
            <Reveal>
              <p className="eyebrow text-white/64">For Claude Code</p>
            </Reveal>
            <Reveal delay={0.1}>
              <h1 className="hero-title max-w-4xl">Dynamic Island for Claude Code.</h1>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="section-copy max-w-2xl text-white/72">
                See progress, approvals, and questions at the top of your screen — without ever losing focus.
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.3}>
            <div className="flex flex-wrap gap-4">
              <a className="primary-button" href={siteConfig.releasesUrl} target="_blank" rel="noreferrer">
                Download for macOS
              </a>
              <a className="secondary-button" href={siteConfig.githubUrl} target="_blank" rel="noreferrer">
                View on GitHub
              </a>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-3">
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
        <Reveal delay={0.3} className="reveal-scale hero-surface p-4 md:p-6">
          <IslandDemo />
        </Reveal>
      </div>
    </section>
  );
}
