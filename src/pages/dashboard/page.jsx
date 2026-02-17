import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Users, DollarSign, TrendingUp, RefreshCw, AlertCircle, FileText, CheckCircle2, Clock, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalCapacity: 0,
    totalSanctioned: 0,
    completionRate: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch all required tables in parallel
      const [
        { data: portalData, error: portalError },
        { data: surveyData, error: surveyError },
        { data: dmData, error: dmError },
        { data: insData, error: insError },
        { data: paymentData, error: paymentError },
      ] = await Promise.all([
        supabase.from("portal").select("*"),
        supabase.from("survey").select("reg_id, planned_2, actual_2"),
        supabase.from("dispatch_material").select("reg_id, planned_3, actual_3"),
        supabase.from("installation").select("reg_id, planned_4, actual_4"),
        supabase.from("ip_payment").select("reg_id, planned_11, actual_11"),
      ]);

      if (portalError) throw portalError;
      if (surveyError) throw surveyError;
      if (dmError) throw dmError;
      if (insError) throw insError;
      if (paymentError) throw paymentError;

      if (!portalData || portalData.length === 0) {
        setData([]);
        setStats({ totalProjects: 0, totalCapacity: "0 Sites", totalSanctioned: 0, completionRate: 0 });
        setIsLoading(false);
        return;
      }

      // --- Build lookup maps from related tables ---
      // Survey: sanction done = planned_2 filled AND actual_2 filled
      const surveyMap = {};
      (surveyData || []).forEach((row) => {
        if (row.reg_id) surveyMap[row.reg_id] = row;
      });

      // Foundation dispatch/complete
      const dmMap = {};
      (dmData || []).forEach((row) => {
        if (row.reg_id) dmMap[row.reg_id] = row;
      });

      // Installation dispatch/complete
      const insMap = {};
      (insData || []).forEach((row) => {
        if (row.reg_id) insMap[row.reg_id] = row;
      });

      // Payment done
      const paymentMap = {};
      (paymentData || []).forEach((row) => {
        if (row.reg_id) paymentMap[row.reg_id] = row;
      });

      // --- Aggregation Logic ---
      // Group by IP Name (company) | District
      const aggMap = new Map();
      let totalProjectsCount = 0;
      let totalSanctionedCount = 0;
      let totalCompletedCount = 0;

      portalData.forEach((row) => {
        const company = row.ip_name ? String(row.ip_name).trim() : "Unknown";
        const district = row.district ? String(row.district).trim() : "Unknown";
        const regId = row.reg_id;

        // Skip rows with no meaningful data
        if (company === "Unknown" && district === "Unknown") return;

        totalProjectsCount++;

        const key = `${company}|${district}`;

        if (!aggMap.has(key)) {
          aggMap.set(key, {
            id: key,
            company,
            district,
            installer: row.installer || row.installer_name || row["Installer Name"] || "-",
            sanction: 0,
            foundationDispatch: 0,
            foundationComplete: 0,
            installationDispatch: 0,
            installationComplete: 0,
            paymentDone: 0,
            totalBeneficiaries: 0,
          });
        }

        const entry = aggMap.get(key);
        entry.totalBeneficiaries++;

        // --- Sanction: check if survey has actual_2 filled ---
        const surveyRow = surveyMap[regId];
        if (surveyRow) {
          const isActual2 = surveyRow.actual_2 != null && String(surveyRow.actual_2).trim() !== "";
          if (isActual2) {
            entry.sanction++;
            totalSanctionedCount++;
          }
        }

        // --- Foundation: check dispatch_material ---
        const dmRow = dmMap[regId];
        if (dmRow) {
          const isPlanned3 = dmRow.planned_3 != null && String(dmRow.planned_3).trim() !== "";
          const isActual3 = dmRow.actual_3 != null && String(dmRow.actual_3).trim() !== "";
          if (isPlanned3) entry.foundationDispatch++;
          if (isActual3) entry.foundationComplete++;
        }

        // --- Installation: check installation table ---
        const insRow = insMap[regId];
        if (insRow) {
          const isPlanned4 = insRow.planned_4 != null && String(insRow.planned_4).trim() !== "";
          const isActual4 = insRow.actual_4 != null && String(insRow.actual_4).trim() !== "";
          if (isPlanned4) entry.installationDispatch++;
          if (isActual4) {
            entry.installationComplete++;
            totalCompletedCount++;
          }
        }

        // --- Payment: check ip_payment table ---
        const payRow = paymentMap[regId];
        if (payRow) {
          const isActual11 = payRow.actual_11 != null && String(payRow.actual_11).trim() !== "";
          if (isActual11) entry.paymentDone++;
        }
      });

      const parsedData = Array.from(aggMap.values());

      // Calculate Completion Rate
      const completionRate = totalProjectsCount > 0
        ? ((totalCompletedCount / totalProjectsCount) * 100).toFixed(1)
        : 0;

      setData(parsedData);
      setStats({
        totalProjects: totalProjectsCount,
        totalCapacity: parsedData.length + " Sites",
        totalSanctioned: totalSanctionedCount,
        completionRate: completionRate
      });
      setLastUpdated(new Date());

    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6 p-6 md:p-8 animate-fade-in-up min-h-screen bg-slate-50/50">

      {/* Header and Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
            Project Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time analytics from Supabase
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-slate-400 mr-2 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button
            onClick={fetchData}
            disabled={isLoading}
            variant="outline"
            className="border-slate-200 hover:bg-white hover:text-blue-600 hover:border-blue-300 hover:shadow-md transition-all duration-300"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500 border-y border-r border-blue-50 shadow-sm bg-white/80 backdrop-blur hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-default group">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">Total Beneficiaries</CardTitle>
            <div className="p-2 bg-blue-50 rounded-lg">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{isLoading ? "..." : stats.totalProjects}</div>
            <p className="text-xs text-slate-400 mt-1">Total registered projects</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 border-y border-r border-purple-50 shadow-sm bg-white/80 backdrop-blur hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-default group">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">Active Companies</CardTitle>
            <div className="p-2 bg-purple-50 rounded-lg">
              <Activity className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{isLoading ? "..." : data.length}</div>
            <p className="text-xs text-slate-400 mt-1">Operating districts</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 border-y border-r border-green-50 shadow-sm bg-white/80 backdrop-blur hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-default group">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">Sanctioned</CardTitle>
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{isLoading ? "..." : stats.totalSanctioned}</div>
            <p className="text-xs text-slate-400 mt-1">Total sanctioned units</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 border-y border-r border-orange-50 shadow-sm bg-white/80 backdrop-blur hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-default group">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">Completion Rate</CardTitle>
            <div className="p-2 bg-orange-50 rounded-lg">
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{isLoading ? "..." : stats.completionRate}%</div>
            <p className="text-xs text-slate-400 mt-1">Installation complete</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Data Table */}
      <Card className="border border-slate-200 shadow-lg shadow-slate-200/50 bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-800">Master Tracking Sheet</CardTitle>
              <p className="text-sm text-slate-500">Auto-aggregated by Company & District from Supabase</p>
            </div>
            <Badge variant="secondary" className="bg-white border-slate-200 text-slate-600">
              <PlayCircle className="h-3 w-3 mr-1 text-green-500" /> Live Data
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-slate-50 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
            <Table className="w-full text-sm text-left border-collapse">
              <TableHeader className="bg-slate-50/80 sticky top-0 z-10 shadow-sm">
                <TableRow className="border-b border-slate-200 hover:bg-transparent">
                  <TableHead className="h-12 px-4 font-bold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap bg-slate-50/90 backdrop-blur border-r border-slate-200/50 min-w-[150px]">Company</TableHead>
                  <TableHead className="h-12 px-4 font-bold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap bg-slate-50/90 backdrop-blur border-r border-slate-200/50 min-w-[120px]">District</TableHead>
                  <TableHead className="h-12 px-4 font-bold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap bg-slate-50/90 backdrop-blur border-r border-slate-200/50 min-w-[120px]">Installer</TableHead>

                  <TableHead className="h-12 px-4 font-bold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap bg-slate-50/90 backdrop-blur border-r border-slate-200/50 text-center min-w-[80px]">Beneficiaries</TableHead>
                  <TableHead className="h-12 px-4 font-bold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap bg-slate-50/90 backdrop-blur border-r border-slate-200/50 text-center min-w-[80px]">Sanction</TableHead>
                  <TableHead className="h-12 px-4 font-bold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap bg-slate-50/90 backdrop-blur border-r border-slate-200/50 text-center min-w-[80px]">Balance</TableHead>

                  {/* Foundation Group */}
                  <TableHead className="h-12 px-2 font-bold text-blue-700 text-xs uppercase tracking-wider whitespace-nowrap bg-blue-50/50 border-r border-blue-100 text-center min-w-[100px]">Fnd. Dispatch</TableHead>
                  <TableHead className="h-12 px-2 font-bold text-blue-700 text-xs uppercase tracking-wider whitespace-nowrap bg-blue-50/50 border-r border-slate-200/50 text-center min-w-[100px]">Fnd. Complete</TableHead>

                  {/* Installation Group */}
                  <TableHead className="h-12 px-2 font-bold text-purple-700 text-xs uppercase tracking-wider whitespace-nowrap bg-purple-50/50 border-r border-purple-100 text-center min-w-[100px]">Inst. Dispatch</TableHead>
                  <TableHead className="h-12 px-2 font-bold text-purple-700 text-xs uppercase tracking-wider whitespace-nowrap bg-purple-50/50 border-r border-slate-200/50 text-center min-w-[100px]">Inst. Complete</TableHead>

                  <TableHead className="h-12 px-4 font-bold text-emerald-700 text-xs uppercase tracking-wider whitespace-nowrap bg-emerald-50/50 text-center min-w-[100px]">Payment Done</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i} className="animate-pulse border-b border-slate-100">
                      {Array.from({ length: 11 }).map((__, j) => (
                        <TableCell key={j} className="p-3">
                          <div className="h-4 bg-slate-100 rounded w-full"></div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-64 text-center text-red-500">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="h-8 w-8" />
                        <p>{error}</p>
                        <Button variant="outline" size="sm" onClick={fetchData} className="mt-2">Try Again</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-64 text-center text-slate-400">
                      No data found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row) => (
                    <TableRow key={row.id} className="group hover:bg-blue-50/50 transition-all duration-200 border-b border-slate-100 last:border-0 hover:shadow-sm cursor-default">
                      <TableCell className="font-medium text-slate-800 border-r border-slate-100">{row.company}</TableCell>
                      <TableCell className="text-slate-600 border-r border-slate-100">{row.district}</TableCell>
                      <TableCell className="text-slate-600 border-r border-slate-100">{row.installer}</TableCell>

                      <TableCell className="text-slate-700 font-semibold text-center border-r border-slate-100 font-mono text-xs">{row.totalBeneficiaries}</TableCell>

                      <TableCell className="text-blue-600 font-semibold text-center border-r border-slate-100 font-mono text-xs bg-blue-50/30">{row.sanction}</TableCell>
                      <TableCell className="text-orange-600 font-semibold text-center border-r border-slate-100 font-mono text-xs">{row.totalBeneficiaries - row.sanction}</TableCell>

                      <TableCell className="text-center border-r border-slate-100 text-slate-600 text-xs">{row.foundationDispatch}</TableCell>
                      <TableCell className="text-center border-r border-slate-100 text-slate-600 text-xs bg-green-50/20">{row.foundationComplete}</TableCell>

                      <TableCell className="text-center border-r border-slate-100 text-slate-600 text-xs">{row.installationDispatch}</TableCell>
                      <TableCell className="text-center border-r border-slate-100 text-slate-600 text-xs bg-green-50/20">{row.installationComplete}</TableCell>

                      <TableCell className="text-center font-bold text-emerald-600 bg-emerald-50/30">{row.paymentDone}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}