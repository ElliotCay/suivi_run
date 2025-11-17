'use client';

import Image from 'next/image';
import localFont from 'next/font/local';

const branchFont = localFont({
  src: '../fonts/Branch.otf',
  variable: '--font-branch'
});

export default function IconComparison() {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8 ${branchFont.variable}`}>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12">Icon Refinement Comparison</h1>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Original PNG */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl">
            <h2 className="text-xl font-semibold mb-6 text-center">Original PNG</h2>
            <div className="flex items-center justify-center mb-6 h-64">
              <Image
                src="/icon.png"
                alt="Original"
                width={200}
                height={200}
                className="object-contain"
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Version actuelle
            </p>
          </div>

          {/* Refined SVG */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl">
            <h2 className="text-xl font-semibold mb-6 text-center">Refined SVG</h2>
            <div className="flex items-center justify-center mb-6 h-64">
              <Image
                src="/icon-refined.svg"
                alt="Refined"
                width={200}
                height={200}
                className="object-contain"
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Contours -10%, étoiles ajustées
            </p>
          </div>

          {/* Gradient SVG */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl">
            <h2 className="text-xl font-semibold mb-6 text-center">Gradient SVG</h2>
            <div className="flex items-center justify-center mb-6 h-64">
              <Image
                src="/icon-gradient.svg"
                alt="Gradient"
                width={200}
                height={200}
                className="object-contain"
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Gradient 40° • Orange → Violet
            </p>
          </div>
        </div>

        {/* Logo combinations with Branch font */}
        <div className="space-y-12">
          <h2 className="text-3xl font-bold text-center">Logo + Typography Combinations</h2>

          {/* Original */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-xl">
            <h3 className="text-lg font-semibold mb-8 text-center text-gray-600 dark:text-gray-400">
              Original (PNG dans carré gradient)
            </h3>
            <div className="flex items-center justify-center gap-6">
              <div
                className="relative w-20 h-20 rounded-2xl shadow-lg p-2 flex-shrink-0"
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
              <span className="font-[family-name:var(--font-branch)] text-6xl font-normal">
                allure
              </span>
            </div>
          </div>

          {/* Refined in gradient square */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-xl">
            <h3 className="text-lg font-semibold mb-8 text-center text-gray-600 dark:text-gray-400">
              ⭐ Refined (SVG dans carré gradient)
            </h3>
            <div className="flex items-center justify-center gap-6">
              <div
                className="relative w-20 h-20 rounded-2xl shadow-lg p-2 flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #fdab01 0%, #fea501 10%, #f8985c 20%, #e77491 30%, #d5639e 40%, #d55f9b 50%, #c964b4 70%, #9c65f6 85%, #aa51fb 100%)'
                }}
              >
                <Image
                  src="/icon-mono.svg"
                  alt="Logo"
                  width={64}
                  height={64}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-[family-name:var(--font-branch)] text-6xl font-normal">
                allure
              </span>
            </div>
          </div>

          {/* Gradient icon only */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-xl">
            <h3 className="text-lg font-semibold mb-8 text-center text-gray-600 dark:text-gray-400">
              Gradient pur (2 teintes • 40°)
            </h3>
            <div className="flex items-center justify-center gap-6">
              <Image
                src="/icon-gradient.svg"
                alt="Logo"
                width={80}
                height={80}
                className="object-contain"
              />
              <span className="font-[family-name:var(--font-branch)] text-6xl font-normal">
                allure
              </span>
            </div>
          </div>

          {/* Mono version on gradient background */}
          <div className="rounded-2xl p-12 shadow-xl relative overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(135deg, #FF6B35 0%, #9B4DCA 100%)'
              }}
            />
            <div className="relative">
              <h3 className="text-lg font-semibold mb-8 text-center text-white">
                Mono version (sur fond coloré)
              </h3>
              <div className="flex items-center justify-center gap-6 text-white">
                <Image
                  src="/icon-mono.svg"
                  alt="Logo"
                  width={80}
                  height={80}
                  className="object-contain"
                  style={{ color: 'white' }}
                />
                <span className="font-[family-name:var(--font-branch)] text-6xl font-normal">
                  allure
                </span>
              </div>
            </div>
          </div>

          {/* Dark mode test */}
          <div className="bg-gray-900 rounded-2xl p-12 shadow-xl">
            <h3 className="text-lg font-semibold mb-8 text-center text-gray-400">
              Mode sombre (mono)
            </h3>
            <div className="flex items-center justify-center gap-6 text-white">
              <Image
                src="/icon-mono.svg"
                alt="Logo"
                width={80}
                height={80}
                className="object-contain"
                style={{ color: 'white' }}
              />
              <span className="font-[family-name:var(--font-branch)] text-6xl font-normal">
                allure
              </span>
            </div>
          </div>
        </div>

        {/* Nouvelles versions ChatGPT style */}
        <div className="mt-16 space-y-12">
          <h2 className="text-3xl font-bold text-center">🆕 Nouvelles versions ChatGPT</h2>

          {/* ChatGPT Mono NOIR in gradient square */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-xl">
            <h3 className="text-lg font-semibold mb-8 text-center text-gray-600 dark:text-gray-400">
              ⭐ ChatGPT Mono (dans carré gradient)
            </h3>
            <div className="flex items-center justify-center gap-6">
              <div
                className="relative w-24 h-24 rounded-2xl shadow-lg p-2 flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #fdab01 0%, #fea501 10%, #f8985c 20%, #e77491 30%, #d5639e 40%, #d55f9b 50%, #c964b4 70%, #9c65f6 85%, #aa51fb 100%)'
                }}
              >
                <Image
                  src="/chatgpt-runner-mono.png"
                  alt="Logo"
                  width={112}
                  height={112}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-[family-name:var(--font-branch)] text-6xl font-normal">
                allure
              </span>
            </div>
          </div>

          {/* ChatGPT Gradient - gap-1 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-xl">
            <h3 className="text-lg font-semibold mb-8 text-center text-gray-600 dark:text-gray-400">
              ⭐ ChatGPT Gradient (gap-1)
            </h3>
            <div className="flex items-center justify-center gap-1">
              <Image
                src="/chatgpt-runner-gradient.png"
                alt="Logo"
                width={112}
                height={112}
                className="object-contain"
              />
              <span className="font-[family-name:var(--font-branch)] text-6xl font-normal">
                allure
              </span>
            </div>
          </div>

          {/* ChatGPT Gradient - gap-0 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-xl">
            <h3 className="text-lg font-semibold mb-8 text-center text-gray-600 dark:text-gray-400">
              ChatGPT Gradient (gap-0)
            </h3>
            <div className="flex items-center justify-center gap-0">
              <Image
                src="/chatgpt-runner-gradient.png"
                alt="Logo"
                width={112}
                height={112}
                className="object-contain"
              />
              <span className="font-[family-name:var(--font-branch)] text-6xl font-normal">
                allure
              </span>
            </div>
          </div>

          {/* ChatGPT Gradient in square */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-xl">
            <h3 className="text-lg font-semibold mb-8 text-center text-gray-600 dark:text-gray-400">
              ChatGPT Gradient (dans carré gradient)
            </h3>
            <div className="flex items-center justify-center gap-6">
              <div
                className="relative w-24 h-24 rounded-2xl shadow-lg p-2 flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #fdab01 0%, #fea501 10%, #f8985c 20%, #e77491 30%, #d5639e 40%, #d55f9b 50%, #c964b4 70%, #9c65f6 85%, #aa51fb 100%)'
                }}
              >
                <Image
                  src="/chatgpt-runner-gradient.png"
                  alt="Logo"
                  width={112}
                  height={112}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-[family-name:var(--font-branch)] text-6xl font-normal">
                allure
              </span>
            </div>
          </div>

          {/* ChatGPT Mono Blanc dark mode - gap-1 */}
          <div className="bg-gray-900 rounded-2xl p-12 shadow-xl">
            <h3 className="text-lg font-semibold mb-8 text-center text-gray-400">
              ⭐ ChatGPT Mono Blanc (mode sombre, gap-1)
            </h3>
            <div className="flex items-center justify-center gap-1 text-white">
              <Image
                src="/chatgpt-runner-mono.png"
                alt="Logo"
                width={112}
                height={112}
                className="object-contain brightness-0 invert"
              />
              <span className="font-[family-name:var(--font-branch)] text-6xl font-normal">
                allure
              </span>
            </div>
          </div>

          {/* Version tout noir - Logo + texte noir - gap-1 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-xl">
            <h3 className="text-lg font-semibold mb-8 text-center text-gray-600 dark:text-gray-400">
              ⭐ Version Mono Noir (logo + texte, gap-1)
            </h3>
            <div className="flex items-center justify-center gap-1 text-black">
              <Image
                src="/chatgpt-runner-mono.png"
                alt="Logo"
                width={112}
                height={112}
                className="object-contain"
              />
              <span className="font-[family-name:var(--font-branch)] text-6xl font-normal text-black">
                allure
              </span>
            </div>
          </div>

          {/* Version Mono Noir - gap-0 pour comparaison */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-xl">
            <h3 className="text-lg font-semibold mb-8 text-center text-gray-600 dark:text-gray-400">
              Version Mono Noir (gap-0)
            </h3>
            <div className="flex items-center justify-center gap-0 text-black">
              <Image
                src="/chatgpt-runner-mono.png"
                alt="Logo"
                width={112}
                height={112}
                className="object-contain"
              />
              <span className="font-[family-name:var(--font-branch)] text-6xl font-normal text-black">
                allure
              </span>
            </div>
          </div>

          {/* Version Mono Blanc - marge négative -4px */}
          <div className="bg-gray-900 rounded-2xl p-12 shadow-xl">
            <h3 className="text-lg font-semibold mb-8 text-center text-gray-400">
              ⭐ Mono Blanc (overlap -4px)
            </h3>
            <div className="flex items-center justify-center gap-0 text-white">
              <Image
                src="/chatgpt-runner-mono.png"
                alt="Logo"
                width={112}
                height={112}
                className="object-contain brightness-0 invert"
              />
              <span className="font-[family-name:var(--font-branch)] text-6xl font-normal -ml-1">
                allure
              </span>
            </div>
          </div>

          {/* Version Mono Blanc - marge négative -8px */}
          <div className="bg-gray-900 rounded-2xl p-12 shadow-xl">
            <h3 className="text-lg font-semibold mb-8 text-center text-gray-400">
              Mono Blanc (overlap -8px)
            </h3>
            <div className="flex items-center justify-center gap-0 text-white">
              <Image
                src="/chatgpt-runner-mono.png"
                alt="Logo"
                width={112}
                height={112}
                className="object-contain brightness-0 invert"
              />
              <span className="font-[family-name:var(--font-branch)] text-6xl font-normal -ml-2">
                allure
              </span>
            </div>
          </div>

          {/* Version Mono Noir - marge négative -4px */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-xl">
            <h3 className="text-lg font-semibold mb-8 text-center text-gray-600 dark:text-gray-400">
              ⭐ Mono Noir (overlap -4px)
            </h3>
            <div className="flex items-center justify-center gap-0 text-black">
              <Image
                src="/chatgpt-runner-mono.png"
                alt="Logo"
                width={112}
                height={112}
                className="object-contain"
              />
              <span className="font-[family-name:var(--font-branch)] text-6xl font-normal text-black -ml-1">
                allure
              </span>
            </div>
          </div>

          {/* Version Mono Noir - marge négative -8px */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-xl">
            <h3 className="text-lg font-semibold mb-8 text-center text-gray-600 dark:text-gray-400">
              Mono Noir (overlap -8px)
            </h3>
            <div className="flex items-center justify-center gap-0 text-black">
              <Image
                src="/chatgpt-runner-mono.png"
                alt="Logo"
                width={112}
                height={112}
                className="object-contain"
              />
              <span className="font-[family-name:var(--font-branch)] text-6xl font-normal text-black -ml-2">
                allure
              </span>
            </div>
          </div>
        </div>

        {/* Technical specs */}
        <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-8">
          <h3 className="text-xl font-bold mb-4">Améliorations appliquées:</h3>
          <ul className="space-y-2 text-gray-700 dark:text-gray-300">
            <li>✓ Contours affinés de ~10% (stroke-width: 18 au lieu de 20)</li>
            <li>✓ Étoiles réduites de 12% et espacées de +2px</li>
            <li>✓ Hauteur optique alignée sur la hampe du "l"</li>
            <li>✓ Gradient fixé à 40° avec palette courte (Orange #FF6B35 → Violet #9B4DCA)</li>
            <li>✓ Version monochrome pour fonds photos et mode sombre (currentColor)</li>
            <li>✓ Format SVG pour scalabilité parfaite</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
