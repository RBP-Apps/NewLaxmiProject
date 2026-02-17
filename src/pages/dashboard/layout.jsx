import { Outlet } from "react-router-dom"; import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { AuthProvider } from "@/components/auth-provider";
export default function DashboardLayout({ children, }) {
    return (<AuthProvider>
      <div className="flex h-dvh md:h-screen">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden min-h-0">
          <Header />
          <main className="flex-1 min-h-0 overflow-y-auto bg-gray-50/50 p-6 md:p-8 pt-8 md:pt-10 scroll-smooth">
            <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-2 duration-500">
              <Outlet />
            </div>
          </main>
          <Footer className="h-8 md:h-12 shrink-0 bg-gray-50/50"/>
        </div>
      </div>
    </AuthProvider>);
}


