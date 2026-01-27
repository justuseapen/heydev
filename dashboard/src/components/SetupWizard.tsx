import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

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
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Mark previous steps as completed when currentStep changes
  useEffect(() => {
    const completed: number[] = [];
    for (let i = 1; i < currentStep; i++) {
      completed.push(i);
    }
    setCompletedSteps(completed);
  }, [currentStep]);

  // Fetch API key info on mount - checks if user has any projects with API keys
  useEffect(() => {
    const fetchApiKeyInfo = async () => {
      try {
        const response = await fetch(`${API_URL}/api/projects`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          const projects = data.projects || [];

          // Check if any project has an API key
          const projectWithKey = projects.find((p: { hasApiKey: boolean }) => p.hasApiKey);

          if (projectWithKey) {
            setApiKeyInfo({
              hasKey: true,
              keyPrefix: projectWithKey.apiKeyPrefix,
              createdAt: projectWithKey.createdAt,
            });
          } else {
            setApiKeyInfo({ hasKey: false, keyPrefix: undefined, createdAt: undefined });
          }
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

  // API Key generation handler - creates a default project which includes an API key
  const handleGenerateKey = useCallback(async () => {
    setIsGenerating(true);
    setApiKeyError(null);

    try {
      // Create a default project (POST /api/projects creates both project + API key)
      const response = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'My First Project' }),
      });

      const data = await response.json();

      if (!response.ok) {
        setApiKeyError(data.error || 'Failed to generate API key');
        return;
      }

      // Project creation returns apiKey and apiKeyPrefix
      setGeneratedKey({
        key: data.apiKey,
        keyPrefix: data.apiKeyPrefix,
        createdAt: data.createdAt,
      });
      setApiKeyInfo({
        hasKey: true,
        keyPrefix: data.apiKeyPrefix,
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

  // Regenerate API key for the user's first project
  const handleRegenerateKey = useCallback(async () => {
    setIsRegenerating(true);
    setApiKeyError(null);

    try {
      // First, get the user's projects to find the project ID
      const projectsResponse = await fetch(`${API_URL}/api/projects`, {
        credentials: 'include',
      });

      if (!projectsResponse.ok) {
        setApiKeyError('Failed to fetch projects');
        setShowRegenerateModal(false);
        return;
      }

      const projectsData = await projectsResponse.json();
      const projects = projectsData.projects || [];

      if (projects.length === 0) {
        setApiKeyError('No project found. Please generate an API key first.');
        setShowRegenerateModal(false);
        return;
      }

      // Use the first project (default project created during onboarding)
      const projectId = projects[0].id;

      // Regenerate the API key for this project
      const regenerateResponse = await fetch(`${API_URL}/api/projects/${projectId}/regenerate-key`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await regenerateResponse.json();

      if (!regenerateResponse.ok) {
        setApiKeyError(data.error || 'Failed to regenerate API key');
        setShowRegenerateModal(false);
        return;
      }

      setGeneratedKey({
        key: data.apiKey,
        keyPrefix: data.apiKeyPrefix,
        createdAt: data.createdAt,
      });
      setApiKeyInfo({
        hasKey: true,
        keyPrefix: data.apiKeyPrefix,
        createdAt: data.createdAt,
      });
      setShowRegenerateModal(false);
    } catch {
      setApiKeyError('Failed to regenerate API key');
      setShowRegenerateModal(false);
    } finally {
      setIsRegenerating(false);
    }
  }, []);

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
            onRegenerate={() => setShowRegenerateModal(true)}
          />
        )}

        {/* Step 2: Widget Installation */}
        {currentStep === 2 && (
          <Step2WidgetInstall
            apiKey={generatedKey?.key || apiKeyInfo?.keyPrefix || 'YOUR_API_KEY'}
            onBack={() => handleStepAdvance(1)}
            onContinue={() => handleStepAdvance(3)}
          />
        )}

        {/* Step 3: Notification Configuration */}
        {currentStep === 3 && (
          <Step3Notifications
            onBack={() => handleStepAdvance(2)}
            onContinue={() => handleStepAdvance(4)}
            onSkip={() => handleStepAdvance(4)}
          />
        )}

        {/* Step 4: Test Integration */}
        {currentStep === 4 && (
          <Step4TestIntegration
            onBack={() => handleStepAdvance(3)}
            onComplete={() => handleStepAdvance(4)}
          />
        )}
      </div>

      {/* Regenerate API Key Confirmation Modal */}
      <RegenerateKeyModal
        isOpen={showRegenerateModal}
        isRegenerating={isRegenerating}
        onCancel={() => setShowRegenerateModal(false)}
        onConfirm={handleRegenerateKey}
      />
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

// Step 2: Widget Installation component
interface Step2WidgetInstallProps {
  apiKey: string;
  onBack: () => void;
  onContinue: () => void;
}

function Step2WidgetInstall({ apiKey, onBack, onContinue }: Step2WidgetInstallProps) {
  const [copied, setCopied] = useState(false);

  // Widget script snippet with user's API key
  const widgetSnippet = `<script src="https://heydev.io/widget.js" data-api-key="${apiKey}"></script>`;

  const handleCopySnippet = async () => {
    try {
      await navigator.clipboard.writeText(widgetSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = widgetSnippet;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="py-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
        Install the Widget
      </h3>
      <p className="text-gray-600 mb-6 text-center">
        Add this snippet to your website to start collecting feedback.
      </p>

      {/* Code snippet with dark background */}
      <div className="relative mb-4">
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm font-mono">
            <code className="text-gray-100">
              <span className="text-pink-400">&lt;script</span>
              <span className="text-gray-100"> </span>
              <span className="text-yellow-300">src</span>
              <span className="text-gray-100">=</span>
              <span className="text-green-400">"https://heydev.io/widget.js"</span>
              <span className="text-gray-100"> </span>
              <span className="text-yellow-300">data-api-key</span>
              <span className="text-gray-100">=</span>
              <span className="text-green-400">"{apiKey}"</span>
              <span className="text-pink-400">&gt;&lt;/script&gt;</span>
            </code>
          </pre>
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopySnippet}
          className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5"
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

      {/* Installation instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <svg
            className="h-5 w-5 text-blue-500 mt-0.5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm text-blue-800">
            Add this snippet before the closing{' '}
            <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono text-xs">
              &lt;/body&gt;
            </code>{' '}
            tag on your website.
          </p>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onBack}
          className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onContinue}
          className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// Step 3: Notification Configuration component
interface Step3NotificationsProps {
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
}

function Step3Notifications({ onBack, onContinue, onSkip }: Step3NotificationsProps) {
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');

  return (
    <div className="py-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
        Get Notified
      </h3>
      <p className="text-gray-500 mb-6 text-center text-sm">
        Optional - you can set this up later
      </p>

      {/* Notification channel cards */}
      <div className="space-y-4 mb-6">
        {/* Email notification card */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg
                  className="h-5 w-5 text-indigo-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Email</h4>
                <p className="text-xs text-gray-500">Get notified via email</p>
              </div>
            </div>
            {/* Toggle switch */}
            <button
              type="button"
              role="switch"
              aria-checked={emailEnabled}
              onClick={() => setEmailEnabled(!emailEnabled)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
                emailEnabled ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  emailEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          {/* Email input field */}
          {emailEnabled && (
            <div className="mt-3">
              <input
                type="email"
                placeholder="your@email.com"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Webhook notification card */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg
                  className="h-5 w-5 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Webhook</h4>
                <p className="text-xs text-gray-500">Send to a custom URL</p>
              </div>
            </div>
            {/* Toggle switch */}
            <button
              type="button"
              role="switch"
              aria-checked={webhookEnabled}
              onClick={() => setWebhookEnabled(!webhookEnabled)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
                webhookEnabled ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  webhookEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          {/* Webhook URL input field */}
          {webhookEnabled && (
            <div className="mt-3">
              <input
                type="url"
                placeholder="https://your-webhook.com/endpoint"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Slack notification card */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg
                  className="h-5 w-5 text-purple-600"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Slack</h4>
                <p className="text-xs text-gray-500">Get notified via Slack</p>
              </div>
            </div>
            {/* Toggle switch */}
            <button
              type="button"
              role="switch"
              aria-checked={slackEnabled}
              onClick={() => setSlackEnabled(!slackEnabled)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
                slackEnabled ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  slackEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          {/* Slack webhook URL input field */}
          {slackEnabled && (
            <div className="mt-3">
              <input
                type="url"
                placeholder="https://hooks.slack.com/services/..."
                value={slackWebhookUrl}
                onChange={(e) => setSlackWebhookUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                <a
                  href="https://api.slack.com/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-700"
                >
                  Create an Incoming Webhook
                </a>
                {' '}in Slack to get this URL
              </p>
            </div>
          )}
        </div>

        {/* SMS - Coming soon */}
        <div className="border border-gray-200 rounded-lg p-4 opacity-60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg
                  className="h-5 w-5 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">SMS</h4>
                <p className="text-xs text-gray-500">Text notifications</p>
              </div>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              Coming soon
            </span>
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onBack}
          className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onContinue}
          className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Continue
        </button>
      </div>

      {/* Skip link */}
      <div className="mt-4 text-center">
        <button
          onClick={onSkip}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

// Step 4: Test Integration component
interface Step4TestIntegrationProps {
  onBack: () => void;
  onComplete: () => void;
}

function Step4TestIntegration({ onBack, onComplete }: Step4TestIntegrationProps) {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isPolling, setIsPolling] = useState(false);
  const [feedbackReceived, setFeedbackReceived] = useState(false);
  const [initialFeedbackCount, setInitialFeedbackCount] = useState<number | null>(null);
  const navigate = useNavigate();

  // Start polling for feedback when component mounts or URL changes
  useEffect(() => {
    if (!isPolling) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/api/feedback`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          const currentCount = data.feedback?.length || 0;

          // If this is the first poll, set the initial count
          if (initialFeedbackCount === null) {
            setInitialFeedbackCount(currentCount);
          } else if (currentCount > initialFeedbackCount) {
            // Feedback count increased - success!
            setFeedbackReceived(true);
            setIsPolling(false);
          }
        }
      } catch (error) {
        console.error('Error polling for feedback:', error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [isPolling, initialFeedbackCount]);

  const handleOpenTestPage = () => {
    if (!websiteUrl) return;

    // Ensure URL has protocol
    let url = websiteUrl;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // Open in new tab
    window.open(url, '_blank');

    // Start polling for feedback
    setIsPolling(true);
  };

  const handleGoToInbox = async () => {
    await onComplete();
    navigate('/inbox');
  };

  const handleSkipTest = async () => {
    await onComplete();
    navigate('/inbox');
  };

  return (
    <div className="py-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
        Test Your Integration
      </h3>
      <p className="text-gray-600 mb-6 text-center">
        Verify that your widget is working correctly on your website.
      </p>

      {!feedbackReceived ? (
        <>
          {/* URL Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter your website URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://yoursite.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                onClick={handleOpenTestPage}
                disabled={!websiteUrl}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
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
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                Open Test Page
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">How to test:</h4>
            <ol className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-medium shrink-0">
                  1
                </span>
                Open your site
              </li>
              <li className="flex items-start gap-2">
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-medium shrink-0">
                  2
                </span>
                Look for the feedback button
              </li>
              <li className="flex items-start gap-2">
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-medium shrink-0">
                  3
                </span>
                Submit a test message
              </li>
            </ol>
          </div>

          {/* Polling status */}
          {isPolling && (
            <div className="flex items-center justify-center gap-3 py-4 mb-6 bg-blue-50 rounded-lg">
              <svg
                className="animate-spin h-5 w-5 text-blue-600"
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
              <span className="text-sm text-blue-700">
                Waiting for test feedback...
              </span>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={onBack}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Back
            </button>
          </div>

          {/* Skip link */}
          <div className="mt-4 text-center">
            <button
              onClick={handleSkipTest}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Skip test
            </button>
          </div>
        </>
      ) : (
        /* Success state */
        <div className="text-center py-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
            <svg
              className="h-8 w-8 text-green-600"
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
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">
            It works!
          </h4>
          <p className="text-gray-600 mb-6">
            Your first feedback arrived.
          </p>
          <button
            onClick={handleGoToInbox}
            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Go to Inbox
          </button>
        </div>
      )}
    </div>
  );
}

// Regenerate API Key Confirmation Modal
interface RegenerateKeyModalProps {
  isOpen: boolean;
  isRegenerating: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function RegenerateKeyModal({
  isOpen,
  isRegenerating,
  onCancel,
  onConfirm,
}: RegenerateKeyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Warning icon */}
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
            <svg
              className="h-6 w-6 text-red-600"
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
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
            Regenerate API Key?
          </h3>

          {/* Warning message */}
          <p className="text-sm text-gray-600 text-center mb-6">
            Your current key will stop working immediately. Update your widget
            before regenerating.
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isRegenerating}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isRegenerating}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isRegenerating ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
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
                  Regenerating...
                </>
              ) : (
                'Regenerate'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
