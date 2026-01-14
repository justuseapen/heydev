import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SetupPage } from './pages/SetupPage';
import { InboxPage } from './pages/InboxPage';
import { ConversationPage } from './pages/ConversationPage';

export function App() {
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
