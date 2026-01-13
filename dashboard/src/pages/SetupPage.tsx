import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WebhookConfigModal } from '../components/WebhookConfigModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface User {
  id: number;
  email: string;
  createdAt: string;
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

interface WebhookConfig {
  url: string;
  secret?: string;
  headers?: Record<string, string>;
}

interface ChannelInfo {
  id?: number;
  type: 'slack' | 'email' | 'sms' | 'webhook';
  enabled: boolean;
  verified: boolean;
  configured: boolean;
  config?: WebhookConfig | Record<string, unknown>;
}

// Channel metadata for display
const CHANNEL_META: Record<
  string,
  { name: string; description: string; icon: React.ReactNode }
> = {
  slack: {
    name: 'Slack',
    description: 'Get feedback notifications in your Slack workspace',
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
      </svg>
    ),
  },
  email: {
    name: 'Email',
    description: 'Receive feedback notifications via email',
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  sms: {
    name: 'SMS',
    description: 'Get text message alerts for new feedback',
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  webhook: {
    name: 'Webhook',
    description: 'Send feedback to your own HTTP endpoint',
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
        />
      </svg>
    ),
  },
};

export function SetupPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiKeyInfo, setApiKeyInfo] = useState<ApiKeyInfo | null>(null);
  const [generatedKey, setGeneratedKey] = useState<GeneratedKey | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [togglingChannel, setTogglingChannel] = useState<string | null>(null);
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig | undefined>(undefined);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          credentials: 'include',
        });

        if (!response.ok) {
          navigate('/login');
          return;
        }

        const userData = await response.json();
        setUser(userData);

        // Fetch API key info
        const keyResponse = await fetch(`${API_URL}/api/keys`, {
          credentials: 'include',
        });

        if (keyResponse.ok) {
          const keyData = await keyResponse.json();
          setApiKeyInfo(keyData);
        }

        // Fetch channels info
        const channelsResponse = await fetch(`${API_URL}/api/channels`, {
          credentials: 'include',
        });

        if (channelsResponse.ok) {
          const channelsData = await channelsResponse.json();
          setChannels(channelsData.channels);
        }
      } catch {
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore errors
    }
    navigate('/login');
  };

  const handleGenerateKey = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/keys`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to generate API key');
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
      setError('Failed to generate API key');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyKey = async () => {
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
  };

  const handleCopySnippet = async () => {
    if (!generatedKey) return;

    const snippet = `<script src="https://cdn.heydev.io/widget.js" data-api-key="${generatedKey.key}"></script>`;

    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = snippet;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggleChannel = async (channelType: string, enabled: boolean) => {
    if (!apiKeyInfo?.hasKey) {
      setError('Generate an API key first to configure channels');
      return;
    }

    setTogglingChannel(channelType);

    try {
      const response = await fetch(`${API_URL}/api/channels/${channelType}/toggle`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to update channel');
        return;
      }

      // Update local state
      setChannels((prev) =>
        prev.map((ch) =>
          ch.type === channelType ? { ...ch, enabled } : ch
        )
      );
    } catch {
      setError('Failed to update channel');
    } finally {
      setTogglingChannel(null);
    }
  };

  const handleConfigureChannel = (channelType: string) => {
    if (channelType === 'webhook') {
      // Find the webhook channel to get its current config
      const webhookChannel = channels.find((ch) => ch.type === 'webhook');
      setWebhookConfig(webhookChannel?.config as WebhookConfig | undefined);
      setWebhookModalOpen(true);
    } else {
      // Other channels will be implemented in future stories
      alert(`Configure ${CHANNEL_META[channelType]?.name || channelType} - Coming soon!`);
    }
  };

  const handleSaveWebhookConfig = async (config: WebhookConfig) => {
    const response = await fetch(`${API_URL}/api/channels`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'webhook',
        config,
        enabled: true,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to save configuration');
    }

    const data = await response.json();

    // Update local state
    setChannels((prev) =>
      prev.map((ch) =>
        ch.type === 'webhook'
          ? {
              ...ch,
              enabled: true,
              configured: true,
              verified: true, // Webhook is verified on successful config save
              config,
            }
          : ch
      )
    );

    return data;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <svg
          className="animate-spin h-8 w-8 text-indigo-600"
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
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold text-gray-900">Setup</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Sign out
          </button>
        </div>
      </div>
      <p className="text-gray-600 mb-8">
        Configure your HeyDev widget and notification channels.
      </p>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            API Key
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            Your API key is used to authenticate the widget on your website.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Show generated key (only on first generation) */}
          {generatedKey && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="h-5 w-5 text-amber-500 mt-0.5"
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
                  <div>
                    <p className="font-medium text-amber-800">
                      Save your API key now!
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      This key will only be shown once. Copy it and store it securely.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your API Key
                </label>
                <div className="flex gap-2">
                  <code className="flex-1 bg-gray-100 px-4 py-3 rounded-lg font-mono text-sm text-gray-800 break-all">
                    {generatedKey.key}
                  </code>
                  <button
                    onClick={handleCopyKey}
                    className="shrink-0 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add to your website
                </label>
                <p className="text-gray-600 text-sm mb-2">
                  Paste this snippet before the closing <code className="bg-gray-100 px-1 rounded">&lt;/body&gt;</code> tag:
                </p>
                <div className="relative">
                  <pre className="bg-gray-900 text-gray-100 px-4 py-3 rounded-lg font-mono text-sm overflow-x-auto">
{`<script
  src="https://cdn.heydev.io/widget.js"
  data-api-key="${generatedKey.key}"
