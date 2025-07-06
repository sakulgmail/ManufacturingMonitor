import { useMemo } from "react";
import { Machine, MachineStatus } from "@/lib/types";

interface MachineOverviewProps {
  machines: Machine[];
  isLoading?: boolean;
  onMachineSelect?: (machineId: number) => void;
}

const getStatusColor = (status: MachineStatus) => {
  switch (status) {
    case 'RUNNING':
      return 'bg-gradient-to-br from-emerald-50 to-green-100 border-2 border-emerald-300 text-emerald-700 hover:from-emerald-100 hover:to-green-200 hover:border-emerald-400 shadow-lg shadow-emerald-100';
    case 'STOP':
      return 'bg-gradient-to-br from-slate-50 to-gray-100 border-2 border-slate-300 text-slate-600 hover:from-slate-100 hover:to-gray-200 hover:border-slate-400 shadow-lg shadow-slate-100';
    case 'During Maintenance':
      return 'bg-gradient-to-br from-yellow-50 to-orange-100 border-2 border-yellow-300 text-yellow-700 hover:from-yellow-100 hover:to-orange-200 hover:border-yellow-400 shadow-lg shadow-yellow-100';
    case 'Out of Order':
      return 'bg-gradient-to-br from-red-50 to-rose-100 border-2 border-red-300 text-red-700 hover:from-red-100 hover:to-rose-200 hover:border-red-400 shadow-lg shadow-red-100';
    default:
      return 'bg-gradient-to-br from-slate-50 to-gray-100 border-2 border-slate-300 text-slate-600 hover:from-slate-100 hover:to-gray-200 hover:border-slate-400 shadow-lg shadow-slate-100';
  }
};

export default function MachineOverview({ machines, isLoading = false, onMachineSelect }: MachineOverviewProps) {
  // Sort machines by machine number with natural sorting
  const sortedMachines = useMemo(() => {
    return machines.sort((a, b) => a.machineNo.localeCompare(b.machineNo, undefined, { numeric: true, sensitivity: 'base' }));
  }, [machines]);

  if (isLoading) {
    return (
      <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Machine Status Overview</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-4 h-28 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Machine Status Overview</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {sortedMachines.map((machine) => (
          <button 
            key={machine.id}
            onClick={() => onMachineSelect?.(machine.id)}
            className={`${getStatusColor(machine.status)} rounded-xl p-4 flex flex-col items-center border transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer transform`}
          >
            <div className="font-bold text-lg mb-1">
              {machine.machineNo}
            </div>
            <div className="text-xs text-center mb-2 font-medium opacity-90">
              {machine.name}
            </div>
            <div className="text-xs px-2 py-1 rounded-full bg-white/20 backdrop-blur-sm font-semibold">
              {machine.status}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}