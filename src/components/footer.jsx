export function Footer({ className }) {
    return (<footer className={`h-12 border-t border-border bg-card px-6 flex items-center justify-center ${className || ""}`}>
      <p className="text-sm font-bold bg-linear-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
        POWERED BY BOTIVATE
      </p>
    </footer>);
}


