'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Shield, Sparkles, Star } from 'lucide-react';
import { ApiService } from '@/services/api';
import { refreshSession } from '@/services/tokenRefresh';
import { BillingInterval, BillingPlanPrice, Plan } from '@/types';

interface PlanCard {
    id: Plan;
    name: string;
    blurb: string;
    features: string[];
}

const PLAN_CARDS: PlanCard[] = [
    {
        id: 'FREE',
        name: 'Basic',
        blurb: 'Start learning.',
        features: [
            'Up to 10 decks',
            '5 subjects and 5 test suites per deck',
            '25 cards per subject, 25 questions per suite',
            'Join any Quizzly game',
        ],
    },
    {
        id: 'PRO',
        name: 'Pro',
        blurb: 'For regular learners and teachers.',
        features: [
            'Up to 50 decks',
            '20 subjects and 20 test suites per deck',
            '100 cards per subject, 100 questions per suite',
            'Host Quizzly games for up to 50 players',
        ],
    },
    {
        id: 'PRO_PLUS',
        name: 'Pro Max',
        blurb: 'No limits.',
        features: [
            'Unlimited decks, subjects and test suites',
            'Unlimited cards and questions',
            'Host Quizzly games for up to 100 players',
        ],
    },
];

/** Formats an amount in the currency's smallest unit, whatever its decimals. */
function money(amount: number, currency: string): string {
    const format = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency.toUpperCase(),
    });
    const digits = format.resolvedOptions().maximumFractionDigits ?? 2;
    return format.format(amount / 10 ** digits);
}

