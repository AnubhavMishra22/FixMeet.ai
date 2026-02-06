import { useParams } from 'react-router-dom';

export default function PublicBookingPage() {
  const { username, slug } = useParams();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg border p-8 text-center max-w-md">
        <h1 className="text-xl font-bold mb-2">Public Booking Page</h1>
        <p className="text-gray-600 mb-4">
          Booking for: {username}/{slug}
        </p>
        <p className="text-gray-500 text-sm">
          Public booking widget coming in Phase 7...
        </p>
      </div>
    </div>
  );
}
