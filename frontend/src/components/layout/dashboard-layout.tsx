import { useCallback, useEffect, useState } from 'react';
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
  CreditCard,
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
  { name: 'Plans & pricing', href: '/dashboard/pricing', icon: CreditCard, badge: null },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings, badge: null },
];

function navLinkAccessibleName(
  item: (typeof navigation)[number],
  billingShowcaseMode: boolean | undefined,
): string {
  if (!item.badge) return item.name;
  const tier = item.badge;
  if (!billingShowcaseMode) {
    return `${item.name} (${tier})`;
  }
  return `${item.name} (${tier}). Showcase: this area stays open without ${tier}; in production it would require ${tier}.`;
}

const SIDEBAR_WIDTH_STORAGE_KEY = 'fixmeet-sidebar-width-px';
const SIDEBAR_MIN_WIDTH = 56;
const SIDEBAR_MAX_WIDTH = 420;
const SIDEBAR_DEFAULT_WIDTH = 256;
/** At or above this width, show labels; below = icon rail only */
const SIDEBAR_LABEL_BREAKPOINT = 128;

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function isDashboardHomePath(path: string): boolean {
  return path === '/dashboard';
}

/** Whether this nav item should show the “selected” styles for the current URL */
function isNavItemActive(pathname: string, itemHref: string): boolean {
  const path = normalizePathname(pathname);
  const href = normalizePathname(itemHref);

  // Home: only the real index, not /dashboard/anything
  if (href === '/dashboard') {
    return isDashboardHomePath(path);
  }

  if (path === href) return true;
  // Nested routes under this section (e.g. /dashboard/bookings/:id)
  if (path.startsWith(href + '/')) return true;
  return false;
}

function readStoredSidebarWidth(): number {
  try {
    const raw = localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    const n = raw ? parseInt(raw, 10) : NaN;
    if (!Number.isFinite(n)) return SIDEBAR_DEFAULT_WIDTH;
    return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, n));
  } catch {
    return SIDEBAR_DEFAULT_WIDTH;
  }
}

interface Props {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [sidebarWidth, setSidebarWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? readStoredSidebarWidth() : SIDEBAR_DEFAULT_WIDTH
  );

  const showLabels = sidebarWidth >= SIDEBAR_LABEL_BREAKPOINT;

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = sidebarWidth;
      let lastWidth = startWidth;

      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX;
        lastWidth = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, startWidth + delta));
        setSidebarWidth(lastWidth);
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        document.body.style.removeProperty('cursor');
        document.body.style.removeProperty('user-select');
        try {
          localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(lastWidth));
        } catch {
          /* ignore */
        }
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [sidebarWidth]
  );

  const handleResizeDoubleClick = useCallback(() => {
    setSidebarWidth(SIDEBAR_DEFAULT_WIDTH);
    try {
      localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(SIDEBAR_DEFAULT_WIDTH));
    } catch {
      /* ignore */
    }
  }, []);

  // Sync from storage if another tab changes (optional)
  useEffect(() => {
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === SIDEBAR_WIDTH_STORAGE_KEY && ev.newValue) {
        const n = parseInt(ev.newValue, 10);
        if (Number.isFinite(n)) {
          setSidebarWidth(Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, n)));
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div>
      {/* Sidebar — light blue, width controlled by drag */}
      <aside
        className="fixed inset-y-0 left-0 z-10 overflow-hidden bg-cyan-100 border-r border-cyan-200"
        style={{ width: sidebarWidth }}
      >
        <div className="flex h-full min-h-0 flex-col">
          {/* Logo — wordmark: primary-wordmark (slightly lighter than buttons/links primary). */}
          <div className="border-b border-cyan-200 px-2 py-3 sm:px-3 sm:py-4 md:px-6 md:py-6">
            <Link
              to="/dashboard"
              className={`flex items-center gap-2 text-xl font-bold text-primary-wordmark transition-colors hover:text-primary ${
                showLabels ? 'justify-start' : 'justify-center'
              }`}
            >
              <img src={LOGO_SMALL_PATH} alt="FixMeet logo" className="h-7 w-7 shrink-0 md:h-8 md:w-8" />
              {showLabels && <span className="truncate">FixMeet</span>}
            </Link>
          </div>

          {/* Navigation */}
          <nav
            className="scrollbar-none flex min-h-0 flex-1 flex-col space-y-1 overflow-y-auto overflow-x-hidden p-2 md:p-4"
            aria-label="Main navigation"
          >
            {navigation.map((item) => {
              const isActive = isNavItemActive(location.pathname, item.href);
              const navA11yLabel = navLinkAccessibleName(item, user?.billingShowcaseMode);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  title={navA11yLabel}
                  aria-label={navA11yLabel}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center rounded-md px-2 py-2 transition-colors md:px-3 ${
                    showLabels ? 'justify-start gap-3' : 'justify-center gap-0'
                  } ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-cyan-950 hover:bg-cyan-200/70'
                  }`}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {showLabels && (
                    <>
                      <span className="min-w-0 flex-1 truncate">{item.name}</span>
                      {item.badge && (
                        <Badge
                          variant="secondary"
                          className="ml-auto shrink-0 text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary border-0 font-semibold"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-cyan-200 p-2 md:p-4">
            <div
              className={`mb-2 flex items-center gap-3 md:mb-3 ${showLabels ? 'justify-start' : 'justify-center'}`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <span className="font-medium text-primary">{user?.name?.charAt(0).toUpperCase()}</span>
              </div>
              {showLabels && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="truncate text-xs text-gray-500">{user?.email}</p>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              className={`w-full text-gray-600 hover:bg-gray-100 hover:text-gray-900 ${
                showLabels ? 'justify-start' : 'justify-center'
              }`}
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className={`h-4 w-4 shrink-0 ${showLabels ? 'mr-2' : ''}`} />
              {showLabels && <span>Logout</span>}
            </Button>
          </div>
        </div>

        {/* Drag handle — resize sidebar */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize navigation sidebar"
          aria-valuemin={SIDEBAR_MIN_WIDTH}
          aria-valuemax={SIDEBAR_MAX_WIDTH}
          aria-valuenow={Math.round(sidebarWidth)}
          title="Drag to resize. Double-click to reset."
          tabIndex={0}
          onMouseDown={handleResizeStart}
          onDoubleClick={handleResizeDoubleClick}
          className="absolute right-0 top-0 z-20 h-full w-3 max-w-[12px] translate-x-1/2 cursor-col-resize select-none border-0 bg-transparent p-0 hover:bg-cyan-300/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
        />
      </aside>

      {/* Main content */}
      <main className="min-h-screen bg-slate-50" style={{ paddingLeft: sidebarWidth }}>
        <div className="mx-auto max-w-5xl p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
