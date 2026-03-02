import { BarChart3, Calendar, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { useNavigate } from 'react-router-dom';

export function InsightsEmptyState() {
  const navigate = useNavigate();

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
          <BarChart3 className="h-8 w-8 text-blue-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No meeting data yet
        </h3>
        <p className="text-sm text-gray-500 max-w-md mb-6">
          Start scheduling meetings to unlock powerful insights about your meeting patterns,
          busiest days, peak hours, and AI-powered recommendations.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/event-types/new')}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Create Event Type
          </Button>
          <Button onClick={() => navigate('/dashboard/bookings')}>
            View Bookings
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
