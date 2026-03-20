import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth-store';
import { LOGO_SMALL_PATH } from '../../lib/constants';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Calendar,
  Settings,
  LogOut,
  LayoutDashboard,
  Link as LinkIcon,
  Sparkles,
  FileText,
  MailCheck,
  BarChart3,
  Presentation,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, badge: null },
  { name: 'Event Types', href: '/dashboard/event-types', icon: LinkIcon, badge: null },
  { name: 'Bookings', href: '/dashboard/bookings', icon: Calendar, badge: null },
  { name: 'AI Assistant', href: '/dashboard/ai', icon: Sparkles, badge: 'Pro' },
  { name: 'Meeting Briefs', href: '/dashboard/briefs', icon: FileText, badge: 'Pro' },
  { name: 'Follow-ups', href: '/dashboard/followups', icon: MailCheck, badge: 'Max' },
  { name: 'Insights', href: '/dashboard/insights', icon: BarChart3, badge: 'Max' },
  { name: 'Demo', href: '/dashboard/demo', icon: Presentation, badge: null },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings, badge: null },
];

const SIDEBAR_WIDTH_CLASS = 'w-16 md:w-64';
const MAIN_CONTENT_PADDING_CLASS = 'pl-16 md:pl-64';

interface Props {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div>
      {/* Sidebar — light blue */}
      <aside className={`fixed inset-y-0 left-0 ${SIDEBAR_WIDTH_CLASS} bg-sky-100 border-r border-sky-200`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-3 py-4 md:p-6 border-b border-sky-200">
            <Link
              to="/dashboard"
              className="flex items-center justify-center md:justify-start gap-2 text-xl font-bold text-slate-900"
            >
              <img src={LOGO_SMALL_PATH} alt="FixMeet logo" className="h-7 w-7 md:h-8 md:w-8" />
              <span className="hidden md:inline">FixMeet</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 md:p-4 space-y-1">
            {navigation.map((item) => {
              const isActive =
                location.pathname === item.href ||
                (item.href !== '/dashboard' && location.pathname.startsWith(item.href + '/'));
              const navA11yLabel = item.badge ? `${item.name} (${item.badge})` : item.name;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  title={navA11yLabel}
                  aria-label={navA11yLabel}
                  className={`flex items-center justify-center md:justify-start gap-0 md:gap-3 px-2 md:px-3 py-2 rounded-md transition-colors ${
                    isActive
                      ? 'bg-sky-300/70 text-slate-900 shadow-sm'
                      : 'text-slate-800 hover:bg-sky-200/80 hover:text-slate-900'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="hidden md:inline">{item.name}</span>
                  {item.badge && (
                    <Badge
                      variant="secondary"
                      className="hidden md:inline-flex ml-auto text-[10px] px-1.5 py-0.5 bg-primary text-primary-foreground border-0 font-semibold"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-2 md:p-4 border-t border-sky-200">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2 md:mb-3">
              <div className="h-10 w-10 rounded-full bg-sky-300/90 flex items-center justify-center ring-1 ring-sky-400/50">
                <span className="text-slate-900 font-semibold">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="hidden md:block flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-600 truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-center md:justify-start text-slate-800 hover:bg-sky-200/90 hover:text-slate-950"
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Logout</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className={`${MAIN_CONTENT_PADDING_CLASS} bg-sky-50 min-h-screen`}>
        <div className="max-w-5xl mx-auto p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
