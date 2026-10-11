import React from 'react';
import { Navbar } from '../components/landing/Navbar';
import { Hero } from '../components/landing/Hero';
import { StatsStrip } from '../components/landing/StatsStrip';
import { Features } from '../components/landing/Features';
import { HowItWorks } from '../components/landing/HowItWorks';
import { ProductPreview } from '../components/landing/ProductPreview';
import { Roles } from '../components/landing/Roles';
import { Security } from '../components/landing/Security';
import { Faq } from '../components/landing/Faq';
import { CtaBanner, Footer } from '../components/landing/CtaBanner';

export default function Landing() {
  return (
    <div className="min-h-screen bg-canvas text-content-primary flex flex-col selection:bg-brand-500 selection:text-white">
      <Navbar />
      <main id="main-content" className="flex-1">
        <Hero />
        <StatsStrip />
        <Features />
        <HowItWorks />
        <ProductPreview />
        <Roles />
        <Security />
        <Faq />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  );
}
