'use client';

import { useEffect, useState, useRef, MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface FeatureItem {
  id: number;
  title: string;
  description: string;
  metric: string;
  metricLabel: string;
}

// ============================================================================
// DATA
// ============================================================================

const heroStats = [
  { value: '847K', label: 'km analysés' },
  { value: '12K', label: 'séances' },
  { value: '∞', label: 'potentiel' },
];

const features: FeatureItem[] = [
  {
    id: 1,
    title: 'Analyse intelligente',
    description: 'Chaque séance Strava est décortiquée. Allure comprend tes zones, ta fatigue, ta progression.',
    metric: '35',
    metricLabel: 'métriques analysées',
  },
  {
    id: 2,
    title: 'Records automatiques',
    description: 'Plus besoin de chercher. Allure détecte tes PRs sur toutes les distances, du 1km au marathon.',
    metric: '8',
    metricLabel: 'distances trackées',
  },
  {
    id: 3,
    title: 'Coach IA personnel',
    description: "Des suggestions d'entraînement adaptées à ton niveau, tes objectifs, et ta charge actuelle.",
    metric: '24/7',
    metricLabel: 'disponibilité',
  },
];

const accroche = "ton coach qui comprend chaque foulée";

// ============================================================================
// MAGNETIC BUTTON COMPONENT
// ============================================================================

function MagneticButton({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 15, stiffness: 150 };
  const xSpring = useSpring(x, springConfig);
  const ySpring = useSpring(y, springConfig);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const distanceX = e.clientX - centerX;
    const distanceY = e.clientY - centerY;
    
    // Magnetic pull effect (moves towards cursor)
    x.set(distanceX * 0.3);
    y.set(distanceY * 0.3);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: xSpring, y: ySpring }}
      className={cn("inline-block", className)}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// WORD BY WORD ANIMATION COMPONENT
// ============================================================================

function AnimatedWords({ text, className }: { text: string; className?: string }) {
  const words = text.split(' ');
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.9", "start 0.3"]
  });

  return (
    <div ref={ref} className={cn("flex flex-wrap", className)}>
      {words.map((word, i) => {
        const start = i / words.length;
        const end = start + (1 / words.length);
        return (
          <Word key={i} progress={scrollYProgress} range={[start, end]}>
            {word}
          </Word>
        );
      })}
    </div>
  );
}

function Word({ 
  children, 
  progress, 
  range 
}: { 
  children: string; 
  progress: any; 
  range: [number, number];
}) {
  const opacity = useTransform(progress, range, [0.15, 1]);
  const y = useTransform(progress, range, [20, 0]);
  
  return (
    <motion.span 
      style={{ opacity, y }} 
      className="mr-[0.25em] inline-block"
    >
      {children}
    </motion.span>
  );
}

// ============================================================================
// STICKY FEATURE SECTION COMPONENT
// ============================================================================

