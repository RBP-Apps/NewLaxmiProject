import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Globe,
  FileText,
  ShieldCheck,
  Building2,
  Settings,
  Info,
  Shield,
  CheckCircle2,
  Activity,
  CreditCard,
  LogOut,
  Menu,
  Wrench,
  Users,
  HeartHandshake,
  BadgePercent,
  ShieldPlus,
  Umbrella,
  HeartPulse
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useState, useEffect } from "react";

const menuItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Portal", href: "/portal", icon: Globe },
  { name: "Work order", href: "/loi-mr", icon: FileText },
  { name: "Survey", href: "/sanction", icon: ShieldCheck },
  { name: "Dispatch & Receiving", href: "/foundation", icon: Building2 },
  { name: "Installation", href: "/installation", icon: Wrench },
  { name: "Portal Update", href: "/portal-update", icon: Info },
  { name: "Invoicing", href: "/insurance", icon: Shield },
  { name: "System Info", href: "/system-info", icon: Info },
  // { name: "JCC Completion", href: "/jcc-completion", icon: CheckCircle2 },
  { name: "JCR Status", href: "/jcc-status", icon: Activity },
  { name: "Beneficiary Share", href: "/beneficiary-share", icon: Users },
  { name: "Insurance", href: "/insurances", icon: ShieldPlus },
  { name: "IP payment", href: "/payment", icon: CreditCard },
  { name: "Settings", href: "/setting", icon: Settings },
];

function SidebarContent({ className, onLinkClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("username");
    navigate("/login");
  };

  return (
    <div className={cn("flex h-full flex-col bg-white shadow-lg border-r border-gray-100", className)}>
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-sm font-medium text-slate-600 mt-2">
          Welcome back, <span className="font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">{username || "User"}</span>!
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onLinkClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 ease-in-out",
                isActive
                  ? "bg-cyan-100 text-cyan-700 shadow-sm border border-cyan-200"
                  : "text-gray-600 hover:bg-gradient-to-r hover:from-cyan-500 hover:to-blue-600 hover:text-white hover:shadow-md hover:translate-x-1"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full justify-start gap-3 text-gray-700 border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <div className="hidden md:flex h-screen w-64 flex-col">
      <SidebarContent />
    </div>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-slate-600 hover:bg-blue-100 hover:text-blue-600 transition-colors"
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-72">
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
        <SidebarContent onLinkClick={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}