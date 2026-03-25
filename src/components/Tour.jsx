import React from 'react';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';
import { useOnboarding } from '../contexts/OnboardingContext.jsx';

/**
 * Tour steps configuration
 */
const TOUR_STEPS = [
  {
    id: 'intro',
    title: 'Welcome to Lekalu! 👋',
    description: 'Let\'s take a quick tour to help you get started with expense tracking.',
    highlightElement: null,
    position: 'center',
  },
  {
    id: 'sidebar',
    title: 'Navigation Menu',
    description: 'This is your main navigation. You can switch between Activity, Trackables, Tracker, and Analytics sections from here.',
    highlightElement: 'tour-sidebar',
    position: 'right',
  },
  {
    id: 'activity',
    title: 'Activity Dashboard',
    description: 'Track your daily income and expenses. You\'ll see today\'s total income, expenses, and net flow at a glance.',
    highlightElement: null,
    position: 'center',
  },
  {
    id: 'add-activity',
    title: 'Add Transaction',
    description: 'Use this button to record new transactions. You can categorize them as income, expense, or transfer.',
    highlightElement: 'tour-add-activity',
    position: 'top',
  },
  {
    id: 'trackables',
    title: 'Trackables & Accounts',
    description: 'Manage recurring expenses and bank accounts. Set up monthly bills and card payments for easy tracking.',
    highlightElement: null,
    position: 'center',
  },
  {
    id: 'tracker',
    title: 'Monthly Tracker',
    description: 'Monitor your recurring expenses throughout the month. Check them off as you pay them and see your monthly progress.',
    highlightElement: null,
    position: 'center',
  },
  {
    id: 'analytics',
    title: 'Analytics Dashboard',
    description: 'Analyze your spending patterns with charts and reports. Filter by date, account, or category to gain insights.',
    highlightElement: null,
    position: 'center',
  },
  {
    id: 'encryption',
    title: '🔒 Your Data is Secure',
    description: 'All your data is encrypted end-to-end. Even our servers cannot access your financial information.',
    highlightElement: null,
    position: 'center',
  },
  {
    id: 'done',
    title: 'Ready to Go! 🚀',
    description: 'You\'re all set! Start by adding a bank account, then create your first transaction. Happy tracking!',
    highlightElement: null,
    position: 'center',
  },
];

export const Tour = () => {
  const { showTour, currentStep, nextStep, prevStep, endTour, skipTour } = useOnboarding();

  if (!showTour) return null;

  const step = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 z-40 pointer-events-none" />

      {/* Highlight Box */}
      {step.highlightElement && (
        <HighlightElement elementId={step.highlightElement} />
      )}

      {/* Tour Tooltip */}
      <div
        className={`fixed z-50 bg-secondary border border-accent rounded-lg shadow-2xl max-w-sm p-6 ${getTooltipPosition(
          step.position
        )}`}
      >
        {/* Close Button */}
        <button
          onClick={skipTour}
          className="absolute top-3 right-3 p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
          title="Skip tour"
        >
          <X size={18} />
        </button>

        {/* Step Counter */}
        <div className="text-xs text-accent font-semibold mb-2">
          STEP {currentStep + 1} OF {TOUR_STEPS.length}
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold text-white mb-3">{step.title}</h2>

        {/* Description */}
        <p className="text-sm text-gray-300 mb-6 leading-relaxed">
          {step.description}
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-gray-700 rounded-full h-1 mb-6 overflow-hidden">
          <div
            className="bg-accent h-full transition-all duration-300"
            style={{
              width: `${((currentStep + 1) / TOUR_STEPS.length) * 100}%`,
            }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={skipTour}
            className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                onClick={prevStep}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm transition-colors"
              >
                <ChevronLeft size={16} />
                Back
              </button>
            )}

            {isLastStep ? (
              <button
                onClick={endTour}
                className="flex items-center gap-1 px-4 py-2 rounded-lg bg-accent hover:bg-blue-600 text-white font-semibold text-sm transition-colors"
              >
                Finish
              </button>
            ) : (
              <button
                onClick={nextStep}
                className="flex items-center gap-1 px-4 py-2 rounded-lg bg-accent hover:bg-blue-600 text-white font-semibold text-sm transition-colors"
              >
                Next
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

/**
 * Highlight a specific element on the page
 */
const HighlightElement = ({ elementId }) => {
  const [position, setPosition] = React.useState(null);

  React.useEffect(() => {
    const element = document.getElementById(elementId);
    if (element) {
      const rect = element.getBoundingClientRect();
      setPosition({
        top: rect.top - 8,
        left: rect.left - 8,
        width: rect.width + 16,
        height: rect.height + 16,
      });
    }
  }, [elementId]);

  if (!position) return null;

  return (
    <div
      className="fixed border-2 border-accent rounded-lg pointer-events-none z-40 shadow-lg animate-pulse"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
        height: `${position.height}px`,
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
      }}
    />
  );
};

/**
 * Get tooltip position classes based on position prop
 */
function getTooltipPosition(position) {
  const baseClasses = 'pointer-events-auto';

  switch (position) {
    case 'center':
      return `${baseClasses} top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`;
    case 'top':
      return `${baseClasses} top-20 left-1/2 transform -translate-x-1/2`;
    case 'right':
      return `${baseClasses} top-1/3 right-8`;
    case 'left':
      return `${baseClasses} top-1/3 left-8`;
    default:
      return baseClasses;
  }
}
