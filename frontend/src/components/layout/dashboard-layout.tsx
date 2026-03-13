import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth-store';
import { IA_NAME, IA_URL, LOGO_SMALL_PATH, LOGO_PATH } from '../../lib/constants';
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
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, badge: null },
  { name: 'Event Types', href: '/dashboard/event-types', icon: LinkIcon, badge: null },
  { name: 'Bookings', href: '/dashboard/bookings', icon: Calendar, badge: null },
  { name: 'AI Assistant', href: '/dashboard/ai', icon: Sparkles, badge: 'Pro' },
  { name: 'Meeting Briefs', href: '/dashboard/briefs', icon: FileText, badge: 'Pro' },
  { name: 'Follow-ups', href: '/dashboard/followups', icon: MailCheck, badge: 'Max' },
  { name: 'Insights', href: '/dashboard/insights', icon: BarChart3, badge: 'Max' },
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
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 ${SIDEBAR_WIDTH_CLASS} bg-[#1B2B4B] border-r border-[#1B2B4B]`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-3 py-4 md:p-6 border-b border-white/10">
            <Link to="/dashboard" className="flex items-center justify-center md:justify-start gap-2 text-xl font-bold text-white">
              <img src={LOGO_SMALL_PATH} alt="MeetIA logo" className="h-7 w-7 md:h-8 md:w-8" />
              <span className="hidden md:inline">MeetIA</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 md:p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href ||
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
                      ? 'bg-[#F5821F]/20 text-[#F5821F]'
                      : 'text-white/90 hover:bg-white/10'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="hidden md:inline">{item.name}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="hidden md:inline-flex ml-auto text-[10px] px-1.5 py-0.5 bg-[#F5821F]/20 text-[#F5821F] border-0">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-2 md:p-4 border-t border-white/10">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2 md:mb-3">
              <div className="h-10 w-10 rounded-full bg-[#F5821F]/20 flex items-center justify-center">
                <span className="text-[#F5821F] font-medium">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="hidden md:block flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-white">{user?.name}</p>
                <p className="text-xs text-white/70 truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-center md:justify-start text-white/90 hover:bg-white/10 hover:text-white"
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
      <main className={`${MAIN_CONTENT_PADDING_CLASS} bg-white min-h-screen`}>
        <div className="max-w-5xl mx-auto p-4 md:p-8">{children}</div>
        {/* Bottom right: MeetIA by [logo] */}
        <div className="hidden md:flex fixed bottom-6 right-6 items-center gap-2">
          <span className="text-2xl text-gray-600">
            <span className="font-bold">MeetIA</span> by
          </span>
          <a
            href={IA_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Visit ${IA_NAME}`}
          >
            <img src={LOGO_PATH} alt={IA_NAME} className="h-10 w-auto" />
          </a>
        </div>
      </main>
    </div>
  );
}
