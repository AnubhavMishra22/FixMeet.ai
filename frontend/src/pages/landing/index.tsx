import { Link, Navigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { LOGO_PATH } from '../../lib/constants';
import { useAuthStore } from '../../stores/auth-store';

export default function LandingPage() {
  const { user } = useAuthStore();
  if (user) return <Navigate to="/dashboard" replace />;
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <img src={LOGO_PATH} alt="MeetIA logo" className="h-24 w-auto mb-8" />
        <h1 className="text-4xl md:text-5xl font-bold text-[#1B2B4B] text-center max-w-3xl leading-tight">
          Smart Scheduling for Industrial Teams: Powered by AI
        </h1>
        <p className="mt-6 text-xl text-gray-600 text-center max-w-2xl">
          Built for SCADA teams, IIoT engineers, and operations staff. Schedule meetings, manage calendars, and let AI help you stay organized.
        </p>
        <div className="mt-10 flex flex-wrap gap-4 justify-center">
          <Link to="/login">
            <Button size="lg" className="bg-[#F5821F] hover:bg-[#e07318] text-white px-8">
              Sign in
            </Button>
          </Link>
          <Link to="/register">
            <Button size="lg" variant="outline" className="border-[#1B2B4B] text-[#1B2B4B] hover:bg-[#1B2B4B]/5 px-8">
              Create account
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-gray-500">
        MeetIA by Inductive Automation
      </footer>
    </div>
  );
}
