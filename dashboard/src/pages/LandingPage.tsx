export function LandingPage() {
  const scrollToSignup = () => {
    const signupSection = document.getElementById('signup');
    if (signupSection) {
      signupSection.scrollIntoView({ behavior: 'smooth' });
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

      {/* Placeholder for signup section - will be implemented in US-011 */}
      <section id="signup" className="py-16 px-4">
        {/* Signup CTA will go here */}
      </section>
    </div>
  );
}
