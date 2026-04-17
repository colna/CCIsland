import { steps } from "@/lib/site";
import { Reveal } from "./reveal";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="section section-light py-24 md:py-32">
      <div className="container space-y-12">
        <Reveal>
          <div className="max-w-3xl space-y-4">
            <p className="eyebrow muted-dark">Built on hooks</p>
            <h2 className="section-title">Built on Claude Code HTTP Hooks.</h2>
            <p className="section-copy muted-dark">
              CCIsland is not magic — it's a reliable local bridge: events come in, the island updates, approval results go back synchronously.
            </p>
          </div>
        </Reveal>
        <div className="step-grid">
          {steps.map((step, index) => (
            <Reveal key={step} delay={index * 0.1}>
              <div className="rounded-[24px] border border-black/8 bg-white px-6 py-6">
                <p className="text-sm text-black/45">0{index + 1}</p>
                <p className="mt-4 text-lg font-medium leading-[1.35] tracking-[-0.015em] text-[#1d1d1f]">{step}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
