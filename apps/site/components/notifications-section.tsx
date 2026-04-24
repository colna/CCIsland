import { Reveal } from "./reveal";

const platforms = [
  "Feishu / Lark",
  "DingTalk",
  "WeCom",
  "Slack / Discord",
  "Custom webhook",
];

const manualSnippet = `export IM_WEBHOOK_URL="https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxx"
source ~/.zshrc    # then restart CCIsland`;

export function NotificationsSection() {
  return (
    <section id="notifications" className="section section-light py-24 md:py-32">
      <Reveal className="container">
        <div className="grid gap-10 rounded-[24px] sm:rounded-[40px] border border-black/8 bg-white px-4 py-8 sm:px-8 sm:py-10 md:grid-cols-[1.1fr_0.9fr] md:px-12 md:py-14">
          <Reveal delay={0.1} className="min-w-0">
            <div className="space-y-5">
              <p className="eyebrow muted-dark">Optional · Team notifications</p>
              <h2 className="section-title">Ping your team when Claude&rsquo;s done.</h2>
              <p className="section-copy muted-dark">
                CCIsland can POST a completion message to any incoming webhook &mdash;
                no URL lives in the repo. Just type <code className="rounded bg-black/5 px-1.5 py-0.5 text-[13px]">/setup-im-hook</code> in Claude Code and follow the prompts.
              </p>
              <div className="flex flex-wrap gap-2 sm:gap-3 pt-3 text-xs sm:text-sm text-[rgba(29,29,31,0.72)]">
                {platforms.map((name) => (
                  <span
                    key={name}
                    className="rounded-full border border-black/10 px-3 py-1.5 sm:px-4 sm:py-2"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.25} className="min-w-0">
            <div className="rounded-[20px] sm:rounded-[32px] border border-white/10 bg-black/90 p-4 sm:p-6">
              <p className="text-sm text-white/52">Built-in skill (auto-installed with CCIsland)</p>
              <pre className="mt-3 overflow-x-auto rounded-[16px] sm:rounded-[24px] bg-black px-3 py-3 sm:px-5 sm:py-4 text-xs sm:text-sm leading-6 text-white/86">
                <code>/setup-im-hook</code>
              </pre>
              <p className="mt-5 text-sm text-white/52">Or configure manually</p>
              <pre className="mt-3 overflow-x-auto rounded-[16px] sm:rounded-[24px] bg-black px-3 py-3 sm:px-5 sm:py-4 text-xs sm:text-sm leading-6 text-white/86 whitespace-pre">
                <code>{manualSnippet}</code>
              </pre>
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  className="secondary-button light"
                  href="https://github.com/colna/CCIsland#im-webhook-notifications-optional"
                  target="_blank"
                  rel="noreferrer"
                >
                  Read the docs
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </Reveal>
    </section>
  );
}
