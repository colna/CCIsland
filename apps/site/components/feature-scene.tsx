import { Reveal } from "./reveal";
import { MockupActivityLog, MockupApproval, MockupQuestion } from "./island-mockups";

type FeatureSceneProps = {
  eyebrow: string;
  title: string;
  description: string;
  mockup: "activity-log" | "approval" | "question";
  dark: boolean;
};

const mockups = {
  "activity-log": MockupActivityLog,
  approval: MockupApproval,
  question: MockupQuestion,
};

export function FeatureScene({ eyebrow, title, description, mockup, dark }: FeatureSceneProps) {
  const Mockup = mockups[mockup];

  return (
    <section className={`section ${dark ? "section-dark" : "section-light"} py-24 md:py-32`}>
      <div className="container feature-scene">
        <Reveal>
          <div className="space-y-5">
            <p className={`eyebrow ${dark ? "text-white/60" : "muted-dark"}`}>{eyebrow}</p>
            <h2 className="section-title max-w-xl">{title}</h2>
            <p className={`section-copy max-w-xl ${dark ? "text-white/72" : "muted-dark"}`}>{description}</p>
          </div>
        </Reveal>
        <Reveal delay={0.15} className="reveal-scale">
          <div className="flex items-center justify-center">
            <Mockup />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
