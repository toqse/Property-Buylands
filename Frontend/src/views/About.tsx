"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AwardsRecognition } from "@/components/AwardsRecognition";
import { AboutLegacyShowcase } from "@/components/AboutLegacyShowcase";
import { AboutServicesGrid } from "@/components/AboutServicesGrid";
import about from "@/assets/about-hero.jpg";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import villa from "@/assets/property-2.jpg";
import { imageSrc } from "@/lib/image";

const About = () => (
  <div className="min-h-screen flex flex-col">
    <Navbar />

    <section className="bg-black text-white py-20">
      <RevealOnScroll className="container">
        <div className="text-xs uppercase tracking-[0.25em] text-white">About us</div>
        <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl mt-3 lg:whitespace-nowrap text-white">A quietly luxurious approach to real estate</h1>
        <p className="mt-6 text-white/85 text-lg lg:whitespace-nowrap">
          Founded in 2020, Buylands India is on a mission to revolutionize property discovery — rooted in a passion for craft, design and enduring value.
        </p>
      </RevealOnScroll>
    </section>

    <section className="container py-20">
      <RevealOnScroll className="grid md:grid-cols-2 gap-12 items-center">
        <div className="rounded-2xl overflow-hidden shadow-luxe">
          <img src={imageSrc(about)} alt="Our team" className="w-full h-full object-cover" loading="lazy" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-gold mb-3">Our story</div>
          <h2 className="font-serif text-4xl md:text-5xl">Crafted for people who care about details.</h2>
          <p className="mt-5 text-foreground/80 leading-relaxed">
            We curate residences that combine architectural integrity, generous light, and a sense of place. Every listing is verified, every photograph thoughtful, every interaction discreet.
          </p>
          <p className="mt-4 text-foreground/80 leading-relaxed">
            Our team blends seasoned advisors with technologists who believe great service should feel effortless.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-6">
            {[{ v: "5+", l: "Years" }, { v: "1.2k", l: "Listings" }, { v: "12k", l: "Happy clients" }].map((s) => (
              <div key={s.l}>
                <div className="font-serif text-3xl text-gold-gradient">{s.v}</div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </RevealOnScroll>
    </section>

    <AboutServicesGrid />

    <AwardsRecognition />

    <AboutLegacyShowcase imageSrc={imageSrc(villa)} imageAlt="Luxury estate with pool at dusk" />

    <Footer />
  </div>
);

export default About;
