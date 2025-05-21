import { useCallback } from "react";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useClock } from "@/hooks/useClock";

export default function Header() {
  const [location, setLocation] = useLocation();
  const { formattedTime } = useClock();

  const handleRefresh = useCallback(() => {
    // Invalidate all queries to force a refresh of data
    queryClient.invalidateQueries();
  }, []);

  return (
    <header className="bg-primary-600 text-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2" onClick={() => setLocation("/")} style={{ cursor: "pointer" }}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19.5 8.5V2a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v6.5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V2a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v6.5a1 1 0 0 1-1 1 1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h17a1 1 0 0 0 1-1v-9.5a1 1 0 0 0-1-1 1 1 0 0 1-1-1Z" />
            <path d="M3 20.5V10" />
            <path d="M21 10v10.5" />
          </svg>
          <h1 className="text-xl font-bold">Factory Gauge Monitoring</h1>
        </div>
        <div className="flex items-center space-x-4">
          <span>{formattedTime}</span>
          <button 
            className="bg-white bg-opacity-20 rounded px-3 py-1.5 flex items-center"
            onClick={handleRefresh}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </header>
  );
}
