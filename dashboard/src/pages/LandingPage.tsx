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

      {/* Placeholder for signup section - will be implemented in US-011 */}
      <section id="signup" className="py-16 px-4">
        {/* Signup CTA will go here */}
      </section>
    </div>
  );
}
