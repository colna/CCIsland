import Image from "next/image";

type FeatureSceneProps = {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  dark: boolean;
};

export function FeatureScene({ eyebrow, title, description, image, dark }: FeatureSceneProps) {
  return (
    <section className={`section ${dark ? "section-dark" : "section-light"} py-24 md:py-32`}>
      <div className="container feature-scene">
        <div className="space-y-5">
          <p className={`eyebrow ${dark ? "text-white/60" : "muted-dark"}`}>{eyebrow}</p>
          <h2 className="section-title max-w-xl">{title}</h2>
          <p className={`section-copy max-w-xl ${dark ? "text-white/72" : "muted-dark"}`}>{description}</p>
        </div>
        <div className={`card overflow-hidden rounded-[32px] border ${dark ? "border-white/10 bg-white/[0.04]" : "border-black/8 bg-white"}`}>
          <Image src={image} alt={title} width={1200} height={900} className="h-auto w-full" />
        </div>
      </div>
    </section>
  );
}
