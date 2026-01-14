import { useState, FormEvent } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function LandingPage() {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollToSignup = () => {
    const signupSection = document.getElementById('signup');
    if (signupSection) {
      signupSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const installSnippet = '<script src="https://cdn.heydev.io/widget.js" data-key="YOUR_API_KEY"></script>';

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(installSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = installSnippet;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/auth/magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send magic link');
      }

      setSuccess(true);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-24 px-4 text-center">
        <h1
          className="text-5xl font-bold text-gray-900 mb-6"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Frictionless feedback for your web app
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Add voice-enabled user feedback to any website in one line of code.
        </p>
        <button
          onClick={scrollToSignup}
          className="bg-gray-900 text-white px-8 py-4 text-lg font-medium hover:bg-gray-800 transition-colors"
        >
          Get Started
        </button>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-gray-100">
        <div className="max-w-4xl mx-auto">
          <h2
            className="text-3xl font-bold text-gray-900 mb-12 text-center"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Everything you need
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 border border-gray-200">
              <div className="text-3xl mb-3">&#127908;</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Voice Input</h3>
              <p className="text-gray-600">
                Users can record voice feedback directly in your app. Transcription is automatic.
              </p>
            </div>
            <div className="bg-white p-6 border border-gray-200">
              <div className="text-3xl mb-3">&#128247;</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Screenshot Capture</h3>
              <p className="text-gray-600">
                Automatically capture what the user sees. No more asking "what page were you on?"
              </p>
            </div>
            <div className="bg-white p-6 border border-gray-200">
              <div className="text-3xl mb-3">&#128276;</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Multi-channel Notifications</h3>
              <p className="text-gray-600">
                Get notified via Slack, email, or webhook. Choose what works for your team.
              </p>
            </div>
            <div className="bg-white p-6 border border-gray-200">
              <div className="text-3xl mb-3">&#128172;</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Two-way Conversations</h3>
              <p className="text-gray-600">
                Reply to users directly. They'll see your response right in your app.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Installation Section */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2
            className="text-3xl font-bold text-gray-900 mb-4"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Add one line to your site
          </h2>
          <p className="text-gray-600 mb-8">
            That's it. No npm install, no build step, no configuration files.
          </p>
          <div className="relative">
            <pre
              className="bg-gray-900 text-left p-4 overflow-x-auto"
              style={{ fontFamily: 'Menlo, Monaco, Consolas, monospace' }}
            >
              <code>
                <span style={{ color: '#9CA3AF' }}>&lt;</span>
                <span style={{ color: '#F87171' }}>script</span>
                <span style={{ color: '#9CA3AF' }}> </span>
                <span style={{ color: '#FBBF24' }}>src</span>
                <span style={{ color: '#9CA3AF' }}>=</span>
                <span style={{ color: '#34D399' }}>"https://cdn.heydev.io/widget.js"</span>
                <span style={{ color: '#9CA3AF' }}> </span>
                <span style={{ color: '#FBBF24' }}>data-key</span>
                <span style={{ color: '#9CA3AF' }}>=</span>
                <span style={{ color: '#34D399' }}>"YOUR_API_KEY"</span>
                <span style={{ color: '#9CA3AF' }}>&gt;&lt;/</span>
                <span style={{ color: '#F87171' }}>script</span>
                <span style={{ color: '#9CA3AF' }}>&gt;</span>
              </code>
            </pre>
            <button
              onClick={copyToClipboard}
              className="absolute top-2 right-2 bg-gray-700 text-white px-3 py-1 text-sm hover:bg-gray-600 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </section>

      {/* Signup Section */}
      <section id="signup" className="py-16 px-4 bg-gray-100">
        <div className="max-w-md mx-auto text-center">
          <h2
            className="text-3xl font-bold text-gray-900 mb-4"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Get Started
          </h2>
          <p className="text-gray-600 mb-8">
            Enter your email and we'll send you a magic link to sign in.
          </p>

          {success ? (
            <div className="bg-green-50 border border-green-200 p-4 text-green-800">
              Check your email for a login link
            </div>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900"
              />
              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-900 text-white px-8 py-3 font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Get Started'}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
