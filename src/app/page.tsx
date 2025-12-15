'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200' 
          : 'bg-white/50 backdrop-blur-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 via-orange-400 to-orange-600 rounded-xl flex items-center justify-center text-lg font-bold shadow-lg group-hover:shadow-xl transition-shadow">⭐</div>
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">FamilyRewards</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-gray-600 hover:text-gray-900 font-medium transition">Features</a>
            <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 font-medium transition">How It Works</a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 font-medium transition">Pricing</a>
            <Link href="/auth/login" className="text-gray-600 hover:text-gray-900 font-medium transition">Sign In</Link>
            <Link href="/auth/login" className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-medium">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white via-indigo-50 to-white">
        {/* Animated Background Elements */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/2 left-1/4 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-indigo-100 rounded-full">
              <span className="text-sm font-semibold text-indigo-700">✨ Transform Your Family Today</span>
            </div>
            <h1 className="text-6xl md:text-7xl font-bold text-gray-900 mb-8 leading-tight">
              Turn Chores Into <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Epic Adventures</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-10 leading-relaxed max-w-2xl mx-auto">
              Make family routines engaging with a smart reward system. Parents manage tasks, kids earn stars, everyone wins together.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/auth/login">
                <button className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all transform hover:scale-105">
                  👨‍👩‍👧 Start as Parent
                </button>
              </Link>
              <Link href="/child/login">
                <button className="px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-bold text-lg transition-all transform hover:scale-105 border-2 border-gray-300">
                  👶 Join as Child
                </button>
              </Link>
            </div>

            {/* Trust Badge */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔒</span>
                <span>Secure & Safe</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">⚡</span>
                <span>No Credit Card</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">👨‍👩‍👧‍👦</span>
                <span>10,000+ Families</span>
              </div>
            </div>
          </div>

          {/* Enhanced Hero Visual */}
          <div className="relative mt-16">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 rounded-3xl blur-xl opacity-50"></div>
            <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
              <div className="grid md:grid-cols-3 gap-6 p-8 sm:p-12">
                <div className="group bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-8 hover:shadow-lg transition-all cursor-pointer">
                  <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">⭐</div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">Earn Stars</h3>
                  <p className="text-sm text-gray-700">Complete tasks and watch your stars grow every day</p>
                </div>
                <div className="group bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-8 hover:shadow-lg transition-all cursor-pointer">
                  <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🔥</div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">Build Streaks</h3>
                  <p className="text-sm text-gray-700">Stay consistent and unlock streak bonuses</p>
                </div>
                <div className="group bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl p-8 hover:shadow-lg transition-all cursor-pointer">
                  <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🎁</div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">Get Rewards</h3>
                  <p className="text-sm text-gray-700">Trade your stars for amazing rewards</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">Powerful Features for Every Family Member</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Everything you need to build responsibility, motivation, and trust in your family</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Parent Features */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-3xl p-10 shadow-xl border border-indigo-200">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-2xl">👨‍👩‍👧</div>
                <h3 className="text-3xl font-bold text-gray-900">Parent Features</h3>
              </div>
              <ul className="space-y-6">
                <li className="flex gap-4">
                  <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">✓</div>
                  <div>
                    <p className="font-bold text-lg text-gray-900">Create Custom Tasks</p>
                    <p className="text-gray-700 mt-1">Design chores, learning activities, or personal goals tailored to your family's needs</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">✓</div>
                  <div>
                    <p className="font-bold text-lg text-gray-900">Smart Star System</p>
                    <p className="text-gray-700 mt-1">Assign meaningful point values to motivate specific behaviors and achievements</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">✓</div>
                  <div>
                    <p className="font-bold text-lg text-gray-900">Trust & Approval System</p>
                    <p className="text-gray-700 mt-1">Set approval rules based on trust levels and watch kids build responsibility</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">✓</div>
                  <div>
                    <p className="font-bold text-lg text-gray-900">Real-Time Analytics</p>
                    <p className="text-gray-700 mt-1">Monitor progress, streaks, and achievements with beautiful dashboards</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">✓</div>
                  <div>
                    <p className="font-bold text-lg text-gray-900">Screen Time Management</p>
                    <p className="text-gray-700 mt-1">Set digital limits and track healthy device habits for better balance</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">✓</div>
                  <div>
                    <p className="font-bold text-lg text-gray-900">Meaningful Rewards</p>
                    <p className="text-gray-700 mt-1">Create personalized rewards your kids actually want to work towards</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Kid Features */}
            <div className="bg-gradient-to-br from-pink-50 to-rose-100 rounded-3xl p-10 shadow-xl border border-pink-200">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-gradient-to-br from-pink-600 to-rose-600 rounded-2xl flex items-center justify-center text-2xl">👶</div>
                <h3 className="text-3xl font-bold text-gray-900">Kid Features</h3>
              </div>
              <ul className="space-y-6">
                <li className="flex gap-4">
                  <div className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">✓</div>
                  <div>
                    <p className="font-bold text-lg text-gray-900">Fun Task Dashboard</p>
                    <p className="text-gray-700 mt-1">See all your tasks in a colorful, engaging interface designed just for you</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">✓</div>
                  <div>
                    <p className="font-bold text-lg text-gray-900">Earn Stars Instantly</p>
                    <p className="text-gray-700 mt-1">Get immediate feedback and celebrate every task completion</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">✓</div>
                  <div>
                    <p className="font-bold text-lg text-gray-900">Build Amazing Streaks</p>
                    <p className="text-gray-700 mt-1">Stay consistent and unlock special streak bonuses and achievements</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">✓</div>
                  <div>
                    <p className="font-bold text-lg text-gray-900">Unlock Achievements</p>
                    <p className="text-gray-700 mt-1">Collect badges and celebrate special milestones along the way</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">✓</div>
                  <div>
                    <p className="font-bold text-lg text-gray-900">Redeem Awesome Rewards</p>
                    <p className="text-gray-700 mt-1">Trade your hard-earned stars for rewards you've been wanting</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">✓</div>
                  <div>
                    <p className="font-bold text-lg text-gray-900">Safe & Age-Appropriate</p>
                    <p className="text-gray-700 mt-1">Interface designed with different age groups in mind</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Get started in minutes with our simple, intuitive setup process</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 relative">
            {/* Connection Lines */}
            <div className="hidden md:block absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200"></div>

            <div className="relative">
              <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-indigo-600 h-full">
                <div className="absolute -top-6 left-8 w-12 h-12 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">1</div>
                <h3 className="font-bold text-lg text-gray-900 mb-3 pt-4">Create Account</h3>
                <p className="text-gray-700">Sign up as a parent and set up your family profile in seconds</p>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-purple-600 h-full">
                <div className="absolute -top-6 left-8 w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">2</div>
                <h3 className="font-bold text-lg text-gray-900 mb-3 pt-4">Create Tasks</h3>
                <p className="text-gray-700">Add chores and activities with point values that motivate</p>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-pink-600 h-full">
                <div className="absolute -top-6 left-8 w-12 h-12 bg-gradient-to-br from-pink-600 to-pink-700 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">3</div>
                <h3 className="font-bold text-lg text-gray-900 mb-3 pt-4">Kids Complete Tasks</h3>
                <p className="text-gray-700">Children log in and mark tasks as done, earning stars</p>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-rose-600 h-full">
                <div className="absolute -top-6 left-8 w-12 h-12 bg-gradient-to-br from-rose-600 to-rose-700 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">4</div>
                <h3 className="font-bold text-lg text-gray-900 mb-3 pt-4">Redeem & Celebrate</h3>
                <p className="text-gray-700">Trade stars for meaningful rewards and build confidence</p>
              </div>
            </div>
          </div>

          {/* Additional Benefits Row */}
          <div className="mt-20 grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 bg-indigo-50 rounded-2xl border border-indigo-200">
              <div className="text-4xl mb-4">📱</div>
              <h4 className="font-bold text-lg text-gray-900 mb-2">Works Everywhere</h4>
              <p className="text-gray-700">Access on any device - phone, tablet, or computer</p>
            </div>
            <div className="text-center p-8 bg-purple-50 rounded-2xl border border-purple-200">
              <div className="text-4xl mb-4">⚡</div>
              <h4 className="font-bold text-lg text-gray-900 mb-2">Instant Setup</h4>
              <p className="text-gray-700">Get your family started in less than 5 minutes</p>
            </div>
            <div className="text-center p-8 bg-pink-50 rounded-2xl border border-pink-200">
              <div className="text-4xl mb-4">🎯</div>
              <h4 className="font-bold text-lg text-gray-900 mb-2">Results Fast</h4>
              <p className="text-gray-700">See behavior improvements within the first week</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Choose a plan that grows with your family. Always flexible, no hidden fees.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white rounded-2xl p-10 shadow-lg border-2 border-gray-200 hover:shadow-xl transition-shadow">
              <h3 className="text-3xl font-bold text-gray-900 mb-2">Free Plan</h3>
              <p className="text-gray-600 mb-8">Perfect for trying it out</p>
              <div className="mb-8">
                <span className="text-5xl font-bold text-gray-900">$0</span>
                <span className="text-gray-600 text-lg">/month</span>
              </div>
              <ul className="space-y-4 mb-10">
                <li className="flex gap-3 items-start">
                  <span className="text-green-600 font-bold text-lg flex-shrink-0">✓</span>
                  <span className="text-gray-700">Up to 2 children</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-green-600 font-bold text-lg flex-shrink-0">✓</span>
                  <span className="text-gray-700">Up to 5 tasks per child</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-green-600 font-bold text-lg flex-shrink-0">✓</span>
                  <span className="text-gray-700">Basic task management</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-green-600 font-bold text-lg flex-shrink-0">✓</span>
                  <span className="text-gray-700">Screen time tracking</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-red-400 font-bold text-lg flex-shrink-0">✕</span>
                  <span className="text-gray-500">Recurring tasks</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-red-400 font-bold text-lg flex-shrink-0">✕</span>
                  <span className="text-gray-500">Email notifications</span>
                </li>
              </ul>
              <button className="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-bold transition-all">Get Started Free</button>
            </div>

            {/* Premium Plan */}
            <div className="relative bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-10 shadow-2xl border-2 border-indigo-400 hover:shadow-2xl transition-shadow">
              <div className="absolute -top-5 right-8 bg-yellow-400 text-yellow-900 px-4 py-2 rounded-full font-bold text-sm shadow-lg">⭐ MOST POPULAR</div>
              <h3 className="text-3xl font-bold text-white mb-2 pt-4">Premium Plan</h3>
              <p className="text-indigo-100 mb-8">For growing families</p>
              <div className="mb-8">
                <span className="text-5xl font-bold text-white">$9.99</span>
                <span className="text-indigo-100 text-lg">/month</span>
              </div>
              <ul className="space-y-4 mb-10">
                <li className="flex gap-3 items-start">
                  <span className="text-green-300 font-bold text-lg flex-shrink-0">✓</span>
                  <span className="text-white">Unlimited children</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-green-300 font-bold text-lg flex-shrink-0">✓</span>
                  <span className="text-white">Unlimited tasks</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-green-300 font-bold text-lg flex-shrink-0">✓</span>
                  <span className="text-white">Recurring & scheduled tasks</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-green-300 font-bold text-lg flex-shrink-0">✓</span>
                  <span className="text-white">Advanced achievements & streaks</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-green-300 font-bold text-lg flex-shrink-0">✓</span>
                  <span className="text-white">Email & push notifications</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-green-300 font-bold text-lg flex-shrink-0">✓</span>
                  <span className="text-white">Advanced analytics & reports</span>
                </li>
              </ul>
              <button className="w-full px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold hover:bg-gray-100 transition-all">Start Free Trial</button>
              <p className="text-center text-indigo-200 text-sm mt-4">7-day free trial. Cancel anytime.</p>
            </div>
          </div>

          {/* Pricing FAQ */}
          <div className="mt-20 max-w-3xl mx-auto bg-gray-50 rounded-2xl p-10 border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h3>
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-gray-900 mb-2">Can I cancel my subscription anytime?</h4>
                <p className="text-gray-700">Yes! You can cancel at any time with no penalty or hidden charges.</p>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-2">Is there a credit card required for the free plan?</h4>
                <p className="text-gray-700">No credit card needed! Try the free plan to explore all the features.</p>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-2">What if I need more children on the free plan?</h4>
                <p className="text-gray-700">You can upgrade to Premium at any time, and we'll pro-rate the costs.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">Loved by Families Worldwide</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Real stories from parents and kids who've transformed their family life</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
              <div className="flex gap-1 mb-4 text-yellow-400 text-xl">⭐⭐⭐⭐⭐</div>
              <p className="text-gray-700 mb-6 text-lg leading-relaxed">"This app completely transformed how our family handles chores. The kids are actually motivated and excited to complete tasks. We've seen real behavior changes!"</p>
              <div>
                <p className="font-bold text-gray-900 text-lg">Sarah M.</p>
                <p className="text-gray-600">Parent of 2, San Francisco</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
              <div className="flex gap-1 mb-4 text-yellow-400 text-xl">⭐⭐⭐⭐⭐</div>
              <p className="text-gray-700 mb-6 text-lg leading-relaxed">"My kids love earning stars and building streaks. It's fun, it's fair, and it keeps them accountable. They actually ask me to add more tasks!"</p>
              <div>
                <p className="font-bold text-gray-900 text-lg">James L.</p>
                <p className="text-gray-600">Parent of 3, New York</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
              <div className="flex gap-1 mb-4 text-yellow-400 text-xl">⭐⭐⭐⭐⭐</div>
              <p className="text-gray-700 mb-6 text-lg leading-relaxed">"The trust system is brilliant! It helped my kids understand that with responsibility comes freedom. They've become so much more independent."</p>
              <div>
                <p className="font-bold text-gray-900 text-lg">Emma K.</p>
                <p className="text-gray-600">Parent of 2, Seattle</p>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="mt-20 grid md:grid-cols-4 gap-6">
            <div className="text-center p-8 bg-indigo-50 rounded-2xl border border-indigo-200">
              <div className="text-4xl font-bold text-indigo-600 mb-2">10K+</div>
              <p className="text-gray-700 font-medium">Active Families</p>
            </div>
            <div className="text-center p-8 bg-purple-50 rounded-2xl border border-purple-200">
              <div className="text-4xl font-bold text-purple-600 mb-2">100K+</div>
              <p className="text-gray-700 font-medium">Tasks Completed</p>
            </div>
            <div className="text-center p-8 bg-pink-50 rounded-2xl border border-pink-200">
              <div className="text-4xl font-bold text-pink-600 mb-2">4.9★</div>
              <p className="text-gray-700 font-medium">Average Rating</p>
            </div>
            <div className="text-center p-8 bg-rose-50 rounded-2xl border border-rose-200">
              <div className="text-4xl font-bold text-rose-600 mb-2">50M+</div>
              <p className="text-gray-700 font-medium">Stars Earned</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-0 right-0 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-8 leading-tight">Ready to Transform Your Family?</h2>
          <p className="text-2xl text-indigo-100 mb-12 leading-relaxed">Join thousands of families who've discovered a better way to motivate and connect.</p>
          <p className="text-lg text-indigo-200 mb-12">Start for free today. No credit card required.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/login">
              <button className="px-10 py-4 bg-white text-indigo-600 rounded-xl font-bold text-lg hover:bg-gray-100 shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                👨‍👩‍👧 Get Started as Parent
              </button>
            </Link>
            <Link href="/child/login">
              <button className="px-10 py-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                👶 Join as Child
              </button>
            </Link>
          </div>
          <p className="mt-8 text-indigo-200 text-sm">Takes less than 2 minutes to set up</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center text-lg font-bold">⭐</div>
                <span className="font-bold text-white text-lg">FamilyRewards</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">Making family life easier, one task at a time.</p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-6">Product</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/subscriptions" className="hover:text-white transition">Pricing</Link></li>
                <li><a href="/#features" className="hover:text-white transition">Features</a></li>
                <li><Link href="/auth/login" className="hover:text-white transition">Security</Link></li>
                <li><Link href="/auth/login" className="hover:text-white transition">Privacy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-6">Company</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="/#" className="hover:text-white transition">About Us</a></li>
                <li><a href="/#" className="hover:text-white transition">Blog</a></li>
                <li><a href="/#" className="hover:text-white transition">Contact</a></li>
                <li><a href="/#" className="hover:text-white transition">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-6">Resources</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="/#" className="hover:text-white transition">Help Center</a></li>
                <li><a href="/#" className="hover:text-white transition">Documentation</a></li>
                <li><a href="/#" className="hover:text-white transition">Status</a></li>
                <li><a href="/#" className="hover:text-white transition">Community</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-6">Legal</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="/#" className="hover:text-white transition">Privacy Policy</a></li>
                <li><a href="/#" className="hover:text-white transition">Terms of Service</a></li>
                <li><a href="/#" className="hover:text-white transition">Cookie Policy</a></li>
                <li><a href="/#" className="hover:text-white transition">Disclaimer</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-12">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <p className="text-sm text-gray-500">© 2025 FamilyRewards. All rights reserved. Made with ❤️ for families.</p>
              <div className="flex gap-6">
                <a href="/#" className="text-gray-400 hover:text-white transition">Twitter</a>
                <a href="/#" className="text-gray-400 hover:text-white transition">Facebook</a>
                <a href="/#" className="text-gray-400 hover:text-white transition">Instagram</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
