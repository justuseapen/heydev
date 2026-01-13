import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface EmailConfig {
  email: string;
  verified?: boolean;
}

interface EmailConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: EmailConfig) => Promise<void>;
  initialConfig?: EmailConfig;
}

type Step = 'email' | 'verify' | 'verified';

export function EmailConfigModal({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: EmailConfigModalProps) {
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<Step>('email');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reset form when modal opens with initial config
  useEffect(() => {
    if (isOpen) {
      setEmail(initialConfig?.email || '');
      setVerificationCode('');
      setError(null);
      setSuccessMessage(null);

      // Determine initial step based on config
      if (initialConfig?.verified) {
        setStep('verified');
      } else if (initialConfig?.email) {
        setStep('verify');
      } else {
        setStep('email');
      }
    }
  }, [isOpen, initialConfig]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendVerification = async () => {
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`${API_URL}/api/channels/email/send-verification`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send verification email');
        return;
      }

      setSuccessMessage('Verification code sent! Check your email.');
      setStep('verify');
    } catch {
      setError('Failed to send verification email');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    if (verificationCode.trim().length !== 6) {
      setError('Verification code must be 6 digits');
      return;
    }

    setIsVerifying(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`${API_URL}/api/channels/email/verify`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: verificationCode.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid verification code');
        return;
      }

      // Save the verified email config
      await onSave({
        email: email.trim(),
        verified: true,
      });

      setStep('verified');
      setSuccessMessage('Email verified successfully!');
    } catch {
      setError('Failed to verify code');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    await handleSendVerification();
  };

  const handleChangeEmail = () => {
    setStep('email');
    setVerificationCode('');
    setError(null);
    setSuccessMessage(null);
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
              Configure Email Notifications
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

          {/* Success message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
              <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {successMessage}
            </div>
          )}

          {/* Step: Email Input */}
          {step === 'email' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSendVerification();
                    }
                  }}
                />
                <p className="mt-1 text-xs text-gray-500">
                  We'll send feedback notifications to this email address
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendVerification}
                  disabled={isSending || !email.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSending ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Send Verification Code
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step: Verify Code */}
          {step === 'verify' && (
            <div className="space-y-5">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  Verification code sent to:
                </p>
                <p className="font-medium text-gray-900">{email}</p>
                <button
                  type="button"
                  onClick={handleChangeEmail}
                  className="text-sm text-indigo-600 hover:text-indigo-700 mt-1"
                >
                  Change email
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => {
                    // Only allow digits and limit to 6 characters
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setVerificationCode(value);
                  }}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-lg tracking-widest text-center"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && verificationCode.length === 6) {
                      handleVerify();
                    }
                  }}
                />
                <p className="mt-2 text-xs text-gray-500">
                  Enter the 6-digit code from the email we sent you
                </p>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isSending}
                  className="text-sm text-indigo-600 hover:text-indigo-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {isSending ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Resending...
                    </>
                  ) : (
                    'Resend code'
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
                    onClick={handleVerify}
                    disabled={isVerifying || verificationCode.length !== 6}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isVerifying ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Verifying...
                      </>
                    ) : (
                      'Verify'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step: Verified */}
          {step === 'verified' && (
            <div className="space-y-5">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-green-800 mb-1">Email Verified</h3>
                <p className="text-green-600">{email}</p>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleChangeEmail}
                  className="text-sm text-indigo-600 hover:text-indigo-700"
                >
                  Use a different email
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
