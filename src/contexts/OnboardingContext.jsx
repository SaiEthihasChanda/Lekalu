import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * @typedef {Object} OnboardingContextType
 * @property {boolean} showTour - Whether tour is currently showing
 * @property {number} currentStep - Current tour step (0 = intro, 1+ = page-specific)
 * @property {Function} startTour - Start the tour
 * @property {Function} nextStep - Move to next step
 * @property {Function} prevStep - Move to previous step
 * @property {Function} endTour - End the tour and mark as completed
 * @property {boolean} tourCompleted - Whether user has completed tutorial
 */

const OnboardingContext = createContext();

export const OnboardingProvider = ({ children }) => {
  const [showTour, setShowTour] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tourCompleted, setTourCompleted] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    const completed = localStorage.getItem('lekalu_tour_completed') === 'true';
    setTourCompleted(completed);
  }, []);

  const startTour = () => {
    setShowTour(true);
    setCurrentStep(0);
  };

  const nextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const endTour = () => {
    setShowTour(false);
    setTourCompleted(true);
    localStorage.setItem('lekalu_tour_completed', 'true');
  };

  const skipTour = () => {
    setShowTour(false);
    setTourCompleted(true);
    localStorage.setItem('lekalu_tour_completed', 'true');
  };

  return (
    <OnboardingContext.Provider
      value={{
        showTour,
        setShowTour,
        currentStep,
        setCurrentStep,
        startTour,
        nextStep,
        prevStep,
        endTour,
        skipTour,
        tourCompleted,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

/**
 * Hook to use onboarding context
 * @returns {OnboardingContextType}
 */
export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
};
