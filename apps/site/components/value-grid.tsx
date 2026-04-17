import { valueProps } from "@/lib/site";

export function ValueGrid() {
  return (
    <section id="features" className="section section-light py-24 md:py-32">
      <div className="container">
        <div className="max-w-3xl space-y-4 pb-12">
          <p className="eyebrow muted-dark">Built for flow</p>
          <h2 className="section-title">A calmer way to stay on top of Claude Code.</h2>
          <p className="section-copy muted-dark">
            官网不展示内部实现细节，而是把最值得用户记住的三个体验点放到前面。
          </p>
        </div>
        <div className="grid-cards">
          {valueProps.map((item) => (
            <article key={item.title} className="card rounded-[28px] bg-white px-7 py-8 text-[#1d1d1f]">
              <h3 className="text-[24px] font-medium leading-[1.15] tracking-[-0.02em]">{item.title}</h3>
              <p className="body-copy mt-4 text-[rgba(29,29,31,0.74)]">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
