'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Home() {
  const [selectedRole, setSelectedRole] = useState<'parent' | 'child' | null>(null);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center text-lg">⭐</div>
            <span className="text-xl font-bold text-gray-900">FamilyRewards</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-gray-600 hover:text-gray-900 font-medium">Sign In</Link>
            <Link href="/auth/login" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-indigo-50 via-white to-white py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Turn Chores Into <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Adventures</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Transform your family's daily routine with an engaging reward system. Parents manage tasks, kids earn stars, everyone wins!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/login">
                <button className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all">
                  👨‍👩‍👧 For Parents
                </button>
              </Link>
              <Link href="/child/login">
                <button className="px-8 py-4 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-xl font-semibold text-lg transition-all">
                  👶 For Kids
                </button>
              </Link>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative mt-12">
            <div className="bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl p-8 sm:p-12">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="text-4xl mb-3">⭐</div>
                  <p className="text-sm text-gray-600">Earn Stars by completing tasks</p>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="text-4xl mb-3">🔥</div>
                  <p className="text-sm text-gray-600">Build streaks with consistency</p>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="text-4xl mb-3">🎁</div>
                  <p className="text-sm text-gray-600">Redeem amazing rewards</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Powerful Features</h2>
            <p className="text-xl text-gray-600">Everything you need to motivate your family</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Parent Features */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">👨‍👩‍👧 For Parents</h3>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="font-semibold text-gray-900">Create Custom Tasks</p>
                    <p className="text-sm text-gray-600">Design chores and activities tailored to your family</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <p className="font-semibold text-gray-900">Set Star Rewards</p>
                    <p className="text-sm text-gray-600">Assign point values to motivate action</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-2xl">🛡️</span>
                  <div>
                    <p className="font-semibold text-gray-900">Trust Management</p>
                    <p className="text-sm text-gray-600">Control approval rules based on trust levels</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-2xl">📊</span>
                  <div>
                    <p className="font-semibold text-gray-900">Track Progress</p>
                    <p className="text-sm text-gray-600">Monitor achievements and streaks in real-time</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-2xl">💰</span>
                  <div>
                    <p className="font-semibold text-gray-900">Manage Screen Time</p>
                    <p className="text-sm text-gray-600">Set limits and balance digital habits</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-2xl">🎁</span>
                  <div>
                    <p className="font-semibold text-gray-900">Custom Rewards</p>
                    <p className="text-sm text-gray-600">Create meaningful rewards kids actually want</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Kid Features */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">👶 For Kids</h3>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <span className="text-2xl">📋</span>
                  <div>
                    <p className="font-semibold text-gray-900">View Assigned Tasks</p>
                    <p className="text-sm text-gray-600">See what needs to be done in a fun interface</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-2xl">⭐</span>
                  <div>
                    <p className="font-semibold text-gray-900">Earn Stars</p>
                    <p className="text-sm text-gray-600">Get rewarded for completing tasks</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-2xl">🔥</span>
                  <div>
                    <p className="font-semibold text-gray-900">Build Streaks</p>
                    <p className="text-sm text-gray-600">Maintain consistency and earn bonuses</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <p className="font-semibold text-gray-900">Unlock Achievements</p>
                    <p className="text-sm text-gray-600">Celebrate milestones and special accomplishments</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-2xl">🎁</span>
                  <div>
                    <p className="font-semibold text-gray-900">Redeem Rewards</p>
                    <p className="text-sm text-gray-600">Trade stars for treats and privileges</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-2xl">😊</span>
                  <div>
                    <p className="font-semibold text-gray-900">Age-Appropriate Design</p>
                    <p className="text-sm text-gray-600">Interface tailored to different age groups</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Simple steps to transform your family</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">1️⃣</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Sign Up</h3>
              <p className="text-sm text-gray-600">Create your family account as a parent</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">2️⃣</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Add Tasks</h3>
              <p className="text-sm text-gray-600">Create chores and set star values</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">3️⃣</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Kids Complete</h3>
              <p className="text-sm text-gray-600">Children log in and mark tasks done</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">4️⃣</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Redeem</h3>
              <p className="text-sm text-gray-600">Trade stars for amazing rewards</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple Pricing</h2>
            <p className="text-xl text-gray-600">Choose the perfect plan for your family</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Free Plan</h3>
              <p className="text-gray-600 mb-6">Perfect for getting started</p>
              <div className="text-4xl font-bold text-gray-900 mb-6">$0<span className="text-lg text-gray-600">/month</span></div>
              <ul className="space-y-3 mb-8">
                <li className="flex gap-2">
                  <span>✅</span>
                  <span className="text-gray-700">Up to 2 children</span>
                </li>
                <li className="flex gap-2">
                  <span>✅</span>
                  <span className="text-gray-700">Up to 5 tasks per child</span>
                </li>
                <li className="flex gap-2">
                  <span>✅</span>
                  <span className="text-gray-700">Basic task management</span>
                </li>
                <li className="flex gap-2">
                  <span>✅</span>
                  <span className="text-gray-700">Screen time tracking</span>
                </li>
                <li className="flex gap-2">
                  <span>❌</span>
                  <span className="text-gray-400">Recurring tasks</span>
                </li>
              </ul>
              <button className="w-full px-6 py-3 bg-gray-200 text-gray-900 rounded-lg font-semibold hover:bg-gray-300">Get Started</button>
            </div>

            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-8 shadow-lg ring-2 ring-indigo-600 relative">
              <div className="absolute -top-4 left-6 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold">Most Popular</div>
              <h3 className="text-2xl font-bold text-white mb-2">Premium Plan</h3>
              <p className="text-indigo-100 mb-6">For growing families</p>
              <div className="text-4xl font-bold text-white mb-6">$9.99<span className="text-lg text-indigo-100">/month</span></div>
              <ul className="space-y-3 mb-8">
                <li className="flex gap-2">
                  <span>✅</span>
                  <span className="text-white">Unlimited children</span>
                </li>
                <li className="flex gap-2">
                  <span>✅</span>
                  <span className="text-white">Unlimited tasks</span>
                </li>
                <li className="flex gap-2">
                  <span>✅</span>
                  <span className="text-white">Recurring tasks</span>
                </li>
                <li className="flex gap-2">
                  <span>✅</span>
                  <span className="text-white">Achievements & streaks</span>
                </li>
                <li className="flex gap-2">
                  <span>✅</span>
                  <span className="text-white">Email notifications</span>
                </li>
              </ul>
              <button className="w-full px-6 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-gray-100">Upgrade to Premium</button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Loved by Families</h2>
            <p className="text-xl text-gray-600">See what parents and kids are saying</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <div className="flex gap-1 mb-4">⭐⭐⭐⭐⭐</div>
              <p className="text-gray-700 mb-4">"This app completely changed how our family handles chores. The kids are actually motivated!"</p>
              <p className="font-semibold text-gray-900">Sarah M.</p>
              <p className="text-sm text-gray-600">Parent of 2</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <div className="flex gap-1 mb-4">⭐⭐⭐⭐⭐</div>
              <p className="text-gray-700 mb-4">"My kids love earning stars and building streaks. It's fun and keeps them accountable."</p>
              <p className="font-semibold text-gray-900">James L.</p>
              <p className="text-sm text-gray-600">Parent of 3</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <div className="flex gap-1 mb-4">⭐⭐⭐⭐⭐</div>
              <p className="text-gray-700 mb-4">"The trust system is brilliant. It helps kids build responsibility naturally."</p>
              <p className="font-semibold text-gray-900">Emma K.</p>
              <p className="text-sm text-gray-600">Parent of 2</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Family?</h2>
          <p className="text-xl mb-8 text-indigo-100">Start for free today. No credit card required.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/login">
              <button className="px-8 py-4 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-gray-100 text-lg">
                Get Started as Parent
              </button>
            </Link>
            <Link href="/child/login">
              <button className="px-8 py-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl font-semibold text-lg">
                Join as Child
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center text-sm">⭐</div>
                <span className="font-bold text-white">FamilyRewards</span>
              </div>
              <p className="text-sm">Making family life easier, one task at a time.</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/subscriptions" className="hover:text-white">Pricing</Link></li>
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Privacy</a></li>
                <li><a href="#" className="hover:text-white">Terms</a></li>
                <li><a href="#" className="hover:text-white">Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>© 2025 FamilyRewards. All rights reserved. Made with ❤️ for families.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
