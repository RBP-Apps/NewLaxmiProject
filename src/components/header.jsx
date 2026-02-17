
import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { MobileSidebar } from "@/components/sidebar";
export function Header() {
    const [username, setUsername] = useState("");
    useEffect(() => {
        const storedUsername = localStorage.getItem("username");
        if (storedUsername) {
            setUsername(storedUsername);
        }
    }, []);
    const location = useLocation();

    const PAGE_TITLES = {
      "/dashboard": { title: "Dashboard", description: "Overview of your project status." },
      "/portal": { title: "Portal Management", description: "Manage portal entires and data." },
      "/loi-mr": { title: "LOI & MR Processing", description: "Manage Letters of Intent and Material Receipts for beneficiaries." },
      "/sanction": { title: "Sanction Order Processing", description: "Manage and approve sanction orders for beneficiaries." },
      "/foundation": { title: "Foundation Management", description: "Manage foundation work and track material status" },
      "/installation": { title: "Installation Management", description: "Process and track installation work orders" },
      "/system-info": { title: "System Information", description: "Record and update system installation details." },
      "/insurance": { title: "Insurance Management", description: "Manage insurance policies and track beneficiary coverage" },
      "/jcc-completion": { title: "JCC Completion", description: "Manage Job Completion Certificates and track completion status" },
      "/jcc-status": { title: "JCC Status Tracking", description: "Track JCC approval status across different offices (DO, RO, ZO, HO)" },
      "/payment": { title: "Payment Processing", description: "Manage payments, calculate taxes, and track history." },
    };

    const currentPath = location.pathname;
    const pageInfo = PAGE_TITLES[currentPath] || { title: "Admin Panel", description: "Welcome back, Admin!" };

    return (
    <header className="h-20 border-b border-slate-100 bg-white/80 backdrop-blur-md px-6 flex items-center justify-between shadow-sm z-20 sticky top-0 transition-all duration-300">
      <div className="flex items-center gap-4">
        <MobileSidebar />
        <div className="flex flex-col">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight leading-tight">
            {pageInfo.title}
          </h2>
          <p className="text-xs text-slate-500 hidden md:block">
            {pageInfo.description}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="hidden md:flex flex-col items-end">
          <span className="text-xs font-semibold text-slate-700">
            {new Date().toLocaleDateString("en-US", { weekday: "long" })}
          </span>
          <span className="text-[10px] text-muted-foreground">
             {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </span>
        </div>
        <div className="h-9 w-9 rounded-full bg-linear-to-tr from-blue-500 to-cyan-500 p-[2px] shadow-md">
           <div className="h-full w-full rounded-full bg-white flex items-center justify-center">
              <span className="text-sm font-bold text-blue-600">{username ? username[0].toUpperCase() : "A"}</span>
           </div>
        </div>
      </div>
    </header>
    );
}