></script>`}
                  </pre>
                  <button
                    onClick={handleCopySnippet}
                    className="absolute top-2 right-2 bg-gray-700 text-gray-200 px-3 py-1 rounded text-xs font-medium hover:bg-gray-600 transition-colors"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Show existing key info (prefix only) */}
          {apiKeyInfo?.hasKey && !generatedKey && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                    <code className="bg-gray-100 px-3 py-1 rounded font-mono text-sm text-gray-600">
                      {apiKeyInfo.keyPrefix}
                    </code>
                  </div>
                  {apiKeyInfo.createdAt && (
                    <p className="text-gray-500 text-xs mt-1">
                      Created {new Date(apiKeyInfo.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Widget snippet
                </label>
                <p className="text-gray-600 text-sm mb-2">
                  Add this to your website (use your saved API key):
                </p>
                <pre className="bg-gray-900 text-gray-100 px-4 py-3 rounded-lg font-mono text-sm overflow-x-auto">
{`<script
  src="https://cdn.heydev.io/widget.js"
  data-api-key="YOUR_API_KEY"
></script>`}
                </pre>
              </div>
            </div>
          )}

          {/* Show generate button if no key exists */}
          {apiKeyInfo && !apiKeyInfo.hasKey && !generatedKey && (
            <button
              type="button"
              onClick={handleGenerateKey}
              disabled={isGenerating}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGenerating ? (
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
                  Generating...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Generate API Key
                </>
              )}
            </button>
          )}
        </div>

        {/* Notification Channels Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Notification Channels
          </h2>
          <p className="text-gray-600 text-sm mb-6">
            Configure where you want to receive feedback notifications.
          </p>

          <div className="space-y-4">
            {channels.map((channel) => {
              const meta = CHANNEL_META[channel.type];
              if (!meta) return null;

              return (
                <div
                  key={channel.type}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div
                      className={`p-2 rounded-lg ${
                        channel.enabled
                          ? 'bg-indigo-100 text-indigo-600'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {meta.icon}
                    </div>

                    {/* Name and description */}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{meta.name}</h3>
                        {/* Status badge */}
                        {channel.configured && channel.verified && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Connected
                          </span>
                        )}
                        {channel.configured && !channel.verified && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Pending
                          </span>
                        )}
                        {!channel.configured && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            Not configured
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{meta.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Configure button */}
                    <button
                      onClick={() => handleConfigureChannel(channel.type)}
                      className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Configure
                    </button>

                    {/* Toggle switch */}
                    <button
                      onClick={() => handleToggleChannel(channel.type, !channel.enabled)}
                      disabled={togglingChannel === channel.type || !apiKeyInfo?.hasKey}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                        channel.enabled ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                      role="switch"
                      aria-checked={channel.enabled}
                      aria-label={`Toggle ${meta.name}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          channel.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {!apiKeyInfo?.hasKey && (
            <p className="text-gray-500 text-sm mt-4 italic">
              Generate an API key above to configure notification channels.
            </p>
          )}
        </div>
      </div>

      {/* Webhook Configuration Modal */}
      <WebhookConfigModal
        isOpen={webhookModalOpen}
        onClose={() => setWebhookModalOpen(false)}
        onSave={handleSaveWebhookConfig}
        initialConfig={webhookConfig}
      />
    </div>
  );
}
