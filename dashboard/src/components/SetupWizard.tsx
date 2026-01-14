import { useState, useEffect, useCallback } from 'react';

// In production, API is served from same origin (relative path). In dev, use VITE_API_URL or localhost.
const API_URL = import.meta.env.VITE_API_URL || '';

interface SetupWizardProps {
  currentStep: number;
  onStepChange?: (step: number) => void;
}

interface ApiKeyInfo {
  hasKey: boolean;
  keyPrefix?: string;
  createdAt?: string;
}

interface GeneratedKey {
  key: string;
  keyPrefix: string;
  createdAt: string;
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

  // API Key state for Step 1
  const [apiKeyInfo, setApiKeyInfo] = useState<ApiKeyInfo | null>(null);
  const [generatedKey, setGeneratedKey] = useState<GeneratedKey | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Mark previous steps as completed when currentStep changes
  useEffect(() => {
    const completed: number[] = [];
    for (let i = 1; i < currentStep; i++) {
      completed.push(i);
    }
    setCompletedSteps(completed);
  }, [currentStep]);

  // Fetch API key info on mount
  useEffect(() => {
    const fetchApiKeyInfo = async () => {
      try {
        const response = await fetch(`${API_URL}/api/keys`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setApiKeyInfo(data);
        }
      } catch (error) {
        console.error('Failed to fetch API key info:', error);
      }
    };
    fetchApiKeyInfo();
  }, []);

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

  // API Key generation handler
  const handleGenerateKey = useCallback(async () => {
    setIsGenerating(true);
    setApiKeyError(null);

    try {
      const response = await fetch(`${API_URL}/api/keys`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        setApiKeyError(data.error || 'Failed to generate API key');
        return;
      }

      setGeneratedKey({
        key: data.key,
        keyPrefix: data.keyPrefix,
        createdAt: data.createdAt,
      });
      setApiKeyInfo({
        hasKey: true,
        keyPrefix: data.keyPrefix,
        createdAt: data.createdAt,
      });
    } catch {
      setApiKeyError('Failed to generate API key');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Copy key to clipboard
  const handleCopyKey = useCallback(async () => {
    if (!generatedKey) return;

    try {
      await navigator.clipboard.writeText(generatedKey.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = generatedKey.key;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generatedKey]);

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
        {/* Step 1: API Key Generation */}
        {currentStep === 1 && (
          <Step1ApiKey
            apiKeyInfo={apiKeyInfo}
            generatedKey={generatedKey}
            isGenerating={isGenerating}
            error={apiKeyError}
            copied={copied}
            onGenerateKey={handleGenerateKey}
            onCopyKey={handleCopyKey}
            onContinue={() => handleStepAdvance(2)}
            onRegenerate={() => {
              // Placeholder for US-007: will trigger confirmation modal
              console.log('Regenerate key clicked - implement in US-007');
            }}
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

// Step 1: API Key Generation component
interface Step1ApiKeyProps {
  apiKeyInfo: ApiKeyInfo | null;
  generatedKey: GeneratedKey | null;
  isGenerating: boolean;
  error: string | null;
  copied: boolean;
  onGenerateKey: () => void;
  onCopyKey: () => void;
  onContinue: () => void;
  onRegenerate?: () => void;
}

function Step1ApiKey({
  apiKeyInfo,
  generatedKey,
  isGenerating,
  error,
  copied,
  onGenerateKey,
  onCopyKey,
  onContinue,
  onRegenerate,
}: Step1ApiKeyProps) {
  const hasKey = apiKeyInfo?.hasKey || generatedKey !== null;
  const canContinue = hasKey;

  return (
    <div className="py-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
        Generate Your API Key
      </h3>
      <p className="text-gray-600 mb-6 text-center">
        Create an API key to authenticate the widget on your website.
      </p>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Show generate button if no key exists */}
      {!hasKey && (
        <div className="text-center">
          <button
            type="button"
            onClick={onGenerateKey}
            disabled={isGenerating}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
          >
            {isGenerating ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
                Generate API Key
              </>
            )}
          </button>
        </div>
      )}

      {/* Show generated key with copy functionality */}
      {generatedKey && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your API Key
            </label>
            <div className="flex gap-2">
              <code className="flex-1 bg-gray-100 px-4 py-3 rounded-lg font-mono text-sm text-gray-800 break-all">
                {generatedKey.key}
              </code>
              <button
                onClick={onCopyKey}
                className="shrink-0 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Warning message */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="h-5 w-5 text-amber-500 mt-0.5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-sm text-amber-800">
                <span className="font-medium">Save this key securely.</span> You
                won't be able to view it again.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Show masked key if key already exists but not just generated */}
      {apiKeyInfo?.hasKey && !generatedKey && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your API Key
            </label>
            <div className="flex items-center gap-3">
              <code className="flex-1 bg-gray-100 px-4 py-3 rounded-lg font-mono text-sm text-gray-600">
                {apiKeyInfo.keyPrefix}
              </code>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            </div>
            {apiKeyInfo.createdAt && (
              <p className="text-gray-500 text-xs mt-2">
                Created {new Date(apiKeyInfo.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Regenerate option */}
          {onRegenerate && (
            <div className="text-center">
              <button
                onClick={onRegenerate}
                className="text-sm text-gray-600 hover:text-gray-900 underline transition-colors"
              >
                Regenerate Key
              </button>
            </div>
          )}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-center gap-4 mt-8">
        <button
          onClick={onContinue}
          disabled={!canContinue}
          className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
            canContinue
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
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
