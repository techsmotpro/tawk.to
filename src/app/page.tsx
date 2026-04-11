import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          Tawk.to Webhook Receiver
        </h1>
        <p className="text-gray-400 mb-8">
          Webhook endpoint:{" "}
          <code className="bg-gray-800 px-2 py-1 rounded">
            /api/webhooks/tawkto
          </code>
        </p>

        <Link
          href="/dashboard"
          className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          📊 Open Live Dashboard
        </Link>

        <div className="mt-12 bg-gray-800 rounded-lg p-6 text-left max-w-md">
          <h3 className="text-white font-semibold mb-4">Setup Instructions:</h3>
          <ol className="list-decimal list-inside text-gray-400 space-y-2">
            <li>
              Add webhook secret to{" "}
              <code className="bg-gray-700 px-1 rounded">.env.local</code>
            </li>
            <li>
              Configure webhook in Tawk.to Admin
              <br />
              <code className="text-xs text-green-400">
                https://your-domain.com/api/webhooks/tawkto
              </code>
            </li>
            <li>Select events: chat:start, chat:end, chat:transcript_created</li>
            <li>Open the dashboard to see live chats!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}