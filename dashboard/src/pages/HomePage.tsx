import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <div className="text-center py-16">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Welcome to HeyDev
      </h1>
      <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
        A drop-in JavaScript widget for frictionless user feedback with voice
        input and multi-channel developer notifications.
      </p>
      <div className="flex justify-center gap-4">
        <Link
          to="/login"
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          Get Started
        </Link>
        <a
          href="https://github.com/heydev/heydev"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white text-gray-700 px-6 py-3 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          View on GitHub
        </a>
      </div>
    </div>
  );
}
