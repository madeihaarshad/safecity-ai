import React, { useState, useEffect } from 'react';
import { ChevronRight, Shield, Activity, Bell } from 'lucide-react';

const WelcomeModal = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if user has been welcomed before
    const hasBeenWelcomed = localStorage.getItem('safecity-welcomed');
    if (!hasBeenWelcomed) {
      // Small delay for smooth appearance
      setTimeout(() => setIsVisible(true), 500);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('safecity-welcomed', '1');
    setIsVisible(false);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const steps = [
    {
      icon: Shield,
      title: 'Welcome to SafeCity AI',
      description: 'Real-time city safety monitoring at a glance. Track violations, disasters, and sensor data all in one unified platform.',
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      icon: Activity,
      title: 'Monitor Everything in One Place',
      description: 'Access comprehensive dashboards for violations, disaster events, driver profiles, and live sensor data. Navigate seamlessly between modules using the sidebar.',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: Bell,
      title: 'AI-Powered Risk Intelligence',
      description: 'The AI Risk Index updates every 30 seconds based on live sensor data, traffic patterns, and predictive models. Stay ahead of potential incidents with real-time alerts.',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
  ];

  if (!isVisible) return null;

  const currentStepData = steps[currentStep];
  const StepIcon = currentStepData.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 rounded-xl border border-slate-700 shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-slideUp">
        {/* Header with icon */}
        <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 p-8 text-center border-b border-slate-700">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${currentStepData.bgColor} ${currentStepData.color} mb-4`}>
            <StepIcon size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {currentStepData.title}
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            {currentStepData.description}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? 'w-8 bg-accent'
                    : index < currentStep
                    ? 'w-1.5 bg-accent/50'
                    : 'w-1.5 bg-slate-700'
                }`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 bg-accent hover:bg-accent/90 text-dark font-semibold rounded-lg transition-colors"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  Get Started
                  <ChevronRight size={18} />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </div>

          {/* Step counter */}
          <p className="text-center text-xs text-slate-500 mt-4">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
