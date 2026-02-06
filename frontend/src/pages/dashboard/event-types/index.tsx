import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Plus } from 'lucide-react';

export default function EventTypesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Event Types</h1>
          <p className="text-gray-600">Manage your booking types</p>
        </div>
        <Link to="/dashboard/event-types/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Event Type
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg border p-8 text-center">
        <p className="text-gray-500">Event types list coming in Phase 7...</p>
      </div>
    </div>
  );
}