function StickyFeatures({ features }: { features: FeatureItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  return (
    <div ref={containerRef} className="relative" style={{ height: `${features.length * 100}vh` }}>
      {/* Sticky container */}
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        <div className="container mx-auto max-w-7xl px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          
          {/* Left: Features text (scrolling) */}
          <div className="flex flex-col justify-center">
            {features.map((feature, index) => (
              <FeatureText 
                key={feature.id} 
                feature={feature} 
                index={index} 
                total={features.length}
                progress={scrollYProgress}
              />
            ))}
          </div>

          {/* Right: Floating visual (stays fixed) */}
          <div className="hidden lg:flex items-center justify-center">
            <motion.div 
              className="relative w-full max-w-md aspect-square"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Glowing orb background */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#ee95b3]/30 to-[#667abf]/30 blur-3xl" />
              
              {/* Glass card mockup */}
              <motion.div 
                className="relative w-full h-full rounded-3xl bg-white/10 backdrop-blur-2xl border border-white/20 p-8 flex flex-col justify-between overflow-hidden"
                style={{
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)'
                }}
                animate={{ 
                  rotateY: [0, 2, 0, -2, 0],
                  rotateX: [0, -1, 0, 1, 0],
                }}
                transition={{ 
                  duration: 8, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {/* Sheen effect */}
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
                  animate={{ x: ['-200%', '200%'] }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }}
                />
                
                {/* Content preview */}
                <div className="relative z-10">
                  <div className="text-white/50 text-sm font-medium mb-2">Prochaine séance</div>
                  <div className="text-white text-xl font-semibold">Tempo 8km</div>
                </div>
                
                <div className="relative z-10 space-y-3">
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-[#ee95b3] to-[#667abf] rounded-full"
                      initial={{ width: '0%' }}
                      whileInView={{ width: '72%' }}
                      transition={{ duration: 1.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Charge optimale</span>
                    <span className="text-white font-mono italic">72%</span>
                  </div>
                </div>

                <div className="relative z-10 grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                  {[
                    { label: 'Volume', value: '42km' },
                    { label: 'Allure', value: "5'12" },
                    { label: 'Forme', value: '↑ 8%' },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center">
                      <div className="text-white font-mono text-lg italic">{stat.value}</div>
                      <div className="text-white/40 text-xs">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureText({ 
  feature, 
  index, 
  total,
  progress 
}: { 
  feature: FeatureItem; 
  index: number; 
  total: number;
  progress: any;
}) {
  const start = index / total;
  const end = (index + 1) / total;
  const mid = (start + end) / 2;

  const opacity = useTransform(
    progress,
    [start, start + 0.1, mid, end - 0.1, end],
    [0, 1, 1, 1, 0]
  );
  
  const y = useTransform(
    progress,
    [start, start + 0.1, end - 0.1, end],
    [60, 0, 0, -60]
  );

  const scale = useTransform(
    progress,
    [start, start + 0.1, end - 0.1, end],
    [0.95, 1, 1, 0.95]
  );

  return (
    <motion.div 
      style={{ opacity, y, scale }}
      className="absolute inset-0 flex flex-col justify-center"
    >
      {/* Feature number */}
      <div className="flex items-baseline gap-4 mb-6">
        <span className="text-7xl md:text-8xl font-mono italic text-transparent bg-clip-text bg-gradient-to-r from-[#ee95b3] to-[#667abf]">
          0{feature.id}
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-white/30 to-transparent" />
      </div>

      {/* Feature title */}
      <h3 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4 tracking-tight">
        {feature.title}
      </h3>

      {/* Feature description */}
      <p className="text-lg md:text-xl text-white/70 leading-relaxed mb-8 max-w-md">
        {feature.description}
      </p>

      {/* Feature metric */}
      <div className="inline-flex items-center gap-4 px-6 py-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 w-fit">
        <span className="text-3xl font-mono italic text-white">{feature.metric}</span>
        <span className="text-white/50">{feature.metricLabel}</span>
      </div>
    </motion.div>
  );
}

// ============================================================================
// SCROLL INDICATOR COMPONENT
// ============================================================================

function ScrollIndicator() {
  return (
    <motion.div 
      className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.5, duration: 0.6 }}
    >
      <span className="text-white/50 text-sm tracking-widest uppercase">Scroll</span>
      <motion.div 
        className="w-6 h-10 rounded-full border-2 border-white/30 flex justify-center pt-2"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <motion.div 
          className="w-1.5 h-1.5 rounded-full bg-white"
          animate={{ y: [0, 16, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function HomeCinematic() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll progress for hero effects
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  // Hero parallax and blur effects
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 1.15]);
  const heroBlur = useTransform(scrollYProgress, [0, 0.3], [0, 10]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.3], [0.3, 0.7]);

  // Stats reveal
  const statsOpacity = useTransform(scrollYProgress, [0.1, 0.25], [0, 1]);
  const statsY = useTransform(scrollYProgress, [0.1, 0.25], [50, 0]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  const backgroundImage = isDark
    ? '/allure-nightlightfourth-background.png'
    : '/allure-daylightfourth-background.png';

  return (
    <div ref={containerRef} className="relative">
      {/* ================================================================== */}
      {/* HERO SECTION - Full viewport with parallax */}
      {/* ================================================================== */}
      <section className="relative h-[200vh]">
        {/* Fixed hero container */}
        <div className="sticky top-0 h-screen overflow-hidden">
          {/* Background image with parallax */}
          {mounted && (
            <motion.div 
              className="absolute inset-0"
              style={{ scale: heroScale }}
            >
              <Image
                src={backgroundImage}
                alt="Mountain landscape"
                fill
                className="object-cover"
                style={{ 
                  filter: `blur(${heroBlur.get()}px)`,
                }}
                priority
                sizes="100vw"
              />
              {/* Dynamic overlay */}
              <motion.div 
                className="absolute inset-0 bg-black"
                style={{ opacity: overlayOpacity }}
              />
            </motion.div>
          )}

          {/* Update blur dynamically */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              backdropFilter: useTransform(heroBlur, (v) => `blur(${v}px)`),
            }}
          />

          {/* Hero content */}
          <motion.div 
            className="relative z-10 h-full flex flex-col items-center justify-center px-6"
            style={{ opacity: heroOpacity }}
          >
            {/* Logo - Massive */}
            <motion.h1 
              className="font-branch text-[120px] md:text-[180px] lg:text-[220px] text-white leading-none tracking-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              style={{
                textShadow: '0 4px 60px rgba(0, 0, 0, 0.3)',
              }}
            >
              allure
            </motion.h1>

            {/* Tagline */}
            <motion.p 
              className="text-white/70 text-xl md:text-2xl font-light mt-4 tracking-wide"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              running intelligence
            </motion.p>

            {/* Scroll indicator */}
            <ScrollIndicator />
          </motion.div>

          {/* Stats overlay - appears on scroll */}
          <motion.div 
            className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
            style={{ opacity: statsOpacity, y: statsY }}
          >
            <div className="grid grid-cols-3 gap-8 md:gap-16 px-6">
              {heroStats.map((stat, index) => (
                <motion.div 
                  key={stat.label}
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                >
                  <div className="text-5xl md:text-7xl font-mono italic text-white font-bold tracking-tight">
                    {stat.value}
                  </div>
                  <div className="text-white/50 text-sm md:text-base mt-2 uppercase tracking-widest">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* ACCROCHE SECTION - Split screen with word animation */}
      {/* ================================================================== */}
      <section className="relative min-h-screen bg-[#0a0a0a] flex items-center overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#ee95b3]/5 via-transparent to-[#667abf]/5" />
        
        {/* Noise texture overlay */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="container mx-auto max-w-7xl px-6 py-24 lg:py-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: Animated text */}
            <div>
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="mb-8"
              >
                <span className="text-white/40 text-sm uppercase tracking-[0.3em]">
                  Intelligence artificielle
                </span>
              </motion.div>

              <AnimatedWords 
                text={accroche}
                className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-white leading-[1.1] tracking-tight"
              />

              <motion.p 
                className="text-white/60 text-lg md:text-xl mt-8 max-w-md leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                Connecte ton Strava. Laisse l'IA analyser tes données. 
                Reçois des suggestions personnalisées pour progresser.
              </motion.p>
            </div>

            {/* Right: Floating phone mockup */}
            <motion.div 
              className="relative flex justify-center lg:justify-end"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute -inset-20 bg-gradient-to-r from-[#ee95b3]/20 to-[#667abf]/20 blur-3xl rounded-full" />
                
                {/* Phone frame */}
                <motion.div 
                  className="relative w-[280px] md:w-[320px] aspect-[9/19] rounded-[3rem] bg-gradient-to-b from-white/10 to-white/5 border border-white/20 overflow-hidden"
                  style={{
                    boxShadow: '0 50px 100px -20px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)'
                  }}
                  animate={{ 
                    y: [0, -10, 0],
                  }}
                  transition={{ 
                    duration: 4, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  {/* Screen content */}
                  <div className="absolute inset-3 rounded-[2.5rem] bg-[#0f0f0f] overflow-hidden">
                    {/* Status bar */}
                    <div className="flex justify-between items-center px-6 py-3">
                      <span className="text-white/60 text-xs font-mono">9:41</span>
                      <div className="flex gap-1">
                        <div className="w-4 h-2 rounded-sm bg-white/60" />
                      </div>
                    </div>

                    {/* App content preview */}
                    <div className="px-4 pt-4">
                      <div className="text-white/40 text-xs mb-1">Bonjour,</div>
                      <div className="text-white text-lg font-semibold mb-6">Elio 👋</div>
                      
                      {/* Stats cards */}
                      <div className="space-y-3">
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                          <div className="flex justify-between items-center">
                            <span className="text-white/60 text-sm">Cette semaine</span>
                            <span className="text-emerald-400 text-xs">+12%</span>
                          </div>
                          <div className="text-white text-2xl font-mono italic mt-1">42.3 km</div>
                        </div>
                        
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#ee95b3]/10 to-[#667abf]/10 border border-white/10">
                          <div className="text-white/60 text-sm mb-2">Suggestion IA</div>
                          <div className="text-white text-sm">Récupération active demain - footing 6km en zone 2</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notch */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full" />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* FEATURES SECTION - Sticky scroll */}
      {/* ================================================================== */}
      <section className="bg-[#0a0a0a]">
        <StickyFeatures features={features} />
      </section>

      {/* ================================================================== */}
      {/* CTA SECTION - Magnetic button */}
      {/* ================================================================== */}
      <section className="relative min-h-screen bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#ee95b3]/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#667abf]/10 rounded-full blur-[150px]" />

        <div className="relative z-10 text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold text-white mb-6 tracking-tight">
              Prêt à progresser ?
            </h2>
            
            <p className="text-white/50 text-lg md:text-xl max-w-md mx-auto mb-12">
              Connecte ton compte Strava et découvre ton potentiel en quelques secondes.
            </p>

            {/* Magnetic CTA button */}
            <MagneticButton>
              <Link href="/import">
                <Button 
                  size="lg" 
                  className="group relative text-lg md:text-xl px-12 py-8 bg-white text-black hover:bg-white hover:scale-105 transition-all duration-300 font-bold rounded-full overflow-hidden"
                  style={{
                    boxShadow: '0 0 60px rgba(255, 255, 255, 0.3), 0 20px 40px -10px rgba(0, 0, 0, 0.5)'
                  }}
                >
                  {/* Sheen effect on hover */}
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  
                  <span className="relative flex items-center gap-3">
                    {/* Strava logo */}
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="#FC4C02">
                      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                    </svg>
                    Connecter Strava
                  </span>
                </Button>
              </Link>
            </MagneticButton>

            {/* Trust badges */}
            <motion.div 
              className="flex items-center justify-center gap-8 mt-16 text-white/30 text-sm"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <span>🔒 Données sécurisées</span>
              <span>⚡ Sync instantanée</span>
              <span>🆓 Gratuit pour commencer</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* FOOTER - Minimal */}
      {/* ================================================================== */}
      <footer className="bg-[#0a0a0a] border-t border-white/5 py-12">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="font-branch text-3xl text-white/80">allure</div>
            <div className="text-white/30 text-sm">
              © 2025 Allure. Fait avec passion pour les coureurs.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
