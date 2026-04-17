"use client";

import { useState } from "react";
import { faqs } from "@/lib/site";
import { Reveal } from "./reveal";

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <section className="section section-light py-24 md:py-32">
      <div className="container grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
        <Reveal>
          <div className="space-y-4">
            <p className="eyebrow muted-dark">FAQ</p>
            <h2 className="section-title">Questions people will ask before they install.</h2>
          </div>
        </Reveal>
        <div className="space-y-4">
          {faqs.map((item, index) => {
            const open = openIndex === index;
            return (
              <Reveal key={item.question} delay={index * 0.1}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? -1 : index)}
                  className="w-full rounded-[28px] border border-black/8 bg-white px-6 py-6 text-left shadow-[0_3px_24px_rgba(0,0,0,0.08)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-lg font-medium tracking-[-0.015em] text-[#1d1d1f]">{item.question}</span>
                    <span className="text-2xl leading-none text-black/45 transition-transform duration-300" style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}>+</span>
                  </div>
                  <div className={`faq-answer ${open ? "open" : ""}`}>
                    <div className="faq-answer-inner">
                      <p className="body-copy mt-4 text-[rgba(29,29,31,0.72)]">{item.answer}</p>
                    </div>
                  </div>
                </button>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
