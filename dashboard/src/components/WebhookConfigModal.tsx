import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface WebhookConfig {
  url: string;
  secret?: string;
  headers?: Record<string, string>;
}

interface HeaderRow {
  key: string;
  value: string;
}

interface WebhookConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: WebhookConfig) => Promise<void>;
  initialConfig?: WebhookConfig;
}

export function WebhookConfigModal({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: WebhookConfigModalProps) {
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [headers, setHeaders] = useState<HeaderRow[]>([{ key: '', value: '' }]);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isGeneratingSecret, setIsGeneratingSecret] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens with initial config
  useEffect(() => {
    if (isOpen) {
      setUrl(initialConfig?.url || '');
      setSecret(initialConfig?.secret || '');

      // Convert headers object to array of rows
      if (initialConfig?.headers && Object.keys(initialConfig.headers).length > 0) {
        const headerRows = Object.entries(initialConfig.headers).map(([key, value]) => ({
          key,
          value,
        }));
        setHeaders([...headerRows, { key: '', value: '' }]);
      } else {
        setHeaders([{ key: '', value: '' }]);
      }

      setTestResult(null);
      setError(null);
    }
  }, [isOpen, initialConfig]);

  const handleGenerateSecret = async () => {
    setIsGeneratingSecret(true);
    try {
      const response = await fetch(`${API_URL}/api/channels/webhook/secret`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setSecret(data.secret);
      } else {
        setError('Failed to generate secret');
      }
    } catch {
      setError('Failed to generate secret');
    } finally {
      setIsGeneratingSecret(false);
    }
  };

  const handleAddHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  const handleRemoveHeader = (index: number) => {
    const newHeaders = headers.filter((_, i) => i !== index);
    if (newHeaders.length === 0) {
      setHeaders([{ key: '', value: '' }]);
    } else {
      setHeaders(newHeaders);
    }
  };

  const handleHeaderChange = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...headers];
    newHeaders[index][field] = value;
    setHeaders(newHeaders);
  };

  const buildHeadersObject = (): Record<string, string> => {
    const headersObj: Record<string, string> = {};
    for (const header of headers) {
      if (header.key.trim() && header.value.trim()) {
        headersObj[header.key.trim()] = header.value.trim();
      }
    }
    return headersObj;
  };

  const handleTest = async () => {
    if (!url.trim()) {
      setError('Please enter a webhook URL');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/channels/webhook/test`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          secret: secret.trim() || undefined,
          headers: buildHeadersObject(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTestResult({
          success: true,
          message: `Test successful! (HTTP ${data.statusCode})`,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Test failed',
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: 'Failed to send test request',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!url.trim()) {
      setError('Please enter a webhook URL');
      return;
    }

    // Validate URL format
    try {
      new URL(url.trim());
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave({
        url: url.trim(),
        secret: secret.trim() || undefined,
        headers: buildHeadersObject(),
      });
      onClose();
    } catch {
      setError('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Configure Webhook
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Form */}
          <div className="space-y-5">
            {/* URL Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Webhook URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-server.com/webhook"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                We'll send a POST request with feedback data to this URL
              </p>
            </div>

            {/* Secret Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Signing Secret
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="whsec_..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={handleGenerateSecret}
                  disabled={isGeneratingSecret}
                  className="shrink-0 px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isGeneratingSecret ? 'Generating...' : 'Generate'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Used to verify webhook authenticity via X-HeyDev-Signature header
              </p>
            </div>

            {/* Custom Headers */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Custom Headers
                </label>
                <button
                  type="button"
                  onClick={handleAddHeader}
                  className="text-xs text-indigo-600 hover:text-indigo-700"
                >
                  + Add header
                </button>
              </div>
              <div className="space-y-2">
                {headers.map((header, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={header.key}
                      onChange={(e) => handleHeaderChange(index, 'key', e.target.value)}
                      placeholder="Header name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    />
                    <input
                      type="text"
                      value={header.value}
                      onChange={(e) => handleHeaderChange(index, 'value', e.target.value)}
                      placeholder="Value"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveHeader(index)}
                      className="shrink-0 p-2 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Remove header"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Additional headers to include with each webhook request
              </p>
            </div>

            {/* Test Result */}
            {testResult && (
              <div
                className={`px-4 py-3 rounded-lg ${
                  testResult.success
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span>{testResult.message}</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting || !url.trim()}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isTesting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Testing...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Test Webhook
                </>
              )}
            </button>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !url.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Configuration'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
