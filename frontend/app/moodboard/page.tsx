'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MoodboardPage() {
  const fonts = [
    { name: 'Magilio', variable: '--font-magilio' },
    { name: 'Branch', variable: '--font-branch' },
    { name: 'Sonder', variable: '--font-sonder' },
    { name: 'Casta', variable: '--font-casta' },
    { name: 'Kate', variable: '--font-kate' },
    { name: 'Kenoky', variable: '--font-kenoky' },
    { name: 'Coffekan', variable: '--font-coffekan' },
    { name: 'Flaviotte', variable: '--font-flaviotte' },
    { name: 'Auge', variable: '--font-auge-regular' },
    { name: 'Bantayog', variable: '--font-bantayog' },
    { name: 'Roundelay', variable: '--font-roundelay' },
    { name: 'Outfit', variable: '--font-outfit-regular' },
  ];

  // Variations spéciales pour Branch
  const branchVariations = [
    { name: 'Branch - Stride Bold, AI Normal', strideWeight: 'font-black', strideSize: 'text-4xl', aiWeight: 'font-normal', aiSize: 'text-4xl' },
    { name: 'Branch - Stride ExtraBold, AI Light', strideWeight: 'font-extrabold', strideSize: 'text-5xl', aiWeight: 'font-light', aiSize: 'text-3xl' },
    { name: 'Branch - Stride Larger & Bold', strideWeight: 'font-black', strideSize: 'text-5xl', aiWeight: 'font-medium', aiSize: 'text-3xl' },
    { name: 'Branch - Stride XL & Black', strideWeight: 'font-black', strideSize: 'text-6xl', aiWeight: 'font-normal', aiSize: 'text-3xl' },
    { name: 'Branch - Stride Bold + Bigger', strideWeight: 'font-bold', strideSize: 'text-5xl', aiWeight: 'font-light', aiSize: 'text-4xl' },
    { name: 'Branch - Stride Heavy Contrast', strideWeight: 'font-black', strideSize: 'text-6xl', aiWeight: 'font-thin', aiSize: 'text-2xl' },
  ];

  // Finales "allure" - Variations avec Branch
  const minimalApproaches = [
    // ALLURE - Typo Branch + Logo
    {
      name: '⭐ allure - Branch + Logo (carré gradient)',
      font: '--font-branch',
      layout: 'horizontal-clean',
      showGradient: false,
      logoSize: 'w-16 h-16',
      textSize: 'text-5xl',
      text: 'allure',
      logoStyle: 'with-square',
      description: 'Élégance Branch + logo gradient classique'
    },
    {
      name: '⭐ allure - Branch + Logo gradient pur',
      font: '--font-branch',
      layout: 'horizontal-clean',
      showGradient: false,
      logoSize: 'w-16 h-16',
      textSize: 'text-5xl',
      text: 'allure',
      logoStyle: 'gradient-only',
      description: 'Logo sans fond, gradient sur icône'
    },
    {
      name: 'allure - Typo seule (Branch)',
      font: '--font-branch',
      layout: 'text-only-clean',
      showGradient: false,
      textSize: 'text-6xl',
      text: 'allure',
      description: 'Pure élégance typographique'
    },
    // Comparaison avec Outfit
    {
      name: 'allure - Horizontal (Outfit)',
      font: '--font-outfit-regular',
      layout: 'horizontal-clean',
      showGradient: false,
      logoSize: 'w-16 h-16',
      textSize: 'text-4xl',
      text: 'allure',
      description: 'Pour comparaison'
    },
    // CADENCE - Top 3
    {
      name: 'cadence - Logo Central (Outfit)',
      font: '--font-outfit-regular',
      layout: 'logo-first-clean',
      showGradient: false,
      logoSize: 'w-24 h-24',
      textSize: 'text-3xl',
      text: 'cadence',
      description: 'Minimalisme radical'
    },
    {
      name: 'cadence - Typo seule (Branch)',
      font: '--font-branch',
      layout: 'text-only-clean',
      showGradient: false,
      textSize: 'text-6xl',
      text: 'cadence',
      description: 'Pure élégance'
    },
    {
      name: 'cadence - Horizontal (Outfit)',
      font: '--font-outfit-regular',
      layout: 'horizontal-clean',
      showGradient: false,
      logoSize: 'w-16 h-16',
      textSize: 'text-4xl',
      text: 'cadence',
      description: 'Classique équilibré'
    }
  ];

  // Anciennes variations (commentées pour référence)
  const oldApproaches_commented = [
    {
      name: 'Branch Regular - Sans forcer le bold (ARCHIVE)',
      font: '--font-branch',
      layout: 'horizontal',
      showGradient: false,
      logoSize: 'w-16 h-16',
      textSize: 'text-4xl',
      description: 'Ligatures préservées'
    },
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="container mx-auto max-w-7xl">
        <h1 className="text-4xl font-black mb-12 text-center">Logo Moodboard - StrideAI</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {fonts.map((font) => (
            <Card key={font.name} className="overflow-hidden">
              <CardHeader className="bg-accent/30">
                <CardTitle className="text-center text-xl">{font.name}</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                {/* Version 1: Police sur "Stride" - Normal */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground font-medium">
                    {font.name} on "Stride" - Normal
                  </p>
                  <div className="flex items-center gap-4">
                    <div
                      className="relative w-16 h-16 rounded-2xl shadow-lg p-2 flex-shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, #fdab01 0%, #fea501 10%, #f8985c 20%, #e77491 30%, #d5639e 40%, #d55f9b 50%, #c964b4 70%, #9c65f6 85%, #aa51fb 100%)'
                      }}
                    >
                      <Image
                        src="/icon.png"
                        alt="Logo"
                        width={64}
                        height={64}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <h2 className="text-4xl font-black text-foreground">
                      <span className={`font-[family-name:var(${font.variable})]`}>Stride</span>
                      <span style={{
                        background: 'linear-gradient(135deg, #fdab01 0%, #fea501 10%, #f8985c 20%, #e77491 30%, #d5639e 40%, #d55f9b 50%, #c964b4 70%, #9c65f6 85%, #aa51fb 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                      }}>AI</span>
                    </h2>
                  </div>
                </div>

                {/* Version 2: Police sur "Stride" - Italic */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground font-medium">
                    {font.name} on "Stride" - Italic
                  </p>
                  <div className="flex items-center gap-4">
                    <div
                      className="relative w-16 h-16 rounded-2xl shadow-lg p-2 flex-shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, #fdab01 0%, #fea501 10%, #f8985c 20%, #e77491 30%, #d5639e 40%, #d55f9b 50%, #c964b4 70%, #9c65f6 85%, #aa51fb 100%)'
                      }}
                    >
                      <Image
                        src="/icon.png"
                        alt="Logo"
                        width={64}
                        height={64}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <h2 className="text-4xl font-black text-foreground">
                      <span className={`font-[family-name:var(${font.variable})] italic`}>Stride</span>
                      <span style={{
                        background: 'linear-gradient(135deg, #fdab01 0%, #fea501 10%, #f8985c 20%, #e77491 30%, #d5639e 40%, #d55f9b 50%, #c964b4 70%, #9c65f6 85%, #aa51fb 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                      }}>AI</span>
                    </h2>
                  </div>
                </div>

                <div className="border-t border-border my-4"></div>

                {/* Version 3: Police sur "AI" - Normal */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground font-medium">
                    {font.name} on "AI" - Normal
                  </p>
                  <div className="flex items-center gap-4">
                    <div
                      className="relative w-16 h-16 rounded-2xl shadow-lg p-2 flex-shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, #fdab01 0%, #fea501 10%, #f8985c 20%, #e77491 30%, #d5639e 40%, #d55f9b 50%, #c964b4 70%, #9c65f6 85%, #aa51fb 100%)'
                      }}
                    >
                      <Image
                        src="/icon.png"
                        alt="Logo"
                        width={64}
                        height={64}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <h2 className="text-4xl font-black text-foreground">
                      <span>Stride</span>
                      <span className={`font-[family-name:var(${font.variable})]`} style={{
                        background: 'linear-gradient(135deg, #fdab01 0%, #fea501 10%, #f8985c 20%, #e77491 30%, #d5639e 40%, #d55f9b 50%, #c964b4 70%, #9c65f6 85%, #aa51fb 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                      }}>AI</span>
                    </h2>
                  </div>
                </div>

                {/* Version 4: Police sur "AI" - Italic */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground font-medium">
                    {font.name} on "AI" - Italic
                  </p>
                  <div className="flex items-center gap-4">
                    <div
                      className="relative w-16 h-16 rounded-2xl shadow-lg p-2 flex-shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, #fdab01 0%, #fea501 10%, #f8985c 20%, #e77491 30%, #d5639e 40%, #d55f9b 50%, #c964b4 70%, #9c65f6 85%, #aa51fb 100%)'
                      }}
                    >
                      <Image
                        src="/icon.png"
                        alt="Logo"
                        width={64}
                        height={64}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <h2 className="text-4xl font-black text-foreground">
                      <span>Stride</span>
                      <span className={`font-[family-name:var(${font.variable})] italic inline-block`} style={{
                        background: 'linear-gradient(135deg, #fdab01 0%, #fea501 10%, #f8985c 20%, #e77491 30%, #d5639e 40%, #d55f9b 50%, #c964b4 70%, #9c65f6 85%, #aa51fb 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        paddingRight: '0.5em'
                      }}>AI</span>
                    </h2>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Section spéciale: Variations de Branch */}
        <div className="mt-16">
          <h2 className="text-3xl font-black mb-8 text-center">Branch - Variations Poids & Taille</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {branchVariations.map((variation) => (
              <Card key={variation.name} className="overflow-hidden">
                <CardHeader className="bg-purple-100 dark:bg-purple-900/30">
                  <CardTitle className="text-center text-lg">{variation.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-8 flex items-center justify-center min-h-[200px]">
                  <div className="flex items-center gap-4">
                    <div
                      className="relative w-20 h-20 rounded-2xl shadow-lg p-2 flex-shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, #fdab01 0%, #fea501 10%, #f8985c 20%, #e77491 30%, #d5639e 40%, #d55f9b 50%, #c964b4 70%, #9c65f6 85%, #aa51fb 100%)'
                      }}
                    >
                      <Image
                        src="/icon.png"
                        alt="Logo"
                        width={80}
                        height={80}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className={`font-[family-name:var(--font-branch)] ${variation.strideWeight} ${variation.strideSize} text-foreground`}>
                        Stride
                      </span>
                      <span
                        className={`font-[family-name:var(--font-branch)] ${variation.aiWeight} ${variation.aiSize}`}
                        style={{
                          background: 'linear-gradient(135deg, #fdab01 0%, #fea501 10%, #f8985c 20%, #e77491 30%, #d5639e 40%, #d55f9b 50%, #c964b4 70%, #9c65f6 85%, #aa51fb 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text'
                        }}
                      >
                        AI
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Section: Approches Minimalistes Recommandées */}
        <div className="mt-16">
          <h2 className="text-3xl font-black mb-8 text-center">Approches Minimalistes - Recommandations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {minimalApproaches.map((approach) => (
              <Card key={approach.name} className="overflow-hidden">
                <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
                  <CardTitle className="text-center text-lg">{approach.name}</CardTitle>
                  <p className="text-sm text-muted-foreground text-center mt-1">{approach.description}</p>
                </CardHeader>
                <CardContent className="p-8 flex items-center justify-center min-h-[200px]">
                  {/* Layout: logo-first-clean (Logo central + text seul) */}
                  {approach.layout === 'logo-first-clean' && (
                    <div className="flex flex-col items-center gap-4">
                      <div
                        className={`relative ${approach.logoSize} rounded-2xl shadow-lg p-3 flex-shrink-0`}
                        style={{
                          background: 'linear-gradient(135deg, #fdab01 0%, #fea501 10%, #f8985c 20%, #e77491 30%, #d5639e 40%, #d55f9b 50%, #c964b4 70%, #9c65f6 85%, #aa51fb 100%)'
                        }}
                      >
                        <Image
                          src="/icon.png"
                          alt="Logo"
                          width={96}
                          height={96}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className={`font-[family-name:var(${approach.font})] ${approach.textSize} font-normal text-foreground`}>
                        {approach.text || 'Stride'}
                      </span>
                    </div>
                  )}

                  {/* Layout: text-only-clean (Text seul, grande taille) */}
                  {approach.layout === 'text-only-clean' && (
                    <span className={`font-[family-name:var(${approach.font})] ${approach.textSize} font-normal text-foreground`}>
                      {approach.text || 'Stride'}
                    </span>
                  )}

                  {/* Layout: horizontal-clean (Logo + text horizontal simple) */}
                  {approach.layout === 'horizontal-clean' && (
                    <div className="flex items-center gap-4">
                      {/* Logo avec carré gradient (défaut) */}
                      {(!approach.logoStyle || approach.logoStyle === 'with-square') && (
                        <div
                          className={`relative ${approach.logoSize} rounded-2xl shadow-lg p-2 flex-shrink-0`}
                          style={{
                            background: 'linear-gradient(135deg, #fdab01 0%, #fea501 10%, #f8985c 20%, #e77491 30%, #d5639e 40%, #d55f9b 50%, #c964b4 70%, #9c65f6 85%, #aa51fb 100%)'
                          }}
                        >
                          <Image
                            src="/icon.png"
                            alt="Logo"
                            width={64}
                            height={64}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}

                      {/* Logo avec gradient pur (sans carré) */}
                      {approach.logoStyle === 'gradient-only' && (
                        <div className={`relative ${approach.logoSize} flex-shrink-0`}>
                          <div
                            className="w-full h-full"
                            style={{
                              background: 'linear-gradient(135deg, #fdab01 0%, #fea501 10%, #f8985c 20%, #e77491 30%, #d5639e 40%, #d55f9b 50%, #c964b4 70%, #9c65f6 85%, #aa51fb 100%)',
                              WebkitMaskImage: 'url(/icon.png)',
                              WebkitMaskSize: 'contain',
                              WebkitMaskRepeat: 'no-repeat',
                              WebkitMaskPosition: 'center',
                              maskImage: 'url(/icon.png)',
                              maskSize: 'contain',
                              maskRepeat: 'no-repeat',
                              maskPosition: 'center'
                            }}
                          />
                        </div>
                      )}
                      <span className={`font-[family-name:var(${approach.font})] ${approach.textSize} font-normal text-foreground`}>
                        {approach.text || 'Stride'}
                      </span>
                    </div>
                  )}

                  {/* Layout: logo-first-with-ai (Logo central + text AI) */}
                  {approach.layout === 'logo-first-with-ai' && (
                    <div className="flex flex-col items-center gap-4">
                      <div
                        className={`relative ${approach.logoSize} rounded-2xl shadow-lg p-3 flex-shrink-0`}
                        style={{
                          background: 'linear-gradient(135deg, #fdab01 0%, #fea501 10%, #f8985c 20%, #e77491 30%, #d5639e 40%, #d55f9b 50%, #c964b4 70%, #9c65f6 85%, #aa51fb 100%)'
                        }}
                      >
                        <Image
                          src="/icon.png"
                          alt="Logo"
                          width={96}
                          height={96}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className={`flex items-baseline gap-1 ${approach.textSize} font-normal text-foreground`}>
                        <span className={`font-[family-name:var(${approach.font})]`}>
                          {approach.text || 'Stride'}
                        </span>
                        <span className={`font-[family-name:var(${approach.font})]`}>AI</span>
                      </div>
                    </div>
                  )}

                  {/* Layout: horizontal-with-ai (Logo + text AI horizontal) */}
                  {approach.layout === 'horizontal-with-ai' && (
                    <div className="flex items-center gap-4">
                      <div
                        className={`relative ${approach.logoSize} rounded-2xl shadow-lg p-2 flex-shrink-0`}
                        style={{
                          background: 'linear-gradient(135deg, #fdab01 0%, #fea501 10%, #f8985c 20%, #e77491 30%, #d5639e 40%, #d55f9b 50%, #c964b4 70%, #9c65f6 85%, #aa51fb 100%)'
                        }}
                      >
                        <Image
                          src="/icon.png"
                          alt="Logo"
                          width={64}
                          height={64}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className={`flex items-baseline gap-1 ${approach.textSize} font-normal text-foreground`}>
                        <span className={`font-[family-name:var(${approach.font})]`}>
                          {approach.text || 'Stride'}
                        </span>
                        <span className={`font-[family-name:var(${approach.font})]`}>AI</span>
                      </div>
                    </div>
                  )}

                  {/* Layout: text-only-with-ai (Text AI seul) */}
                  {approach.layout === 'text-only-with-ai' && (
                    <div className={`flex items-baseline gap-2 ${approach.textSize} font-normal text-foreground`}>
                      <span className={`font-[family-name:var(${approach.font})]`}>
                        {approach.text || 'Stride'}
                      </span>
                      <span className={`font-[family-name:var(${approach.font})]`}>AI</span>
                    </div>
                  )}

                  {/* Layout: horizontal-hierarchy (Mix #1 + #4) */}
                  {approach.layout === 'horizontal-hierarchy' && (
                    <div className="flex items-center gap-4">
                      <div
                        className={`relative ${approach.logoSize} rounded-2xl shadow-lg p-2 flex-shrink-0`}
                        style={{
                          background: 'linear-gradient(135deg, #fdab01 0%, #fea501 10%, #f8985c 20%, #e77491 30%, #d5639e 40%, #d55f9b 50%, #c964b4 70%, #9c65f6 85%, #aa51fb 100%)'
                        }}
                      >
                        <Image
                          src="/icon.png"
                          alt="Logo"
                          width={64}
                          height={64}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex items-baseline gap-2 font-normal text-foreground">
                        <span className={`font-[family-name:var(${approach.font})] ${'strideSize' in approach ? approach.strideSize : 'text-4xl'}`}>
                          Stride
                        </span>
                        <span className={`font-[family-name:var(${approach.font})] ${'aiSize' in approach ? approach.aiSize : 'text-2xl'} uppercase tracking-wider`}>
                          AI
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Layout: horizontal-hierarchy-spaced (Plus d'air) */}
                  {approach.layout === 'horizontal-hierarchy-spaced' && (
                    <div className="flex items-center gap-8">
                      <div
                        className={`relative ${approach.logoSize} rounded-2xl shadow-lg p-2 flex-shrink-0`}
                        style={{
                          background: 'linear-gradient(135deg, #fdab01 0%, #fea501 10%, #f8985c 20%, #e77491 30%, #d5639e 40%, #d55f9b 50%, #c964b4 70%, #9c65f6 85%, #aa51fb 100%)'
                        }}
                      >
                        <Image
                          src="/icon.png"
                          alt="Logo"
                          width={64}
                          height={64}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex items-baseline gap-3 font-normal text-foreground">
                        <span className={`font-[family-name:var(${approach.font})] ${'strideSize' in approach ? approach.strideSize : 'text-4xl'}`}>
                          Stride
                        </span>
                        <span className={`font-[family-name:var(${approach.font})] ${'aiSize' in approach ? approach.aiSize : 'text-2xl'} uppercase tracking-wider`}>
                          AI
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Layout: horizontal */}
                  {approach.layout === 'horizontal' && (
                    <div className="flex items-center gap-4">
                      <div
                        className={`relative ${approach.logoSize} rounded-2xl shadow-lg p-2 flex-shrink-0`}
                        style={{
                          background: 'linear-gradient(135deg, #fdab01 0%, #fea501 10%, #f8985c 20%, #e77491 30%, #d5639e 40%, #d55f9b 50%, #c964b4 70%, #9c65f6 85%, #aa51fb 100%)'
                        }}
                      >
                        <Image
                          src="/icon.png"
                          alt="Logo"
                          width={64}
                          height={64}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className={`flex items-baseline gap-1 ${approach.textSize} font-normal text-foreground`}>
                        <span className={`font-[family-name:var(${approach.font})]`}>
                          Stride
                        </span>
                        {approach.showGradient === false ? (
                          <span className={`font-[family-name:var(${approach.font})]`}>AI</span>
                        ) : (approach.showGradient as unknown) === 'subtle' ? (
                          <span
                            className={`font-[family-name:var(${approach.font})]`}
                            style={{
                              background: 'linear-gradient(135deg, #fdab01 0%, #fea501 10%, #f8985c 20%, #e77491 30%, #d5639e 40%, #d55f9b 50%, #c964b4 70%, #9c65f6 85%, #aa51fb 100%)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                              opacity: 0.4
                            }}
                          >
                            AI
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {/* Layout: text-only */}
                  {approach.layout === 'text-only' && (
                    <div className={`flex items-baseline gap-1 ${approach.textSize} font-normal text-foreground`}>
                      <span className={`font-[family-name:var(${approach.font})]`}>
                        Stride
                      </span>
                      <span className={`font-[family-name:var(${approach.font})]`}>AI</span>
                    </div>
                  )}

                  {/* Layout: text-only-sizes (Stride grand, AI small caps) */}
                  {approach.layout === 'text-only-sizes' && (
                    <div className="flex items-baseline gap-2 font-normal text-foreground">
                      <span className={`font-[family-name:var(${approach.font})] ${approach.textSize}`}>
                        Stride
                      </span>
                      <span className={`font-[family-name:var(${approach.font})] ${'aiSize' in approach ? approach.aiSize : 'text-2xl'} uppercase tracking-wider`}>
                        AI
                      </span>
                    </div>
                  )}

                  {/* Layout: logo-first (Logo central, texte dessous) */}
                  {approach.layout === 'logo-first' && (
                    <div className="flex flex-col items-center gap-4">
                      <div
                        className={`relative ${approach.logoSize} rounded-2xl shadow-lg p-3 flex-shrink-0`}
                        style={{
                          background: 'linear-gradient(135deg, #fdab01 0%, #fea501 10%, #f8985c 20%, #e77491 30%, #d5639e 40%, #d55f9b 50%, #c964b4 70%, #9c65f6 85%, #aa51fb 100%)'
                        }}
                      >
                        <Image
                          src="/icon.png"
                          alt="Logo"
                          width={96}
                          height={96}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className={`flex items-baseline gap-1 ${approach.textSize} font-normal text-foreground`}>
                        <span className={`font-[family-name:var(${approach.font})]`}>
                          Stride
                        </span>
                        <span className={`font-[family-name:var(${approach.font})]`}>AI</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
