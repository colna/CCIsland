import { siteConfig } from "@/lib/site";
import { Reveal } from "./reveal";

export function PlatformSection() {
  return (
    <section className="section section-dark py-24 md:py-32">
      <Reveal className="container">
        <div className="grid gap-10 overflow-hidden rounded-[24px] sm:rounded-[40px] border border-white/10 bg-white/[0.03] px-4 py-8 sm:px-8 sm:py-10 md:grid-cols-[1.1fr_0.9fr] md:px-12 md:py-14">
          <Reveal delay={0.1} className="min-w-0">
            <div className="space-y-5">
              <p className="eyebrow text-white/60">Platform and install</p>
              <h2 className="section-title">Ready for macOS and Windows.</h2>
              <p className="section-copy text-white/72">
                Builds are distributed via GitHub Releases. Download the latest version and get started in seconds.
              </p>
              <div className="flex flex-wrap gap-2 sm:gap-3 pt-3 text-xs sm:text-sm text-white/78">
                <span className="rounded-full border border-white/10 px-3 py-1.5 sm:px-4 sm:py-2">macOS 14+</span>
                <span className="rounded-full border border-white/10 px-3 py-1.5 sm:px-4 sm:py-2">Windows 10+</span>
                <span className="rounded-full border border-white/10 px-3 py-1.5 sm:px-4 sm:py-2">Tauri v2</span>
                <span className="rounded-full border border-white/10 px-3 py-1.5 sm:px-4 sm:py-2">Rust + TS</span>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.25} className="min-w-0">
            <div className="rounded-[20px] sm:rounded-[32px] border border-white/10 bg-black/30 p-4 sm:p-6">
              <p className="text-sm text-white/52">Install command</p>
              <pre className="mt-4 overflow-x-auto rounded-[16px] sm:rounded-[24px] bg-black px-3 py-3 sm:px-5 sm:py-4 text-xs sm:text-sm leading-6 text-white/86">
                <code>{siteConfig.installCommand}</code>
              </pre>
              <div className="mt-5 flex flex-wrap gap-3">
                <a className="primary-button" href={siteConfig.releasesUrl} target="_blank" rel="noreferrer">
                  Go to Releases
                </a>
                <a className="secondary-button" href="/download">
                  Installation guide
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </Reveal>
    </section>
  );
}
