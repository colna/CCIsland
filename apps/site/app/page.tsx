import { FeatureScene } from "@/components/feature-scene";
import { FaqSection } from "@/components/faq-section";
import { HeroSection } from "@/components/hero-section";
import { HowItWorks } from "@/components/how-it-works";
import { NotificationsSection } from "@/components/notifications-section";
import { PlatformSection } from "@/components/platform-section";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ValueGrid } from "@/components/value-grid";
import { featureScenes } from "@/lib/site";

export default function HomePage() {
  return (
    <div className="site-shell">
      <SiteHeader />
      <main>
        <HeroSection />
        <ValueGrid />
        {featureScenes.map((scene) => (
          <FeatureScene key={scene.title} {...scene} />
        ))}
        <HowItWorks />
        <PlatformSection />
        <NotificationsSection />
        <FaqSection />
      </main>
      <SiteFooter />
    </div>
  );
}
