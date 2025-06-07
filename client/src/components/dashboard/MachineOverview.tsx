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
      return 'bg-green-50 border-2 border-[#196f3d] text-[#196f3d] hover:bg-green-100';
    case 'STOP':
      return 'bg-gray-50 border-2 border-[#d0d3d4] text-[#d0d3d4] hover:bg-gray-100';
    case 'During Maintenance':
      return 'bg-gray-50 border-2 border-[#d0d3d4] text-[#d0d3d4] hover:bg-gray-100';
    case 'Out of Order':
      return 'bg-gray-50 border-2 border-[#d0d3d4] text-[#d0d3d4] hover:bg-gray-100';
    default:
      return 'bg-gray-50 border-2 border-[#d0d3d4] text-[#d0d3d4] hover:bg-gray-100';
  }
};

export default function MachineOverview({ machines, isLoading = false, onMachineSelect }: MachineOverviewProps) {
  // Sort machines by machine number with natural sorting
  const sortedMachines = useMemo(() => {
    return machines.sort((a, b) => a.machineNo.localeCompare(b.machineNo, undefined, { numeric: true, sensitivity: 'base' }));
  }, [machines]);

  if (isLoading) {
    return (
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-semibold mb-4">Machine Status Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="bg-gray-100 rounded p-3 h-24 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 bg-white rounded-lg shadow p-4">
      <h2 className="text-xl font-semibold mb-4">Machine Status Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {sortedMachines.map((machine) => (
          <button 
            key={machine.id}
            onClick={() => onMachineSelect?.(machine.id)}
            className={`${getStatusColor(machine.status)} rounded p-3 flex flex-col items-center border transition-colors duration-200 hover:shadow-md cursor-pointer`}
          >
            <div className="font-semibold text-sm">
              {machine.machineNo}
            </div>
            <div className="text-xs text-center mt-1">
              {machine.name}
            </div>
            <div className="text-xs mt-2 font-medium">
              {machine.status}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}