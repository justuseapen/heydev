import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SetupPage } from './pages/SetupPage';
import { InboxPage } from './pages/InboxPage';
import { ConversationPage } from './pages/ConversationPage';

// Type declaration for HeyDev widget global
declare global {
  interface Window {
    HeyDev?: {
      destroy: () => void;
      captureError: (error: Error) => void;
    };
  }
}

// HeyDev widget configuration for dogfooding
// Fallback to hardcoded key if env var not set (Coolify build arg issue workaround)
const HEYDEV_API_KEY = import.meta.env.VITE_HEYDEV_API_KEY || 'hd_live_b28320633d3c89ca477a2373e8363912';
const HEYDEV_ENDPOINT = 'https://heydev.io';

export function App() {
  // Load HeyDev widget for dogfooding (collecting feedback and errors from our own dashboard)
  useEffect(() => {
    if (!HEYDEV_API_KEY) {
      return;
    }

    const script = document.createElement('script');
    script.src = `${HEYDEV_ENDPOINT}/widget.js`;
    script.async = true;
    script.setAttribute('data-api-key', HEYDEV_API_KEY);
    script.setAttribute('data-endpoint', HEYDEV_ENDPOINT);
    script.setAttribute('data-error-tracking', 'true');
    document.body.appendChild(script);

    return () => {
      // Cleanup widget on unmount
      document.body.removeChild(script);
      if (window.HeyDev?.destroy) {
        window.HeyDev.destroy();
      }
    };
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<LandingPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="setup" element={<SetupPage />} />
        <Route path="inbox" element={<InboxPage />} />
        <Route path="inbox/:conversationId" element={<ConversationPage />} />
      </Route>
    </Routes>
  );
}
