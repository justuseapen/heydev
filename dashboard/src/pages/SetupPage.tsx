export function SetupPage() {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Setup</h1>
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
          <button
            type="button"
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Generate API Key
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Notification Channels
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            Configure where you want to receive feedback notifications.
          </p>
          <div className="text-gray-500 text-sm">
            Coming soon: Slack, Email, SMS, and Webhook integrations.
          </div>
        </div>
      </div>
    </div>
  );
}
