import { Link } from "wouter";

export default function AppHeader() {
  return (
    <header className="h-14 glass flex items-center justify-between px-4 z-10">
      <div className="flex items-center">
        <Link href="/">
          <a className="text-2xl font-light tracking-wider mr-6">
            <span className="text-secondary font-semibold">metta</span>
            <span className="text-primary">modeler</span>
          </a>
        </Link>
        <nav className="hidden md:flex space-x-4">
          <button className="px-3 py-1 text-sm rounded-md hover:bg-white/10 transition">models</button>
          <button className="px-3 py-1 text-sm rounded-md hover:bg-white/10 transition">help</button>
          <button className="px-3 py-1 text-sm rounded-md hover:bg-white/10 transition">export</button>
        </nav>
      </div>
      <div className="flex items-center space-x-3">
        <button className="p-2 rounded-full hover:bg-white/10">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm">
          EW
        </div>
      </div>
    </header>
  );
}
