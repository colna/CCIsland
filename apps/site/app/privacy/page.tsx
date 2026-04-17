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
              这一页的目的不是写法律文本，而是清楚说明 CCIsland 的数据边界，降低用户的心理门槛。
            </p>
          </div>
          <div className="grid gap-5">
            <section className="rounded-[32px] border border-black/8 bg-white p-8 shadow-[0_3px_24px_rgba(0,0,0,0.08)]">
              <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">Local hook transport</h2>
              <p className="body-copy mt-4 text-[rgba(29,29,31,0.72)]">
                CCIsland 通过本地 `localhost:51515` 接收 Claude Code hook 事件，用于更新浮窗 UI 和返回审批结果。
              </p>
            </section>
            <section className="rounded-[32px] border border-black/8 bg-white p-8 shadow-[0_3px_24px_rgba(0,0,0,0.08)]">
              <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">No website-side session processing</h2>
              <p className="body-copy mt-4 text-[rgba(29,29,31,0.72)]">
                这个官网本身只负责展示产品和承接下载，不处理你的终端会话，也不作为云端代理来分析 Claude Code 内容。
              </p>
            </section>
            <section className="rounded-[32px] border border-black/8 bg-white p-8 shadow-[0_3px_24px_rgba(0,0,0,0.08)]">
              <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">Open source distribution</h2>
              <p className="body-copy mt-4 text-[rgba(29,29,31,0.72)]">
                当前安装包继续通过 GitHub Releases 分发。你可以直接查看仓库、发布记录和源码来判断产品行为边界。
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
