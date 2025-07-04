import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import NavigationTabs from "@/components/layout/NavigationTabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Download, Play, Save, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";

interface ReportQuery {
  id?: number;
  name: string;
  machines: number[];
  stations: number[];
  gauges: number[];
  dateFrom: string;
  dateTo: string;
  statusFilter: string; // "all", "normal", "alert"
  includeImages: boolean;
  includeComments: boolean;
  savedAt?: string;
}

interface ReportResult {
  id: number;
  timestamp: string;
  machineName: string;
  stationName: string;
  gaugeName: string;
  value: number | string;
  unit: string;
  status: string;
  username: string;
  comment?: string;
  imageUrl?: string;
}

export function Reports() {
  const [currentQuery, setCurrentQuery] = useState<ReportQuery>({
    name: "",
    machines: [],
    stations: [],
    gauges: [],
    dateFrom: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    dateTo: format(new Date(), "yyyy-MM-dd"),
    statusFilter: "all",
    includeImages: true,
    includeComments: true
  });

  const [savedQueries, setSavedQueries] = useState<ReportQuery[]>([]);
  const [reportResults, setReportResults] = useState<ReportResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Fetch machines for filter options
  const { data: machines = [] } = useQuery<any[]>({
    queryKey: ["/api/machines"],
  });

  // Fetch stations for filter options
  const { data: stations = [] } = useQuery<any[]>({
    queryKey: ["/api/stations"],
  });

  // Fetch gauges for filter options
  const { data: gauges = [] } = useQuery<any[]>({
    queryKey: ["/api/gauges"],
  });

  const runReport = async () => {
    setIsRunning(true);
    try {
      const queryParams = new URLSearchParams({
        machines: currentQuery.machines.join(','),
        stations: currentQuery.stations.join(','),
        gauges: currentQuery.gauges.join(','),
        dateFrom: currentQuery.dateFrom,
        dateTo: currentQuery.dateTo,
        statusFilter: currentQuery.statusFilter,
        includeImages: currentQuery.includeImages.toString(),
        includeComments: currentQuery.includeComments.toString()
      });

      const response = await fetch(`/api/reports/run?${queryParams}`);
      const results = await response.json();
      setReportResults(results);
    } catch (error) {
      console.error('Error running report:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const exportToExcel = async () => {
    try {
      const queryParams = new URLSearchParams({
        machines: currentQuery.machines.join(','),
        stations: currentQuery.stations.join(','),
        gauges: currentQuery.gauges.join(','),
        dateFrom: currentQuery.dateFrom,
        dateTo: currentQuery.dateTo,
        statusFilter: currentQuery.statusFilter,
        includeImages: currentQuery.includeImages.toString(),
        includeComments: currentQuery.includeComments.toString(),
        format: 'excel'
      });

      const response = await fetch(`/api/reports/export?${queryParams}`);
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `manufacturing_report_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    }
  };

  const saveQuery = () => {
    const savedQuery = {
      ...currentQuery,
      id: Date.now(),
      savedAt: new Date().toISOString()
    };
    setSavedQueries([...savedQueries, savedQuery]);
  };

  const loadQuery = (query: ReportQuery) => {
    setCurrentQuery({ ...query });
  };

  const deleteQuery = (queryId: number) => {
    setSavedQueries(savedQueries.filter(q => q.id !== queryId));
  };

  const getFilteredStations = () => {
    if (currentQuery.machines.length === 0) return stations;
    return stations.filter(station => 
      currentQuery.machines.includes(station.machineId)
    );
  };

  const getFilteredGauges = () => {
    if (currentQuery.stations.length === 0) return gauges;
    return gauges.filter(gauge => 
      currentQuery.stations.includes(gauge.stationId)
    );
  };

  return (
    <>
      <NavigationTabs activeTab="reports" />
      
      <div className="space-y-6">
        {/* Query Builder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Report Query Builder
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Query Name */}
            <div>
              <Label htmlFor="queryName">Report Name</Label>
              <Input
                id="queryName"
                value={currentQuery.name}
                onChange={(e) => setCurrentQuery({ ...currentQuery, name: e.target.value })}
                placeholder="Enter report name..."
              />
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dateFrom">From Date</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={currentQuery.dateFrom}
                  onChange={(e) => setCurrentQuery({ ...currentQuery, dateFrom: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="dateTo">To Date</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={currentQuery.dateTo}
                  onChange={(e) => setCurrentQuery({ ...currentQuery, dateTo: e.target.value })}
                />
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Machines</Label>
                <Select
                  value={currentQuery.machines.length === 1 ? currentQuery.machines[0].toString() : ""}
                  onValueChange={(value) => {
                    const machineId = parseInt(value);
                    setCurrentQuery({
                      ...currentQuery,
                      machines: [machineId],
                      stations: [], // Reset dependent filters
                      gauges: []
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select machine..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Machines</SelectItem>
                    {machines.map((machine: any) => (
                      <SelectItem key={machine.id} value={machine.id.toString()}>
                        {machine.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Stations</Label>
                <Select
                  value={currentQuery.stations.length === 1 ? currentQuery.stations[0].toString() : ""}
                  onValueChange={(value) => {
                    const stationId = parseInt(value);
                    setCurrentQuery({
                      ...currentQuery,
                      stations: [stationId],
                      gauges: [] // Reset dependent filters
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select station..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Stations</SelectItem>
                    {getFilteredStations().map((station: any) => (
                      <SelectItem key={station.id} value={station.id.toString()}>
                        {station.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status Filter</Label>
                <Select
                  value={currentQuery.statusFilter}
                  onValueChange={(value) => setCurrentQuery({ ...currentQuery, statusFilter: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="normal">Normal Only</SelectItem>
                    <SelectItem value="alert">Alert Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Options */}
            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeImages"
                  checked={currentQuery.includeImages}
                  onCheckedChange={(checked) => 
                    setCurrentQuery({ ...currentQuery, includeImages: !!checked })
                  }
                />
                <Label htmlFor="includeImages">Include Images</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeComments"
                  checked={currentQuery.includeComments}
                  onCheckedChange={(checked) => 
                    setCurrentQuery({ ...currentQuery, includeComments: !!checked })
                  }
                />
                <Label htmlFor="includeComments">Include Comments</Label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button onClick={runReport} disabled={isRunning}>
                <Play className="h-4 w-4 mr-2" />
                {isRunning ? "Running..." : "Run Report"}
              </Button>
              <Button onClick={exportToExcel} variant="outline" disabled={reportResults.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export to Excel
              </Button>
              <Button onClick={saveQuery} variant="outline" disabled={!currentQuery.name}>
                <Save className="h-4 w-4 mr-2" />
                Save Query
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Saved Queries */}
        {savedQueries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Saved Queries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {savedQueries.map((query) => (
                  <div key={query.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">{query.name}</div>
                      <div className="text-sm text-gray-500">
                        Saved on {format(new Date(query.savedAt!), "MMM dd, yyyy 'at' HH:mm")}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => loadQuery(query)}>
                        Load
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => deleteQuery(query.id!)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {reportResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Report Results ({reportResults.length} records)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2 text-left">Timestamp</th>
                      <th className="px-4 py-2 text-left">Machine</th>
                      <th className="px-4 py-2 text-left">Station</th>
                      <th className="px-4 py-2 text-left">Gauge</th>
                      <th className="px-4 py-2 text-left">Value</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">User</th>
                      {currentQuery.includeComments && <th className="px-4 py-2 text-left">Comment</th>}
                      {currentQuery.includeImages && <th className="px-4 py-2 text-left">Image</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {reportResults.map((result) => (
                      <tr key={result.id} className="border-b">
                        <td className="px-4 py-2">{format(new Date(result.timestamp), "MMM dd, yyyy HH:mm")}</td>
                        <td className="px-4 py-2">{result.machineName}</td>
                        <td className="px-4 py-2">{result.stationName}</td>
                        <td className="px-4 py-2">{result.gaugeName}</td>
                        <td className="px-4 py-2">{result.value} {result.unit}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            result.status === 'Alert' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {result.status}
                          </span>
                        </td>
                        <td className="px-4 py-2">{result.username}</td>
                        {currentQuery.includeComments && (
                          <td className="px-4 py-2">{result.comment || '-'}</td>
                        )}
                        {currentQuery.includeImages && (
                          <td className="px-4 py-2">
                            {result.imageUrl ? (
                              <a href={result.imageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                View
                              </a>
                            ) : '-'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}