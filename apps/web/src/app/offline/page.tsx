import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Offline',
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">📶</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          You&apos;re offline
        </h1>
        <p className="text-gray-600 mb-6">
          It seems you&apos;ve lost your internet connection. Please check your
          network and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center px-6 py-3 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
