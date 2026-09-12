'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Shield, Sparkles, Star } from 'lucide-react';

export default function SubscribePage() {
    const router = useRouter();
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(
        'yearly'
    );
    const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const isYearly = billingCycle === 'yearly';

    const handleSubscribe = (planId: string) => {
        setIsLoading(planId);
        setTimeout(() => {
            setIsLoading(null);
            setCheckoutMessage(
                `Checkout for ${planId} is not connected yet. This is a demo plan selection.`
            );
        }, 800);
    };

    return (
        <div data-testid="subscribe-page" className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-[var(--theme-accent)] text-white flex items-center justify-center">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <span className="font-black text-xl">Oopsly Pro</span>
                </div>
                <button
                    type="button"
                    data-testid="btn-subscribe-back"
                    onClick={() => router.push('/home')}
                    className="px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer"
                >
                    <ArrowRight className="w-4 h-4 rotate-180" />
                    Back
                </button>
            </div>

            <div className="text-center space-y-4">
                <h1 className="text-4xl font-black">Supercharge your memory.</h1>
                <p className="text-stone-600">
                    Unlock unlimited decks, AI generation, and exclusive garden
                    seeds.
                </p>
                <div className="inline-flex bg-stone-100 p-1.5 rounded-2xl">
                    <button
                        type="button"
                        data-testid="btn-billing-monthly"
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold cursor-pointer ${
                            !isYearly ? 'bg-white shadow-sm' : 'text-stone-500'
                        }`}
                    >
                        Monthly
                    </button>
                    <button
                        type="button"
                        data-testid="btn-billing-yearly"
                        onClick={() => setBillingCycle('yearly')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold cursor-pointer ${
                            isYearly
                                ? 'bg-[var(--theme-accent)] text-white'
                                : 'text-stone-500'
                        }`}
                    >
                        Yearly
                    </button>
                </div>
            </div>

            {checkoutMessage && (
                <p
                    data-testid="subscribe-demo-message"
                    className="text-center text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3"
                >
                    {checkoutMessage}
                </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-3xl p-8 border">
                    <h2 className="text-xl font-bold">Basic</h2>
                    <p className="text-sm text-stone-500 mt-2">Start learning.</p>
                    <div className="my-6 text-4xl font-black">$0</div>
                    <ul className="space-y-3 mb-8 text-sm">
                        {['Up to 3 decks', 'FSRS Algorithm', 'Basic stats'].map(
                            (f) => (
                                <li key={f} className="flex gap-2">
                                    <Check className="w-5 h-5 text-[var(--theme-accent)]" />
                                    {f}
                                </li>
                            )
                        )}
                    </ul>
                    <button
                        type="button"
                        disabled
                        className="w-full py-3.5 rounded-xl bg-stone-100 font-bold text-sm"
                    >
                        Current Plan
                    </button>
                </div>
                <div className="bg-stone-900 text-white rounded-3xl p-8 relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 text-xs font-black px-4 py-1 rounded-full flex items-center gap-1">
                        <Star className="w-3.5 h-3.5" /> Most Popular
                    </div>
                    <h2 className="text-xl font-bold">Pro</h2>
                    <div className="my-6 text-4xl font-black">
                        ${isYearly ? '7.99' : '9.99'}
                    </div>
                    <ul className="space-y-3 mb-8 text-sm text-stone-300">
                        {[
                            'Unlimited decks',
                            'AI generation',
                            'Advanced analytics',
                        ].map((f) => (
                            <li key={f} className="flex gap-2">
                                <Check className="w-5 h-5 text-[var(--theme-accent)]" />
                                {f}
                            </li>
                        ))}
                    </ul>
                    <button
                        type="button"
                        data-testid="btn-subscribe-pro"
                        onClick={() => handleSubscribe('pro')}
                        className="w-full py-3.5 rounded-xl bg-[var(--theme-accent)] font-bold text-sm cursor-pointer"
                    >
                        {isLoading === 'pro' ? 'Loading...' : 'Get Oopsly Pro'}
                    </button>
                </div>
                <div className="bg-white rounded-3xl p-8 border">
                    <h2 className="text-xl font-bold">Lifetime</h2>
                    <div className="my-6 text-4xl font-black">$199</div>
                    <ul className="space-y-3 mb-8 text-sm">
                        {['Everything in Pro', 'All future updates'].map((f) => (
                            <li key={f} className="flex gap-2">
                                <Check className="w-5 h-5 text-[var(--theme-accent)]" />
                                {f}
                            </li>
                        ))}
                    </ul>
                    <button
                        type="button"
                        data-testid="btn-subscribe-lifetime"
                        onClick={() => handleSubscribe('lifetime')}
                        className="w-full py-3.5 rounded-xl bg-stone-900 text-white font-bold text-sm cursor-pointer"
                    >
                        {isLoading === 'lifetime' ? 'Loading...' : 'Get Lifetime'}
                    </button>
                </div>
            </div>
            <div className="text-center text-sm text-stone-400 flex items-center justify-center gap-2">
                <Shield className="w-4 h-4" />
                Demo checkout only — Stripe is not connected.
            </div>
        </div>
    );
}
