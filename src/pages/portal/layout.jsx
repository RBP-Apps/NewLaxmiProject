import { Outlet } from "react-router-dom"; import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { AuthProvider } from "@/components/auth-provider";
export default function PortalLayout({ children, }) {
    return (<AuthProvider>
      <div className="flex h-dvh md:h-screen">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden min-h-0">
          <Header />
          <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 bg-background">
            <Outlet />
          </main>
          <Footer className="h-8 md:h-12 shrink-0"/>
        </div>
      </div>
    </AuthProvider>);
}


