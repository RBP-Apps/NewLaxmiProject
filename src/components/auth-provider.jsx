import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export function AuthProvider({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    
    useEffect(() => {
        const isAuthenticated = localStorage.getItem("isAuthenticated");
        if (!isAuthenticated && location.pathname !== "/login") {
            navigate("/login");
        }
    }, [location.pathname, navigate]);
    return <>{children}</>;
}


