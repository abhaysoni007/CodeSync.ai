import { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import HybridDataSyncShowcase from './components/HybridDataSyncShowcase';
import Features from './components/Features';
import Integrations from './components/Integrations';
import Testimonials from './components/Testimonials';
import Footer from './components/Footer';

function LandingPage() {
  return (
    <div className="landing-page min-h-screen bg-land-ink">
      <Navbar />
      
      <Hero />
      
      <HybridDataSyncShowcase />
      
      <Features />
      
      <Integrations />
      
      <Testimonials />
      
      <Footer />
    </div>
  );
}

export default LandingPage;
