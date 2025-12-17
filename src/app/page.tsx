'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// ============================================
// DISNEY STORYBOOK COLOR PALETTE
// ============================================
const colors = {
  disneyBlue: '#4A90D9',       // Sky blue castle
  royalPurple: '#6B4C9A',      // Magical purple
  sunsetOrange: '#E8734A',     // Warm sunset
  enchantedTeal: '#2D9B8A',    // Forest green
  parchment: '#F5E6D3',        // Old paper
  parchmentDark: '#E8D5BE',    // Aged paper
  inkBrown: '#4A3728',         // Ink color
  goldAccent: '#C9A227',       // Gold trim
  white: '#FFFFFF',
};

// ============================================
// SPARKLE ANIMATION
// ============================================
function Sparkles() {
  const [sparkles, setSparkles] = useState<Array<{
    left: string;
    top: string;
    animationDelay: string;
    animationDuration: string;
    size: string;
  }>>([]);

  useEffect(() => {
    const newSparkles = Array.from({ length: 30 }).map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 3}s`,
      animationDuration: `${1.5 + Math.random() * 2}s`,
      size: `${4 + Math.random() * 8}px`
    }));
    setSparkles(newSparkles);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {sparkles.map((sparkle, i) => (
        <div
          key={i}
          className="absolute animate-pulse"
          style={{
            left: sparkle.left,
            top: sparkle.top,
            animationDelay: sparkle.animationDelay,
            animationDuration: sparkle.animationDuration,
          }}
        >
          <span className="text-yellow-200" style={{ fontSize: sparkle.size, textShadow: '0 0 4px gold' }}>
            ✦
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================
// MAIN LANDING PAGE
// ============================================
export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: '#FFFBF0' }}>

      {/* NAVIGATION */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white/90 shadow-md backdrop-blur-sm py-2' : 'bg-transparent py-4'
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🏰</span>
            <span className="text-2xl font-bold font-serif" style={{ color: colors.royalPurple }}>
              Pinmbo World
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login"
              className="px-6 py-2 rounded-full font-bold transition-transform hover:scale-105"
              style={{
                backgroundColor: colors.disneyBlue,
                color: 'white',
                boxShadow: '0 4px 0 #357ABD',
              }}
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 inset-x-0 h-[600px] rounded-b-[50%] bg-gradient-to-b from-blue-100 to-transparent -z-10" />

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="mb-6 inline-block px-4 py-1 rounded-full bg-yellow-100 border border-yellow-300 text-yellow-800 font-bold text-sm tracking-wide uppercase shadow-sm">
            ✨ The Magic Starts Here
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6" style={{ fontFamily: 'Georgia, serif', color: colors.inkBrown }}>
            Where Chores Become <br />
            <span style={{ color: colors.royalPurple, textShadow: '2px 2px 0px rgba(0,0,0,0.1)' }}>Magical Adventures</span>
          </h1>

          <p className="text-xl md:text-2xl mb-10 max-w-2xl mx-auto leading-relaxed" style={{ color: '#666' }}>
            Turn everyday tasks into a fun journey. Kids earn stars, unlock treasures, and build legends together!
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-6 mb-16">
            <Link href="/auth/login">
              <button className="px-8 py-4 rounded-2xl font-bold text-lg text-white shadow-xl transition-transform hover:scale-105 hover:-translate-y-1"
                style={{
                  background: `linear-gradient(135deg, ${colors.disneyBlue}, ${colors.royalPurple})`,
                  border: `2px solid ${colors.goldAccent}`
                }}
              >
                👑 Start as Parent
              </button>
            </Link>
            <Link href="/child/login">
              <button className="px-8 py-4 rounded-2xl font-bold text-lg shadow-xl transition-transform hover:scale-105 hover:-translate-y-1 bg-white"
                style={{
                  color: colors.royalPurple,
                  border: `2px solid ${colors.royalPurple}`
                }}
              >
                ⚔️ Join as Hero
              </button>
            </Link>
          </div>

          {/* Hero Image / Castle */}
          <div className="relative max-w-4xl mx-auto rounded-3xl overflow-hidden shadow-2xl border-8 border-white">
            <div className="aspect-video relative bg-blue-50">
              <img
                src="/images/disney-castle.png"
                alt="Magic Castle"
                className="w-full h-full object-cover"
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <Sparkles />

              <div className="absolute bottom-6 left-0 right-0 text-white font-serif text-2xl italic tracking-wide">
                "Every task is a step towards greatness"
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION (Magical Cards) */}
      <section className="py-24 px-4 bg-white relative">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 font-serif" style={{ color: colors.inkBrown }}>
            Your Family's New Story
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* FEATURE 1 */}
            <div className="group p-8 rounded-3xl bg-blue-50 border-2 border-blue-100 hover:border-blue-300 transition-all hover:shadow-xl text-center">
              <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center text-4xl shadow-md mb-6 group-hover:scale-110 transition-transform">
                ⭐
              </div>
              <h3 className="text-2xl font-bold mb-4 font-serif" style={{ color: colors.royalPurple }}>Earn Magic Stars</h3>
              <p className="text-gray-600 text-lg">
                Brush teeth? Clean room? Every deed earns magical stars that sparkle in your collection.
              </p>
            </div>

            {/* FEATURE 2 */}
            <div className="group p-8 rounded-3xl bg-purple-50 border-2 border-purple-100 hover:border-purple-300 transition-all hover:shadow-xl text-center">
              <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center text-4xl shadow-md mb-6 group-hover:scale-110 transition-transform">
                🎁
              </div>
              <h3 className="text-2xl font-bold mb-4 font-serif" style={{ color: colors.royalPurple }}>Unlock Treasures</h3>
              <p className="text-gray-600 text-lg">
                Save up your stars to unlock real treasures! Movie nights, new toys, or special outings.
              </p>
            </div>

            {/* FEATURE 3 */}
            <div className="group p-8 rounded-3xl bg-orange-50 border-2 border-orange-100 hover:border-orange-300 transition-all hover:shadow-xl text-center">
              <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center text-4xl shadow-md mb-6 group-hover:scale-110 transition-transform">
                🔥
              </div>
              <h3 className="text-2xl font-bold mb-4 font-serif" style={{ color: colors.royalPurple }}>Build Your Legend</h3>
              <p className="text-gray-600 text-lg">
                Keep your streak alive to become a legendary hero in the family hall of fame.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="py-24 px-4 relative overflow-hidden text-white"
        style={{ background: `linear-gradient(to right, ${colors.royalPurple}, ${colors.disneyBlue})` }}>

        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold mb-8 font-serif">
            Ready to Start the Adventure?
          </h2>
          <p className="text-xl md:text-2xl mb-12 opacity-90">
            Join thousands of families turning "have to" into "want to".
          </p>
          <Link href="/auth/login">
            <button className="px-12 py-5 bg-white rounded-full font-bold text-xl text-purple-700 shadow-2xl transition-transform hover:scale-105 hover:shadow-white/20">
              Begin Your Journey ✨
            </button>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-4 text-center border-t border-gray-200" style={{ backgroundColor: '#FFFBF0' }}>
        <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
          <span className="text-2xl">🏰</span>
          <span className="font-serif font-bold text-xl">Pinmbo World</span>
        </div>
        <p className="text-gray-500">© 2025 Pinmbo World. Made with magic for families everywhere.</p>
      </footer>

    </div>
  );
}
