import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Example } from "@/components/landing/Example";
import { Capabilities } from "@/components/landing/Capabilities";
import { Cta } from "@/components/landing/Cta";

export default function Home() {
  return (
    <div className="flex flex-col w-full">
      <Hero />
      <Features />
      <HowItWorks />
      <Example />
      <Capabilities />
      <Cta />
    </div>
  );
}
