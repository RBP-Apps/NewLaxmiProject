import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { AuthProvider } from "@/components/auth-provider";

export default function SettingLayout() {
    return (
        <AuthProvider>
            <div className="flex h-screen overflow-hidden">
                <Sidebar />
                <div className="flex flex-col flex-1 overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8">
                         <div className="mx-auto max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <Outlet />
                        </div>
                    </main>
                    <Footer />
                </div>
            </div>
        </AuthProvider>
    );
}
