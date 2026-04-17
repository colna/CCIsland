import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteConfig } from "@/lib/site";

export default function DownloadPage() {
  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="section section-light min-h-[calc(100vh-48px)] py-20 md:py-28">
        <div className="container space-y-10">
          <div className="max-w-3xl space-y-5">
            <p className="eyebrow muted-dark">Download</p>
            <h1 className="section-title">Download CCIsland and get set up in minutes.</h1>
            <p className="section-copy muted-dark">
              当前安装包继续通过 GitHub Releases 分发。官网负责把平台入口和安装步骤收得更清楚。
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-[32px] border border-black/8 bg-white p-8 shadow-[0_3px_24px_rgba(0,0,0,0.08)]">
              <p className="text-sm text-black/48">Recommended</p>
              <h2 className="mt-3 text-[30px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">macOS</h2>
              <p className="body-copy mt-4 text-[rgba(29,29,31,0.72)]">
                Sonoma 及以上版本支持最佳，可通过一键安装脚本快速安装到 `/Applications`。
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a className="primary-button" href={siteConfig.releasesUrl} target="_blank" rel="noreferrer">
                  Open Releases
                </a>
              </div>
              <pre className="mt-6 overflow-x-auto rounded-[24px] bg-[#f5f5f7] px-5 py-4 text-sm leading-6 text-[#1d1d1f]">
                <code>{siteConfig.installCommand}</code>
              </pre>
            </section>
            <section className="rounded-[32px] border border-black/8 bg-white p-8 shadow-[0_3px_24px_rgba(0,0,0,0.08)]">
              <p className="text-sm text-black/48">Also available</p>
              <h2 className="mt-3 text-[30px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">Windows</h2>
              <p className="body-copy mt-4 text-[rgba(29,29,31,0.72)]">
                Windows 当前以基础运行兼容为主，安装包依旧通过 GitHub Releases 提供下载。
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a className="primary-button" href={siteConfig.releasesUrl} target="_blank" rel="noreferrer">
                  Download installers
                </a>
              </div>
              <p className="body-copy mt-6 text-[rgba(29,29,31,0.72)]">
                部分依赖系统能力的特性，例如终端跳转，更偏向 macOS。
              </p>
            </section>
          </div>
          <section className="rounded-[32px] border border-black/8 bg-white p-8 shadow-[0_3px_24px_rgba(0,0,0,0.08)]">
            <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">What to do after installation</h2>
            <ol className="mt-5 space-y-3 body-copy text-[rgba(29,29,31,0.72)]">
              <li>1. Launch CCIsland.</li>
              <li>2. Use the tray menu to set up Claude Code hooks.</li>
              <li>3. Run Claude Code normally and watch the floating island update in real time.</li>
            </ol>
            <div className="mt-6">
              <Link href="/privacy" className="text-[15px] text-[#0066cc] underline-offset-4 hover:underline">
                Read privacy notes
              </Link>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
