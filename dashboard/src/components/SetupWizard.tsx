import { useState, useEffect } from 'react';

// In production, API is served from same origin (relative path). In dev, use VITE_API_URL or localhost.
const API_URL = import.meta.env.VITE_API_URL || '';

interface SetupWizardProps {
  currentStep: number;
  onStepChange?: (step: number) => void;
}

interface StepConfig {
  id: number;
  title: string;
  shortTitle: string;
}

const STEPS: StepConfig[] = [
  { id: 1, title: 'Generate API Key', shortTitle: 'API Key' },
  { id: 2, title: 'Install Widget', shortTitle: 'Install' },
  { id: 3, title: 'Configure Notifications', shortTitle: 'Notifications' },
  { id: 4, title: 'Test Integration', shortTitle: 'Test' },
];

// Checkmark icon for completed steps
function CheckIcon() {
  return (
    <svg
      className="h-5 w-5 text-white"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function SetupWizard({ currentStep, onStepChange }: SetupWizardProps) {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Mark previous steps as completed when currentStep changes
  useEffect(() => {
    const completed: number[] = [];
    for (let i = 1; i < currentStep; i++) {
      completed.push(i);
    }
    setCompletedSteps(completed);
  }, [currentStep]);

  const isStepCompleted = (stepId: number) => completedSteps.includes(stepId);
  const isStepCurrent = (stepId: number) => stepId === currentStep;

  const handleStepAdvance = async (nextStep: number) => {
    // Update setup step via API
    try {
      await fetch(`${API_URL}/api/auth/setup-step`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: nextStep }),
      });
      onStepChange?.(nextStep);
    } catch (error) {
      console.error('Failed to update setup step:', error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Step indicator */}
      <div className="mb-8">
        {/* Progress bar background */}
        <div className="relative">
          {/* Connecting line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200" aria-hidden="true">
            <div
              className="h-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
            />
          </div>

          {/* Step circles */}
          <nav aria-label="Progress" className="relative z-10">
            <ol className="flex justify-between">
              {STEPS.map((step) => {
                const completed = isStepCompleted(step.id);
                const current = isStepCurrent(step.id);

                return (
                  <li key={step.id} className="flex flex-col items-center">
                    {/* Circle */}
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors duration-200 ${
                        completed
                          ? 'bg-indigo-600 border-indigo-600'
                          : current
                            ? 'bg-white border-indigo-600'
                            : 'bg-white border-gray-300'
                      }`}
                    >
                      {completed ? (
                        <CheckIcon />
                      ) : (
                        <span
                          className={`text-sm font-semibold ${
                            current ? 'text-indigo-600' : 'text-gray-500'
                          }`}
                        >
                          {step.id}
                        </span>
                      )}
                    </div>

                    {/* Label */}
                    <span
                      className={`mt-2 text-xs font-medium text-center ${
                        completed || current ? 'text-indigo-600' : 'text-gray-500'
                      }`}
                    >
                      {step.shortTitle}
                    </span>
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

        {/* Current step title */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Step {currentStep} of {STEPS.length}
          </p>
          <h2 className="mt-1 text-2xl font-bold text-gray-900">
            {STEPS.find((s) => s.id === currentStep)?.title}
          </h2>
        </div>
      </div>

      {/* Step content container */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Step 1: API Key Generation - placeholder */}
        {currentStep === 1 && (
          <StepPlaceholder
            title="Generate Your API Key"
            description="Create an API key to authenticate the widget on your website."
            onContinue={() => handleStepAdvance(2)}
          />
        )}

        {/* Step 2: Widget Installation - placeholder */}
        {currentStep === 2 && (
          <StepPlaceholder
            title="Install the Widget"
            description="Add the widget script to your website."
            onBack={() => handleStepAdvance(1)}
            onContinue={() => handleStepAdvance(3)}
          />
        )}

        {/* Step 3: Notification Configuration - placeholder */}
        {currentStep === 3 && (
          <StepPlaceholder
            title="Get Notified"
            description="Configure how you receive feedback notifications."
            onBack={() => handleStepAdvance(2)}
            onContinue={() => handleStepAdvance(4)}
            skipLabel="Skip for now"
          />
        )}

        {/* Step 4: Test Integration - placeholder */}
        {currentStep === 4 && (
          <StepPlaceholder
            title="Test Your Integration"
            description="Verify that your widget is working correctly."
            onBack={() => handleStepAdvance(3)}
          />
        )}
      </div>
    </div>
  );
}

// Placeholder component for individual steps (will be replaced in future stories)
interface StepPlaceholderProps {
  title: string;
  description: string;
  onBack?: () => void;
  onContinue?: () => void;
  skipLabel?: string;
}

function StepPlaceholder({
  title,
  description,
  onBack,
  onContinue,
  skipLabel,
}: StepPlaceholderProps) {
  return (
    <div className="text-center py-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-8">{description}</p>

      <div className="flex items-center justify-center gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Back
          </button>
        )}

        {onContinue && (
          <button
            onClick={onContinue}
            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Continue
          </button>
        )}

        {skipLabel && onContinue && (
          <button
            onClick={onContinue}
            className="px-6 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            {skipLabel}
          </button>
        )}
      </div>
    </div>
  );
}