export default function SubscribePage() {
    const router = useRouter();
    const [interval, setInterval] = useState<BillingInterval>('year');
    const [plan, setPlan] = useState<Plan>('FREE');
    const [prices, setPrices] = useState<BillingPlanPrice[]>([]);
    const [paymentsOn, setPaymentsOn] = useState(false);
    const [busy, setBusy] = useState<Plan | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const isYearly = interval === 'year';

    useEffect(() => {
        void ApiService.getBillingPlans().then((res) => {
            if (res.isSuccess && res.data) {
                setPaymentsOn(res.data.enabled);
                setPrices(res.data.plans);
            }
        });
        void ApiService.getMySubscription().then((res) => {
            if (res.isSuccess && res.data) setPlan(res.data.plan);
        });
        const params = new URLSearchParams(window.location.search);
        if (params.get('checkout') === 'success') {
            setNotice('Thank you! Your plan is being activated.');
            // The plan travels in the access token, so fetch a fresh one.
            void refreshSession().then(() =>
                ApiService.getMySubscription().then((res) => {
                    if (res.isSuccess && res.data) setPlan(res.data.plan);
                })
            );
        } else if (params.get('checkout') === 'cancelled') {
            setNotice('Checkout cancelled. You have not been charged.');
        }
    }, []);

    const priceOf = (id: Plan) =>
        prices.find((p) => p.plan === id && p.interval === interval);

    const go = async (id: Plan, action: () => Promise<{ url?: string }>) => {
        setBusy(id);
        setNotice(null);
        const data = await action();
        if (data.url) {
            window.location.assign(data.url);
            return;
        }
        setBusy(null);
    };

    const upgrade = (id: Plan) =>
        go(id, async () => {
            if (id === 'FREE') return {};
            const res = await ApiService.createCheckout(id, interval);
            if (res.isSuccess && res.data) return res.data;
            setNotice(res.message || 'Could not start the checkout.');
            return {};
        });

    const manage = () =>
        go(plan, async () => {
            const res = await ApiService.openBillingPortal();
            if (res.isSuccess && res.data) return res.data;
            setNotice(res.message || 'Could not open billing.');
            return {};
        });

    const buttonFor = (card: PlanCard) => {
        const base =
            'w-full py-3.5 rounded-xl font-bold text-sm cursor-pointer';
        if (card.id === plan) {
            return (
                <button
                    type="button"
                    disabled
                    data-testid={`btn-plan-${card.id}`}
                    className={`${base} bg-stone-100 text-stone-900 !cursor-default`}
                >
                    Current plan
                </button>
            );
        }
        if (card.id === 'FREE') {
            return paymentsOn && plan !== 'FREE' ? (
                <button
                    type="button"
                    data-testid="btn-manage-billing"
                    onClick={manage}
                    className={`${base} border`}
                >
                    Manage or cancel
                </button>
            ) : null;
        }
        if (plan !== 'FREE') {
            return (
                <button
                    type="button"
                    data-testid="btn-manage-billing"
                    onClick={manage}
                    className={`${base} bg-stone-900 text-white`}
                >
                    {busy === plan ? 'Loading...' : 'Switch plan in billing'}
                </button>
            );
        }
        return (
            <button
                type="button"
                data-testid={`btn-subscribe-${card.id}`}
                disabled={!paymentsOn || !priceOf(card.id) || busy !== null}
                onClick={() => upgrade(card.id)}
                className={`${base} bg-[var(--theme-accent)] text-white disabled:opacity-50 disabled:cursor-not-allowed`}
            >
                {!paymentsOn
                    ? 'Coming soon'
                    : busy === card.id
                      ? 'Loading...'
                      : `Get ${card.name}`}
            </button>
        );
    };

    return (
        <div data-testid="subscribe-page" className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-[var(--theme-accent)] text-white flex items-center justify-center">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <span className="font-black text-xl">Quizi Pro</span>
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
                <h1 className="text-4xl font-black">
                    Supercharge your memory.
                </h1>
                <p className="text-stone-600">
                    Build more, host Quizzly games and study without limits.
                </p>
                <div className="inline-flex bg-stone-100 p-1.5 rounded-2xl">
                    <button
                        type="button"
                        data-testid="btn-billing-monthly"
                        onClick={() => setInterval('month')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold cursor-pointer ${
                            !isYearly ? 'bg-white shadow-sm' : 'text-stone-500'
                        }`}
                    >
                        Monthly
                    </button>
                    <button
                        type="button"
                        data-testid="btn-billing-yearly"
                        onClick={() => setInterval('year')}
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

            {notice && (
                <p
                    data-testid="subscribe-notice"
                    role="status"
                    className="text-center text-sm text-stone-700 bg-stone-50 border border-stone-200 rounded-xl p-3"
                >
                    {notice}
                </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {PLAN_CARDS.map((card) => {
                    const price = priceOf(card.id);
                    const featured = card.id === 'PRO';
                    return (
                        <div
                            key={card.id}
                            data-testid={`plan-card-${card.id}`}
                            className={`rounded-3xl p-8 relative ${
                                featured
                                    ? 'bg-stone-900 text-white'
                                    : 'bg-white border'
                            }`}
                        >
                            {featured && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 text-xs font-black px-4 py-1 rounded-full flex items-center gap-1">
                                    <Star className="w-3.5 h-3.5" /> Most
                                    Popular
                                </div>
                            )}
                            <h2 className="text-xl font-bold">{card.name}</h2>
                            <p className="text-sm opacity-70 mt-2">
                                {card.blurb}
                            </p>
                            <div className="my-6 flex items-end gap-1">
                                <span
                                    data-testid={`price-${card.id}`}
                                    className="text-4xl font-black"
                                >
                                    {card.id === 'FREE'
                                        ? money(0, 'usd')
                                        : price
                                          ? money(price.amount, price.currency)
                                          : '—'}
                                </span>
                                {card.id !== 'FREE' && price && (
                                    <span className="text-sm opacity-70 pb-1">
                                        / {isYearly ? 'year' : 'month'}
                                    </span>
                                )}
                            </div>
                            <ul
                                className={`space-y-3 mb-8 text-sm ${
                                    featured ? 'text-stone-300' : ''
                                }`}
                            >
                                {card.features.map((f) => (
                                    <li key={f} className="flex gap-2">
                                        <Check className="w-5 h-5 shrink-0 text-[var(--theme-accent)]" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            {buttonFor(card)}
                        </div>
                    );
                })}
            </div>
            <div className="text-center text-sm text-stone-400 flex items-center justify-center gap-2">
                <Shield className="w-4 h-4" />
                Secure payment by Stripe. Cancel any time from billing.
            </div>
        </div>
    );
}
