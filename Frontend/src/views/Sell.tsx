"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ListPropertyCta } from "@/components/ListPropertyCta";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "@/lib/router";
import { useAuth } from "@/context/AuthContext";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { RevealOnScroll } from "@/components/RevealOnScroll";

const Sell = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  const handleGetStarted = () => {
    if (user) navigate("/dashboard");
    else setAuthOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <section className="bg-black text-white py-20">
        <RevealOnScroll className="container">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/45 bg-white/5 px-4 py-2 font-sans text-[10px] font-semibold uppercase tracking-[0.32em] text-white">
            <Sparkles className="h-3.5 w-3.5 text-white" aria-hidden />
            Sell with confidence
          </div>
          <h1 className="font-serif text-5xl md:text-7xl mt-5 text-white">List your property</h1>
          <p className="mt-4 text-white/85 max-w-2xl">
            Reach qualified buyers, present your listing beautifully, and stay in control with a dashboard built for clarity.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Button variant="luxe" size="lg" onClick={handleGetStarted} className="rounded-full">
              Get started <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outlineGold"
              size="lg"
              asChild
              className="rounded-full bg-white/5 text-white border-white/45 hover:bg-white hover:text-[hsl(30_14%_10%)]"
            >
              <Link to="/contact">
                <ShieldCheck className="h-4 w-4" /> Talk to an agent
              </Link>
            </Button>
          </div>
        </RevealOnScroll>
      </section>

      <ListPropertyCta className="mt-2" />
      <Footer />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
};

export default Sell;

