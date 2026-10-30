'use client';
import React, { useState } from 'react';
import {
    ArrowRight,
    BarChart3,
    Check,
    ClipboardCheck,
    Layers,
    Library,
    Sparkles,
    Sprout,
    BrainCircuit,
    Globe,
    HeartHandshake,
    Swords,
    Trophy,
    Users,
    Wand2,
    X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const HIGHLIGHTS = [
    {
        icon: Library,
        title: 'Decks & shelves',
        text: 'Organise subjects into shelves, then review, learn or match the same cards in the mode that suits the moment.',
    },
    {
        icon: ClipboardCheck,
        title: 'Test suites',
        text: 'Build practice tests and bulk-add questions from a CSV, Excel file or pasted text instead of typing them one by one.',
    },
    {
        icon: Swords,
        title: 'Live quizzes',
        text: 'Host a room, share the code and quiz friends or a class in real time.',
    },
    {
        icon: Users,
        title: 'Communities',
        text: 'Discover decks other learners have shared, or build a community around your own.',
    },
    {
        icon: Trophy,
        title: 'Streaks & leagues',
        text: 'Daily streaks, XP and a leaderboard give you a reason to come back tomorrow.',
    },
    {
        icon: BarChart3,
        title: 'Progress stats',
        text: 'See retention, reviews and cards studied so you know what is actually sticking.',
    },
];

const WHY = [
    {
        title: 'Reviews scheduled by memory, not by habit',
        text: 'FSRS predicts when each card is about to fade, so you spend time on the cards that need it.',
    },
    {
        title: 'Studying that feels good',
        text: 'The garden turns finished sessions into something you can see grow, without turning study into a slot machine.',
    },
    {
        title: 'Alone or together',
        text: 'Solo reviews, shared decks, live quiz rooms and leaderboards in one place.',
    },
    {
        title: 'Bring your material with you',
        text: 'Import questions in bulk and keep studying offline; everything syncs when you reconnect.',
    },
];

const COMPARISON = [
    ['Modern spaced repetition (FSRS)', true, false],
    ['Gamified garden & streaks', true, false],
    ['Live quiz rooms', true, false],
    ['Bulk import from CSV / Excel', true, false],
    ['Works offline', true, true],
];

const STEPS = [
    {
        title: 'Create or discover a deck',
        text: 'Add your own cards, import them in bulk, or pick a deck from the community.',
    },
    {
        title: 'Review what is due',
        text: 'Each day Oopsly shows only the cards you are about to forget.',
    },
    {
        title: 'Watch it grow',
        text: 'Earn XP, keep your streak and grow your garden as the knowledge sticks.',
    },
];

// Keep in step with app/(user)/subscribe/page.tsx.
const PLANS = [
    {
        id: 'basic',
        name: 'Basic',
        tagline: 'Start learning.',
        monthly: '0',
        yearly: '0',
        features: ['Up to 3 decks', 'FSRS scheduling', 'Basic stats'],
        cta: 'Start free',
    },
    {
        id: 'pro',
        name: 'Pro',
        tagline: 'For serious learners.',
        monthly: '9.99',
        yearly: '7.99',
        features: ['Unlimited decks', 'AI generation', 'Advanced analytics'],
        cta: 'Choose Pro',
        popular: true,
    },
    {
        id: 'lifetime',
        name: 'Lifetime',
        tagline: 'Pay once, learn forever.',
        once: '199',
        features: ['Everything in Pro', 'All future updates'],
        cta: 'Choose Lifetime',
    },
] as const;

const FAQ = [
    [
        'Is Oopsly free?',
        'Yes. The Basic plan is free and includes up to 3 decks with FSRS scheduling and basic stats. Upgrade whenever you need more.',
    ],
    [
        'What is spaced repetition?',
        'A study method that shows you each card just before you would forget it. FSRS is a modern scheduler that models your memory per card, so you review less and remember more.',
    ],
    [
        'Can I bring my existing questions?',
        'Yes. Test suites accept bulk imports from CSV, Excel or pasted text, with a preview before anything is added.',
    ],
    [
        'Does it work offline?',
        'Yes. Keep studying without a connection and your progress syncs when you are back online.',
    ],
    [
        'Can I switch or cancel my plan?',
        'You can change plans from the subscription page at any time.',
    ],
];

const LandingPage = () => {
    const router = useRouter();
    const [yearly, setYearly] = useState(true);

    const onLoginClick = () => {
        // Handle login click
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-[#FDFBF7] font-sans selection:bg-[color-mix(in_srgb,var(--theme-accent)_20%,transparent)] selection:text-[var(--theme-secondary)] flex flex-col">
            {/* Header */}
            <header className="px-6 py-4 flex items-center justify-between border-b border-stone-200/50 bg-white/50 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[var(--theme-accent)] text-white flex items-center justify-center shadow-sm">
                        <Layers className="w-4 h-4" />
                    </div>
                    <span
                        className="font-black text-stone-900 tracking-tight text-xl"
                        data-testid="brand-logo"
                    >
                        Oopsly
                    </span>
                </div>
                <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-stone-600">
                    <a href="#features" className="hover:text-stone-900">
                        Features
                    </a>
                    <a href="#why" className="hover:text-stone-900">
                        Why Oopsly
                    </a>
                    <a href="#pricing" className="hover:text-stone-900">
                        Pricing
                    </a>
                    <a href="#faq" className="hover:text-stone-900">
                        FAQ
                    </a>
                </nav>
                <div className="flex items-center gap-4">
                    <button
                        onClick={onLoginClick}
                        className="hidden sm:flex items-center gap-2 px-5 py-2 rounded-xl bg-[var(--theme-accent)] hover:bg-[var(--theme-secondary)] text-white text-sm font-bold shadow-md shadow-stone-500/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
                        data-testid="get-started-button"
                    >
                        Get Started
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* Hero Section */}
            <main className="flex-1">
                <section className="relative px-6 py-24 sm:py-32 overflow-hidden flex flex-col items-center text-center">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[color-mix(in_srgb,var(--theme-accent)_10%,transparent)] rounded-full blur-3xl -z-10" />

                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-100 border border-stone-200 text-stone-600 text-xs font-bold uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Learn Faster, Remember Longer
                    </div>

                    <h1 className="text-5xl sm:text-7xl font-black text-stone-900 tracking-tight max-w-4xl leading-[1.1] mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                        Master any subject with{' '}
                        <br className="hidden sm:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--theme-accent)] to-[var(--theme-secondary)]">
                            spaced repetition.
                        </span>
                    </h1>

                    <p className="text-lg sm:text-xl text-stone-600 max-w-2xl leading-relaxed mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                        Oopsly combines the scientifically-proven FSRS algorithm
                        with a beautiful, relaxing gamified sanctuary to make
                        studying your favorite part of the day.
                    </p>

                    <button
                        onClick={onLoginClick}
                        data-testid="start-learning-button"
                        className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white text-lg font-bold shadow-xl shadow-stone-900/20 transition-all cursor-pointer hover:-translate-y-1 active:translate-y-0 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300"
                    >
                        Start Learning for Free
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </section>

                {/* Feature Grid */}
                <section
                    id="features"
                    className="py-24 bg-white px-6 scroll-mt-16"
                >
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl sm:text-4xl font-black text-stone-900">
                                Why choose Oopsly?
                            </h2>
                            <p className="text-stone-500 mt-4 text-lg">
                                Designed for focus. Built on cognitive science.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="p-8 rounded-3xl bg-stone-50 border border-stone-100 flex flex-col items-start hover:shadow-lg transition-shadow">
                                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-6">
                                    <BrainCircuit className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-stone-900 mb-3">
                                    FSRS Algorithm
                                </h3>
                                <p className="text-stone-600 leading-relaxed">
                                    Powered by the Free Spaced Repetition
                                    Scheduler, optimizing your reviews so you
                                    only study what you&apos;re about to forget.
                                </p>
                            </div>

                            <div className="p-8 rounded-3xl bg-stone-50 border border-stone-100 flex flex-col items-start hover:shadow-lg transition-shadow">
                                <div className="w-12 h-12 rounded-xl bg-[color-mix(in_srgb,var(--theme-accent)_20%,transparent)] text-[var(--theme-secondary)] flex items-center justify-center mb-6">
                                    <Sprout className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-stone-900 mb-3">
                                    Gamified Garden
                                </h3>
                                <p className="text-stone-600 leading-relaxed">
                                    Earn drops and plant seeds in your personal
                                    Ghibli-inspired forest sanctuary as you
                                    complete focus sessions and review cards.
                                </p>
                            </div>

                            <div className="p-8 rounded-3xl bg-stone-50 border border-stone-100 flex flex-col items-start hover:shadow-lg transition-shadow">
                                <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center mb-6">
                                    <Globe className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-stone-900 mb-3">
                                    Learn Anywhere
                                </h3>
                                <p className="text-stone-600 leading-relaxed">
                                    Fully functional offline support. Syncs
                                    automatically when you&apos;re back online.
                                    Take your study decks wherever you go.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How it works */}
                <section className="py-20 px-6">
                    <div className="max-w-5xl mx-auto">
                        <h2 className="text-3xl sm:text-4xl font-black text-stone-900 text-center mb-12">
                            How it works
                        </h2>
                        <ol className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {STEPS.map((step, i) => (
                                <li key={step.title} className="flex gap-4">
                                    <span className="w-9 h-9 shrink-0 rounded-full bg-stone-900 text-white font-black flex items-center justify-center">
                                        {i + 1}
                                    </span>
                                    <div>
                                        <h3 className="font-bold text-stone-900 mb-1">
                                            {step.title}
                                        </h3>
                                        <p className="text-stone-600 leading-relaxed">
                                            {step.text}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                {/* Highlights */}
                <section className="py-20 bg-white px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-14">
                            <h2 className="text-3xl sm:text-4xl font-black text-stone-900">
                                Everything you need to study
                            </h2>
                            <p className="text-stone-500 mt-4 text-lg">
                                From your first card to your hundredth quiz.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
                                <div
                                    key={title}
                                    className="p-6 rounded-2xl border border-stone-100 bg-stone-50"
                                >
                                    <Icon className="w-5 h-5 text-[var(--theme-secondary)] mb-3" />
                                    <h3 className="font-bold text-stone-900 mb-1">
                                        {title}
                                    </h3>
                                    <p className="text-sm text-stone-600 leading-relaxed">
                                        {text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Why Oopsly */}
                <section id="why" className="py-24 px-6 scroll-mt-16">
                    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">
                        <div>
                            <h2 className="text-3xl sm:text-4xl font-black text-stone-900 mb-8">
                                Why learners pick Oopsly
                            </h2>
                            <ul className="space-y-6">
                                {WHY.map((item) => (
                                    <li key={item.title} className="flex gap-3">
                                        <Check className="w-5 h-5 mt-0.5 shrink-0 text-[var(--theme-accent)]" />
                                        <div>
                                            <h3 className="font-bold text-stone-900">
                                                {item.title}
                                            </h3>
                                            <p className="text-stone-600 leading-relaxed">
                                                {item.text}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="rounded-3xl bg-white border border-stone-200 shadow-sm overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-stone-50 text-left">
                                        <th className="p-4 font-bold text-stone-500">
                                            Feature
                                        </th>
                                        <th className="p-4 font-black text-stone-900 text-center">
                                            Oopsly
                                        </th>
                                        <th className="p-4 font-bold text-stone-500 text-center">
                                            Typical flashcard app
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {COMPARISON.map(([label, us, them]) => (
                                        <tr
                                            key={String(label)}
                                            className="border-t border-stone-100"
                                        >
                                            <td className="p-4 text-stone-700">
                                                {label}
                                            </td>
                                            {[us, them].map((on, i) => (
                                                <td
                                                    key={i}
                                                    className="p-4 text-center"
                                                >
                                                    {on ? (
                                                        <Check
                                                            aria-label="Included"
                                                            className="w-5 h-5 mx-auto text-emerald-600"
                                                        />
                                                    ) : (
                                                        <X
                                                            aria-label="Not included"
                                                            className="w-5 h-5 mx-auto text-stone-300"
                                                        />
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* Pricing */}
                <section
                    id="pricing"
                    className="py-24 bg-white px-6 scroll-mt-16"
                >
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-10">
                            <h2 className="text-3xl sm:text-4xl font-black text-stone-900">
                                Plans &amp; pricing
                            </h2>
                            <p className="text-stone-500 mt-4 text-lg">
                                Start free. Upgrade when you are ready.
                            </p>
                        </div>
                        <div className="flex justify-center mb-12">
                            <div className="inline-flex p-1 rounded-2xl bg-stone-100">
                                {[
                                    ['Monthly', false],
                                    ['Yearly', true],
                                ].map(([label, value]) => (
                                    <button
                                        key={String(label)}
                                        type="button"
                                        aria-pressed={yearly === value}
                                        data-testid={`landing-billing-${String(label).toLowerCase()}`}
                                        onClick={() =>
                                            setYearly(Boolean(value))
                                        }
                                        className={`px-6 py-2.5 rounded-xl text-sm font-bold cursor-pointer ${
                                            yearly === value
                                                ? 'bg-white shadow-sm'
                                                : 'text-stone-500'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                            {PLANS.map((plan) => {
                                const dark = 'popular' in plan;
                                const price =
                                    'once' in plan
                                        ? plan.once
                                        : yearly
                                          ? plan.yearly
                                          : plan.monthly;
                                const unit =
                                    'once' in plan
                                        ? 'one-time'
                                        : plan.monthly === '0'
                                          ? 'forever'
                                          : '/ month';
                                return (
                                    <div
                                        key={plan.id}
                                        data-testid={`landing-plan-${plan.id}`}
                                        className={`relative rounded-3xl p-8 flex flex-col ${
                                            dark
                                                ? 'bg-stone-900 text-white'
                                                : 'bg-white border border-stone-200'
                                        }`}
                                    >
                                        {dark && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 text-xs font-black px-4 py-1 rounded-full">
                                                Most Popular
                                            </div>
                                        )}
                                        <h3 className="text-xl font-bold">
                                            {plan.name}
                                        </h3>
                                        <p
                                            className={`text-sm mt-1 ${dark ? 'text-stone-400' : 'text-stone-500'}`}
                                        >
                                            {plan.tagline}
                                        </p>
                                        <div className="my-6">
                                            <span className="text-4xl font-black">
                                                ${price}
                                            </span>{' '}
                                            <span
                                                className={`text-sm ${dark ? 'text-stone-400' : 'text-stone-500'}`}
                                            >
                                                {unit}
                                            </span>
                                            {plan.id === 'pro' && yearly && (
                                                <p className="text-xs text-amber-300 mt-1">
                                                    Billed yearly, save 20%
                                                </p>
                                            )}
                                        </div>
                                        <ul
                                            className={`space-y-3 mb-8 text-sm flex-1 ${dark ? 'text-stone-300' : ''}`}
                                        >
                                            {plan.features.map((f) => (
                                                <li
                                                    key={f}
                                                    className="flex gap-2"
                                                >
                                                    <Check className="w-5 h-5 shrink-0 text-[var(--theme-accent)]" />
                                                    {f}
                                                </li>
                                            ))}
                                        </ul>
                                        <button
                                            type="button"
                                            onClick={onLoginClick}
                                            data-testid={`landing-plan-cta-${plan.id}`}
                                            className={`w-full py-3.5 rounded-xl font-bold text-sm cursor-pointer ${
                                                dark
                                                    ? 'bg-[var(--theme-accent)] text-white'
                                                    : 'bg-stone-900 text-white'
                                            }`}
                                        >
                                            {plan.cta}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* FAQ */}
                <section id="faq" className="py-24 px-6 scroll-mt-16">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-3xl sm:text-4xl font-black text-stone-900 text-center mb-10">
                            Frequently asked questions
                        </h2>
                        <div className="space-y-3">
                            {FAQ.map(([q, a]) => (
                                <details
                                    key={q}
                                    className="group rounded-2xl bg-white border border-stone-200 p-5"
                                >
                                    <summary className="font-bold text-stone-900 cursor-pointer list-none flex justify-between items-center">
                                        {q}
                                        <span className="text-stone-400 group-open:rotate-45 transition-transform text-xl leading-none">
                                            +
                                        </span>
                                    </summary>
                                    <p className="mt-3 text-stone-600 leading-relaxed">
                                        {a}
                                    </p>
                                </details>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Final call to action */}
                <section className="px-6 pb-24">
                    <div className="max-w-4xl mx-auto rounded-3xl bg-stone-900 text-white text-center px-8 py-14">
                        <Wand2 className="w-6 h-6 mx-auto mb-4 text-amber-300" />
                        <h2 className="text-3xl sm:text-4xl font-black mb-4">
                            Ready to remember more?
                        </h2>
                        <p className="text-stone-300 mb-8">
                            Create your first deck in minutes. It is free.
                        </p>
                        <button
                            type="button"
                            onClick={onLoginClick}
                            data-testid="final-cta-button"
                            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-[var(--theme-accent)] text-white font-bold cursor-pointer hover:scale-105 transition-transform"
                        >
                            Create your free account
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-stone-50 py-12 px-6 border-t border-stone-200 text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <Layers className="w-6 h-6 text-[var(--theme-accent)]" />
                    <span className="font-black text-stone-900 text-lg">
                        Oopsly
                    </span>
                </div>
                <nav className="flex justify-center gap-6 text-sm text-stone-500 mb-4">
                    <a href="#features" className="hover:text-stone-900">
                        Features
                    </a>
                    <a href="#pricing" className="hover:text-stone-900">
                        Pricing
                    </a>
                    <a href="#faq" className="hover:text-stone-900">
                        FAQ
                    </a>
                </nav>
                <p className="text-stone-500 flex items-center justify-center gap-1">
                    Made with{' '}
                    <HeartHandshake className="w-4 h-4 text-rose-500" /> for
                    lifelong learners.
                </p>
            </footer>
        </div>
    );
};

export default LandingPage;
