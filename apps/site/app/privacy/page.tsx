import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function PrivacyPage() {
  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="section section-light min-h-[calc(100vh-48px)] py-20 md:py-28">
        <div className="container max-w-4xl space-y-8">
          <div className="space-y-5">
            <p className="eyebrow muted-dark">Privacy</p>
            <h1 className="section-title">CCIsland keeps its core work local.</h1>
            <p className="section-copy muted-dark">
              This page explains how CCIsland handles your data — no legalese, just clear boundaries.
            </p>
          </div>
          <div className="grid gap-5">
            <section className="rounded-[32px] border border-black/8 bg-white p-8 shadow-[0_3px_24px_rgba(0,0,0,0.08)]">
              <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">Local hook transport</h2>
              <p className="body-copy mt-4 text-[rgba(29,29,31,0.72)]">
                CCIsland receives Claude Code hook events on local `localhost:51515` to update the floating UI and return approval results.
              </p>
            </section>
            <section className="rounded-[32px] border border-black/8 bg-white p-8 shadow-[0_3px_24px_rgba(0,0,0,0.08)]">
              <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">No website-side session processing</h2>
              <p className="body-copy mt-4 text-[rgba(29,29,31,0.72)]">
                This website only showcases the product and hosts downloads. It does not process your terminal sessions or act as a cloud proxy to analyze Claude Code content.
              </p>
            </section>
            <section className="rounded-[32px] border border-black/8 bg-white p-8 shadow-[0_3px_24px_rgba(0,0,0,0.08)]">
              <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">Open source distribution</h2>
              <p className="body-copy mt-4 text-[rgba(29,29,31,0.72)]">
                Builds are distributed via GitHub Releases. You can inspect the repository, release history, and source code to verify the product&apos;s behavior boundaries.
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
