import React, { useState } from 'react';
import {
    BookOpen,
    Sparkles,
    Sprout,
    Gamepad2,
    Globe,
    ChevronRight,
    ChevronLeft,
    X,
    Heart,
} from 'lucide-react';

interface WelcomeTourModalProps {
    onClose: () => void;
}

const TOUR_STEPS = [
    {
        id: 'welcome',
        title: 'Welcome to Oopsly!',
        description:
            "Your ultimate companion for spaced repetition learning. Let's take a quick tour of how to make the most out of your study sessions.",
        icon: <Heart className="w-10 h-10 text-rose-500" />,
        color: 'bg-rose-100 dark:bg-rose-950/50',
        borderColor: 'border-rose-200 dark:border-rose-900',
    },
    {
        id: 'library',
        title: 'Organize Your Knowledge',
        description:
            'The Library is your home base. Create Shelves for broad topics, and inside them, build Subject Decks to hold your flashcards.',
        icon: <BookOpen className="w-10 h-10 text-blue-500" />,
        color: 'bg-blue-100 dark:bg-blue-950/50',
        borderColor: 'border-blue-200 dark:border-blue-900',
    },
    {
        id: 'fsrs',
        title: 'Study Smarter, Not Harder',
        description:
            'Our Active Recall mode uses the advanced FSRS algorithm. It predicts exactly when you are about to forget a card, scheduling reviews at the perfect time for maximum memory retention.',
        icon: <Sparkles className="w-10 h-10 text-amber-500" />,
        color: 'bg-amber-100 dark:bg-amber-950/50',
        borderColor: 'border-amber-200 dark:border-amber-900',
    },
    {
        id: 'garden',
        title: 'Grow Your Sanctuary',
        description:
            'Stay focused using our built-in Pomodoro timer. Every minute you study earns you Dew Drops and Growth Points to cultivate a magical Ghibli-inspired forest.',
        icon: <Sprout className="w-10 h-10 text-emerald-500" />,
        color: 'bg-emerald-100 dark:bg-emerald-950/50',
        borderColor: 'border-emerald-200 dark:border-emerald-900',
    },
    {
        id: 'games',
        title: 'Mini-Games & Tests',
        description:
            'Need a break from standard reviews? Challenge yourself with the Speed Matching game or take a comprehensive Practice Test to validate your mastery.',
        icon: <Gamepad2 className="w-10 h-10 text-purple-500" />,
        color: 'bg-purple-100 dark:bg-purple-950/50',
        borderColor: 'border-purple-200 dark:border-purple-900',
    },
    {
        id: 'discover',
        title: 'Discover & Share',
        description:
            'Explore the Discover tab to find pre-made, high-quality decks shared by the community. Clone them directly to your library and start learning instantly!',
        icon: <Globe className="w-10 h-10 text-cyan-500" />,
        color: 'bg-cyan-100 dark:bg-cyan-950/50',
        borderColor: 'border-cyan-200 dark:border-cyan-900',
    },
];

const WelcomeTourModal: React.FC<WelcomeTourModalProps> = ({ onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);

    const stepData = TOUR_STEPS[currentStep];
    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === TOUR_STEPS.length - 1;

    const handleNext = () => {
        if (!isLastStep) {
            setCurrentStep((prev) => prev + 1);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (!isFirstStep) {
            setCurrentStep((prev) => prev - 1);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div
                className="w-full max-w-md bg-[var(--theme-card)] rounded-3xl shadow-2xl border border-[var(--theme-border)] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Top visual hero area */}
                <div
                    className={`relative h-40 w-full flex flex-col items-center justify-center transition-colors duration-500 ${stepData.color} border-b ${stepData.borderColor}`}
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-stone-600 dark:text-stone-300 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="animate-bounce-slow">{stepData.icon}</div>
                </div>

                {/* Content area */}
                <div className="p-6 sm:p-8 space-y-4 text-center">
                    <h2 className="text-xl sm:text-2xl font-black text-[var(--theme-text)]">
                        {stepData.title}
                    </h2>
                    <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed min-h-[80px]">
                        {stepData.description}
                    </p>
                </div>

                {/* Navigation & Progress */}
                <div className="px-6 sm:px-8 pb-8 flex flex-col gap-6">
                    {/* Progress Dots */}
                    <div className="flex items-center justify-center gap-2">
                        {TOUR_STEPS.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                    idx === currentStep
                                        ? 'w-6 bg-[var(--theme-accent)]'
                                        : 'w-1.5 bg-stone-200 dark:bg-stone-700'
                                }`}
                            />
                        ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={isFirstStep ? onClose : handlePrev}
                            className="flex-1 py-3 px-4 rounded-2xl font-bold text-sm text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 transition-all cursor-pointer flex justify-center items-center gap-1"
                        >
                            {isFirstStep ? (
                                <span>Skip Tour</span>
                            ) : (
                                <>
                                    <ChevronLeft className="w-4 h-4" />
                                    <span>Back</span>
                                </>
                            )}
                        </button>
                        <button
                            onClick={handleNext}
                            style={{ backgroundColor: 'var(--theme-accent)' }}
                            className="flex-[2] py-3 px-4 rounded-2xl font-bold text-sm text-white shadow-md hover:opacity-90 transition-all cursor-pointer flex justify-center items-center gap-1"
                        >
                            <span>{isLastStep ? 'Get Started' : 'Next'}</span>
                            {!isLastStep && (
                                <ChevronRight className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WelcomeTourModal;
