import { valueProps } from "@/lib/site";
import { Reveal } from "./reveal";

export function ValueGrid() {
  return (
    <section id="features" className="section section-light py-24 md:py-32">
      <div className="container">
        <Reveal>
          <div className="max-w-3xl space-y-4 pb-12">
            <p className="eyebrow muted-dark">Built for flow</p>
            <h2 className="section-title">A calmer way to stay on top of Claude Code.</h2>
            <p className="section-copy muted-dark">
              Three things you&apos;ll notice the moment you start using CCIsland.
            </p>
          </div>
        </Reveal>
        <div className="grid-cards">
          {valueProps.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.12}>
              <article className="card rounded-[20px] sm:rounded-[28px] bg-white px-5 py-6 sm:px-7 sm:py-8 text-[#1d1d1f]">
                <h3 className="text-[24px] font-medium leading-[1.15] tracking-[-0.02em]">{item.title}</h3>
                <p className="body-copy mt-4 text-[rgba(29,29,31,0.74)]">{item.description}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
