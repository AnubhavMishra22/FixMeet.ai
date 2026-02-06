import { Link, useParams } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function EditEventTypePage() {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/dashboard/event-types">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Event Type</h1>
          <p className="text-gray-600">ID: {id}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-8 text-center">
        <p className="text-gray-500">Event type edit form coming in Phase 7...</p>
      </div>
    </div>
  );
}
