import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, RefreshCw, AlertCircle, Clock, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardColumns } from "./columns";

export default function DashboardPage() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch all required tables in parallel
      const [
        { data: portalData, error: portalError },
        { data: surveyData, error: surveyError },
        { data: dmData, error: dmError },
        { data: insData, error: insError },
        { data: updateData, error: updateError },
        { data: invData, error: invError },
        { data: shareData, error: shareError },
        { data: insuranceData, error: insuranceError },
        { data: paymentData, error: paymentError },
      ] = await Promise.all([
        supabase.from("portal").select("*"),
        supabase.from("survey").select("reg_id, actual_2"),
        supabase.from("dispatch_material").select("reg_id, dispatched_plan, plan_date, material_received, material_received_date"),
        supabase.from("installation").select("reg_id, actual_4"),
        supabase.from("portal_update").select("*"), // Need many fields
        supabase.from("invoicing").select("*"),
        supabase.from("beneficiary_share").select("reg_id, actual_9, farmer_share_amt, state_share_amt"),
        supabase.from("insurance").select("reg_id, scada_insurance_upload"),
        supabase.from("ip_payment").select("reg_id, bill_send_date"),
      ]);

      if (portalError) throw portalError;
      if (surveyError) throw surveyError;
      if (dmError) throw dmError;
      if (insError) throw insError;
      if (updateError) throw updateError;
      if (invError) throw invError;
      if (shareError) throw shareError;
      if (insuranceError) throw insuranceError;
      if (paymentError) throw paymentError;

      // 2. Build Lookup Maps (Key: String(reg_id).trim())
      const createMap = (dataset, keyField = "reg_id") => {
        const map = new Map();
        (dataset || []).forEach(item => {
          const key = String(item[keyField] || "").trim();
          if (key) map.set(key, item);
        });
        return map;
      };

      const surveyMap = createMap(surveyData);
      const dmMap = createMap(dmData);
      const insMap = createMap(insData);
      const updateMap = createMap(updateData);
      const invMap = createMap(invData);
      const shareMap = createMap(shareData);
      const insuranceMap = createMap(insuranceData);
      const paymentMap = createMap(paymentData);

      // 3. Aggregate Data
      const aggMap = new Map(); // Key: "IP|District"

      portalData.forEach(portal => {
        // Normalize Key Fields
        const ip = (portal["IP Name"] || portal.ip_name || portal.installer_name || "Unknown").trim();
        const district = (portal["District"] || portal.district || "Unknown").trim();
        const regId = String(portal["Reg ID"] || portal.reg_id || "").trim();

        if (!regId) return; // Skip invalid rows

        const key = `${ip}|${district}`;

        if (!aggMap.has(key)) {
          aggMap.set(key, {
            id: key,
            ipName: ip,
            district: district,
            target: 0,
            surveyDone: 0,
            dispatchPlanDone: 0,
            dispatchPlanDateCount: 0,
            materialDispatchDone: 0,
            materialDispatchDateCount: 0,
            installationDone: 0,
            photoUploadedMaster: 0,
            upadSupplyDateCount: 0,
            upPortalPhotoUploaded: 0,
            invoiceDone: 0,
            laxmiInvoiceDone: 0,
            jcrCompleted: 0,
            totalJcrSubmitted: 0,
            farmerShare: 0,
            stateShare: 0,
            insuranceUploaded: 0,
            scadaLotDone: 0,
            rmsMappingDone: 0,
            sevenDaysVerification: 0,
          });
        }

        const entry = aggMap.get(key);
        entry.target++; // Count of Reg IDs

        // -- Survey Done --
        // survey.actual_2
        const sRow = surveyMap.get(regId);
        if (sRow && sRow.actual_2) entry.surveyDone++;

        // -- Dispatch Fields --
        const dmRow = dmMap.get(regId);
        if (dmRow) {
          if (dmRow.dispatched_plan === "Done") entry.dispatchPlanDone++;
          if (dmRow.plan_date) entry.dispatchPlanDateCount++;
          if (dmRow.material_received === "Done") entry.materialDispatchDone++;
          if (dmRow.material_received_date) entry.materialDispatchDateCount++;
        }

        // -- Installation Done --
        // installation.actual_4
        const insRow = insMap.get(regId);
        if (insRow && insRow.actual_4) entry.installationDone++;

        // -- Portal Update Fields --
        const upRow = updateMap.get(regId);
        if (upRow) {
          if (upRow.photo_link) entry.photoUploadedMaster++;
          if (upRow.supply_aapurti_date) entry.upadSupplyDateCount++;
          // "UP PORTAL PHOTO UPLODED" -> check photo_rms_data_pending column?
          // Based on user request "count of Photo Uploded on UPAD APP", let's assume photo_rms_data_pending or similar
          // Actually, "UP PORTAL PHOTO UPLODED" likely refers to 'photo_rms_data_pending' field being filled/done
          // Or is it 'photo_link'? No, user asked specific columns. 
          // Re-reading map: "count of 'Photo Uploded on UPAD APP'" -> usually implies a specific column.
          // In portal_update we have 'photo_rms_data_pending'. Let's use that if distinct from 'photo_link'.
          if (upRow.photo_rms_data_pending) entry.upPortalPhotoUploaded++;

          if (upRow.scadalot_creation === "Done") entry.scadaLotDone++;
          if (upRow.rms_data_mail_to_rotommag === "Done") entry.rmsMappingDone++;
          if (upRow.days_7_verification === "Done") entry.sevenDaysVerification++;
        }

        // -- Invoicing --
        const invRow = invMap.get(regId);
        if (invRow) {
          if (invRow.raisoni_invoice_no) entry.invoiceDone++;
          if (invRow.laxmi_invoice_no) entry.laxmiInvoiceDone++;
        }

        // -- Shares & JCR --
        const shareRow = shareMap.get(regId);
        if (shareRow) {
          if (shareRow.actual_9) entry.jcrCompleted++;
          // Sum financial shares
          const farmer = parseFloat(shareRow.farmer_share_amt) || 0;
          const state = parseFloat(shareRow.state_share_amt) || 0;
          entry.farmerShare += farmer;
          entry.stateShare += state;
        }

        // -- IP Payment (JCR Submit Date) --
        const payRow = paymentMap.get(regId);
        // "TOTAL JCR SUBMITTED" -> count of "JCR Submit Date" or "bill_send_date"
        if (payRow && payRow.bill_send_date) entry.totalJcrSubmitted++;

        // -- Insurance --
        const insuRow = insuranceMap.get(regId);
        if (insuRow && insuRow.scada_insurance_upload === "Done") entry.insuranceUploaded++;

      });

      // 4. Calculate Derived Columns & Sort
      const processedData = Array.from(aggMap.values())
        .sort((a, b) => a.ipName.localeCompare(b.ipName) || a.district.localeCompare(b.district))
        .map((item, index) => ({
          ...item,
          sNo: index + 1,
          surveyPending: item.target - item.surveyDone,
          balanceDispatchPlan: item.target - item.dispatchPlanDone,
          installationPending: item.target - item.installationDone,
          photoRmsPending: item.installationDone - item.photoUploadedMaster,
          upPortalPhotoPending: item.installationDone - item.upPortalPhotoUploaded,
          invoicePending: item.installationDone - item.invoiceDone,
          jcrPending: item.installationDone - item.jcrCompleted,
        }));

      setData(processedData);
      setLastUpdated(new Date());

    } catch (err) {
      console.error("Dashboard Aggregation Error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // -- Render Helper --
  const formatValue = (val, format) => {
    if (format === "currency") {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
    }
    return val;
  }

  return (
    <div className="space-y-6 p-6 md:p-8 animate-fade-in-up min-h-screen bg-slate-50/50">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
            Master Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Aggregated Live Data
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
            className="border-slate-200 hover:bg-white hover:text-blue-600 hover:border-blue-300 transition-all"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="border border-slate-200 shadow-lg shadow-slate-200/50 bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-800">Summary Report</CardTitle>
            <Badge variant="secondary" className="bg-white border-slate-200 text-slate-600">
              <PlayCircle className="h-3 w-3 mr-1 text-green-500" /> {data.length} Records
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[80vh] relative">
            <Table className="w-full text-xs border-collapse">
              <TableHeader className="sticky top-0 z-30 shadow-sm bg-slate-50">
                <TableRow className="border-b border-slate-200 hover:bg-transparent">
                  {dashboardColumns.map((col, idx) => (
                    <TableHead
                      key={idx}
                      className={cn(
                        "h-12 px-2 font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap border-r border-slate-200/50 bg-slate-50",
                        col.className
                      )}
                    >
                      {col.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i} className="animate-pulse border-b border-slate-100">
                      {dashboardColumns.map((_, j) => (
                        <TableCell key={j} className="p-3">
                          <div className="h-4 bg-slate-100 rounded w-full"></div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={dashboardColumns.length} className="h-64 text-center text-red-500">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="h-8 w-8" />
                        <p>{error}</p>
                        <Button variant="outline" size="sm" onClick={fetchData} className="mt-2">Try Again</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={dashboardColumns.length} className="h-64 text-center text-slate-400">
                      No data found.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {/* Totals Row */}
                    <TableRow className="bg-slate-100/80 font-bold border-b-2 border-slate-300 hover:bg-slate-200/50 sticky top-12 z-20">
                      <TableCell className="text-center sticky left-0 bg-slate-100 z-20"></TableCell>
                      <TableCell className="sticky left-12 bg-slate-100 z-20">Total</TableCell>
                      <TableCell className="sticky left-[212px] bg-slate-100 z-20"></TableCell>
                      {dashboardColumns.slice(3).map((col, i) => (
                        <TableCell key={i} className={cn("border-r border-slate-300 px-2 py-3", col.className?.includes("text-right") ? "text-right" : "text-center")}>
                           {formatValue(data.reduce((sum, row) => sum + (Number(row[col.accessor]) || 0), 0), col.format)}
                        </TableCell>
                      ))}
                    </TableRow>

                    {/* Data Rows */}
                    {data.map((row) => (
                      <TableRow key={row.id} className="group hover:bg-blue-50/30 transition-colors border-b border-slate-100 last:border-0">
                        {dashboardColumns.map((col, idx) => (
                          <TableCell
                            key={idx}
                            className={cn(
                              "border-r border-slate-100 px-2 py-2 truncate max-w-[200px]",
                              col.className
                            )}
                            title={row[col.accessor]}
                          >
                            {formatValue(row[col.accessor], col.format)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}