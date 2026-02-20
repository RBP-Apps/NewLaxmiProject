import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Hammer, Upload, FileCheck, Pencil, CheckCircle2, Search,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function FoundationPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [isSuccess, setIsSuccess] = useState(false);
  const [pendingItems, setPendingItems] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [isBulk, setIsBulk] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [filters, setFilters] = useState({
    regId: "", village: "", block: "", district: "", pumpCapacity: "", ipName: "",
  });

  const [formData, setFormData] = useState({
    dispatchedPlan: "Done", planDate: "", materialReceived: "Done", materialReceivedDate: "",
    materialChalanLink: null, invoiceNo: "", wayBillNo: "", date: "",
  });

  const getUniquePendingValues = (field) => {
    const values = pendingItems.map((item) => item[field]).filter((v) => v && v !== "-");
    return [...new Set(values)].sort();
  };

  const getUniqueHistoryValues = (field) => {
    const values = historyItems.map((item) => item[field]).filter((v) => v && v !== "-");
    return [...new Set(values)].sort();
  };

  const filteredPendingItems = pendingItems.filter((item) => {
    const matchesSearch = Object.values(item).some((value) =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesFilters =
      (!filters.regId || item.regId === filters.regId) &&
      (!filters.village || item.village === filters.village) &&
      (!filters.block || item.block === filters.block) &&
      (!filters.district || item.district === filters.district) &&
      (!filters.pumpCapacity || item.pumpCapacity === filters.pumpCapacity) &&
      (!filters.ipName || item.ipName === filters.ipName);
    return matchesSearch && matchesFilters;
  });

  const filteredHistoryItems = historyItems.filter((item) => {
    const matchesSearch = Object.values(item).some((value) =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesFilters =
      (!filters.regId || item.regId === filters.regId) &&
      (!filters.village || item.village === filters.village) &&
      (!filters.block || item.block === filters.block) &&
      (!filters.district || item.district === filters.district) &&
      (!filters.pumpCapacity || item.pumpCapacity === filters.pumpCapacity) &&
      (!filters.ipName || item.ipName === filters.ipName);
    return matchesSearch && matchesFilters;
  });

  const handleSelectAll = (checked) => {
    if (checked) {
      const items = activeTab === "history" ? filteredHistoryItems : filteredPendingItems;
      setSelectedRows(items.map((item) => item.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id, checked) => {
    if (checked) {
      setSelectedRows((prev) => [...prev, id]);
    } else {
      setSelectedRows((prev) => prev.filter((rid) => rid !== id));
    }
  };

  useEffect(() => {
    setSelectedRows([]);
    setSelectedItem(null);
  }, [activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch all dispatch_material records
      const { data: dmData, error: dmError } = await supabase.from("dispatch_material").select("*");
      if (dmError) throw dmError;
      if (!dmData) { setPendingItems([]); setHistoryItems([]); return; }

      // 2. Separate dispatch_material into pending reg_ids and history records
      const pendingRegIds = []; // reg_ids where planned_3 NOT NULL and actual_3 IS NULL
      const dmMap = {};         // map reg_id -> dispatch_material row (for pending submission)
      const parsedHistory = [];

      dmData.forEach((row) => {
        const isPlanned3 = row.planned_3 != null && String(row.planned_3).trim() !== "";
        const isActual3 = row.actual_3 != null && String(row.actual_3).trim() !== "";

        const commonData = {
          id: row.id,
          regId: row.reg_id || "-",
          serialNo: row.serial_no || "-",
          beneficiaryName: row.beneficiary_name || "-",
          mobileNumber: row.mobile_number || "-",
          village: row.village || "-",
          pumpCapacity: row.pump_capacity || "-",
          pumpHead: row.pump_head || "-",
          ipName: row.ip_name || "-",
          dispatchedPlan: row.dispatched_plan || "",
          planDate: row.plan_date || "",
          materialReceived: row.material_received || "",
          materialReceivedDate: row.material_received_date || "",
          materialChalanLink: row.material_chalan_link || "",
          invoiceNo: row.invoice_no || "",
          wayBillNo: row.way_bill_no || "",
          date: row.date || "",
          actual3: row.actual_3 || "",
          planned3: row.planned_3 || "",
        };

        if (isPlanned3 && isActual3) {
          // History: both planned_3 and actual_3 are set
          parsedHistory.push(commonData);
        } else if (isPlanned3 && !isActual3) {
          // Pending: planned_3 set but actual_3 not set
          const regId = row.reg_id;
          if (regId) {
            pendingRegIds.push(regId);
            dmMap[regId] = row; // store dispatch_material row for linking
          }
        }
      });

      // 3. Fetch portal records for both pending and history reg_ids
      const allRegIds = [...new Set([...pendingRegIds, ...parsedHistory.map(i => i.regId)])];
      let parsedPending = [];
      if (allRegIds.length > 0) {
        const { data: portalData, error: portalError } = await supabase
          .from("portal")
          .select("*")
          .in("reg_id", allRegIds);
        if (portalError) throw portalError;

        const portalMap = {};
        portalData.forEach(p => portalMap[p.reg_id] = p);

        // Map pending items
        parsedPending = pendingRegIds.map(regId => {
          const row = portalMap[regId] || {};
          const dmRow = dmMap[regId] || {};
          return {
            id: dmRow.id, portalId: row.id, serialNo: row.serial_no || "-", regId: row.reg_id || "-",
            beneficiaryName: row.beneficiary_name || "-", fatherName: row.fathers_name || "-",
            mobileNumber: row.mobile_number || "-", village: row.village || "-", block: row.block || "-",
            district: row.district || "-", pincode: row.pincode || "-", pumpCapacity: row.pump_capacity || "-",
            pumpHead: row.pump_head || "-", ipName: row.ip_name || "-", amount: row.amount || "-",
          };
        });

        // Map history items
        parsedHistory.forEach(item => {
          const p = portalMap[item.regId] || {};
          item.beneficiaryName = p.beneficiary_name || "-";
          item.mobileNumber = p.mobile_number || "-";
          item.village = p.village || "-";
          item.pumpCapacity = p.pump_capacity || "-";
          item.pumpHead = p.pump_head || "-";
          item.ipName = p.ip_name || "-";
        });
      }

      setPendingItems(parsedPending);
      setHistoryItems(parsedHistory);
    } catch (e) {
      console.error("Error fetching data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        setIsDialogOpen(false);
        setTimeout(() => setIsSuccess(false), 300);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess]);

  const handleActionClick = (item) => {
    setSelectedItem(item); setIsBulk(false); setIsSuccess(false);
    setFormData({
      dispatchedPlan: item.dispatchedPlan || "Done",
      planDate: item.planDate || "",
      materialReceived: item.materialReceived || "Done",
      materialReceivedDate: item.materialReceivedDate || "",
      materialChalanLink: item.materialChalanLink || null,
      invoiceNo: item.invoiceNo || "",
      wayBillNo: item.wayBillNo || "",
      date: item.date || "",
    });
    setIsDialogOpen(true);
  };

  const handleBulkClick = () => {
    if (selectedRows.length < 2) return;
    setSelectedItem(null); setIsBulk(true); setIsSuccess(false);
    setFormData({
      dispatchedPlan: "Done", planDate: "", materialReceived: "Done", materialReceivedDate: "",
      materialChalanLink: null, invoiceNo: "", wayBillNo: "", date: "",
    });
    setIsDialogOpen(true);
  };

  const handleFileUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, materialChalanLink: e.target.files[0].name, challanFileObj: e.target.files[0] });
    }
  };

  const getPreviewUrl = (url) => {
    if (!url) return url;
    if (url.includes("/preview")) return url;
    const match = url.match(/[-\w]{25,}/);
    if (!match) return url;
    return `https://drive.google.com/file/d/${match[0]}/preview`;
  };

  const handleSubmit = async () => {
    if (!selectedItem && !isBulk) return;
    setIsSubmitting(true);
    try {
      let finalFileUrl = "";

      // Upload challan to Supabase Storage if file exists
      if (formData.challanFileObj) {
        const file = formData.challanFileObj;
        const filePath = `challan/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("Image_bucket")
          .upload(filePath, file, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("Image_bucket").getPublicUrl(filePath);
        finalFileUrl = urlData.publicUrl;
      }

      const currentItems = activeTab === "history" ? historyItems : pendingItems;
      const itemsToProcess = isBulk
        ? currentItems.filter((item) => selectedRows.includes(item.id))
        : [selectedItem];

      const now = new Date();
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

      const updatePromises = itemsToProcess.map(async (item) => {
        const rowUpdate = {
          dispatched_plan: formData.dispatchedPlan,
          plan_date: formData.planDate || null,
          material_received: formData.materialReceived,
          material_received_date: formData.materialReceivedDate || null,
          invoice_no: formData.invoiceNo,
          way_bill_no: formData.wayBillNo,
          date: formData.date || null,
        };
        // Only set actual_3 if it's not already set (e.g. for new entries)
        if (!item.actual3) {
          const now = new Date();
          const timestampStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
          rowUpdate.actual_3 = timestampStr;
        }
        if (finalFileUrl) rowUpdate.material_chalan_link = finalFileUrl;
        if (!item.id) { console.error("Item ID missing", item); return; }

        const { error } = await supabase.from("dispatch_material").update(rowUpdate).eq("id", item.id).select();
        if (error) throw error;
      });

      await Promise.all(updatePromises);
      await fetchData();
      setIsSuccess(true);
      if (isBulk) setSelectedRows([]);
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to submit data: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearFilters = () => setFilters({ regId: "", village: "", block: "", district: "", pumpCapacity: "", ipName: "" });

  const pendingFilterConfig = [
    { key: "regId", label: "Reg ID" }, { key: "village", label: "Village" },
    { key: "block", label: "Block" }, { key: "district", label: "District" },
    { key: "pumpCapacity", label: "Pump Capacity" }, { key: "ipName", label: "IP Name" },
  ];

  // Portal table columns for Pending tab
  const pendingHeaders = [
    "Reg ID", "Beneficiary Name", "Father's Name", "Mobile Number", "Village",
    "Block", "District", "Pincode", "Pump Capacity", "Pump Head", "IP Name",
  ];

  // History tab: portal columns + dispatch_material fields
  const historyHeaders = [
    "Action", "S.No", "Reg ID", "Beneficiary Name", "Mobile Number", "Village", "Pump Cap", "Pump Head", "IP Name", "Invoice No", "Way Bill No", "Dispatched Plan",
    "Plan Date", "Material Received", "Received Date", "Date", "Challan", "Status"
  ];

  const renderPendingRow = (item, index) => (
    <>
      <TableCell><div className="font-mono text-xs text-slate-500 bg-slate-50 py-1 px-2 rounded-md mx-auto w-fit max-w-[120px] truncate" title={item.regId}>{item.regId}</div></TableCell>
      <TableCell className="whitespace-nowrap font-medium text-slate-800">{item.beneficiaryName}</TableCell>
      <TableCell className="whitespace-nowrap text-slate-600">{item.fatherName}</TableCell>
      <TableCell className="whitespace-nowrap text-slate-600 font-mono">{item.mobileNumber}</TableCell>
      <TableCell className="whitespace-nowrap text-slate-600">{item.village}</TableCell>
      <TableCell className="whitespace-nowrap text-slate-600">{item.block}</TableCell>
      <TableCell className="whitespace-nowrap text-slate-600">{item.district}</TableCell>
      <TableCell className="whitespace-nowrap text-slate-600 font-mono">{item.pincode}</TableCell>
      <TableCell className="whitespace-nowrap text-slate-600">{item.pumpCapacity}</TableCell>
      <TableCell className="whitespace-nowrap text-slate-600">{item.pumpHead}</TableCell>
      <TableCell className="whitespace-nowrap text-slate-600 font-medium">{item.ipName}</TableCell>
    </>
  );

  const renderChallanCell = (link) => {
    if (!link) return <span className="text-slate-400">-</span>;
    if (link.startsWith("http")) return (
      <a href={getPreviewUrl(link)} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs flex items-center justify-center gap-1">
        <FileCheck className="h-4 w-4" /> View
      </a>
    );
    return <span className="text-slate-600 text-xs">{link}</span>;
  };

  const renderHistoryRow = (item, index) => (
    <>
      <TableCell className="px-4">
        <div className="flex justify-center">
          <Checkbox checked={selectedRows.includes(item.id)} onCheckedChange={(checked) => handleSelectRow(item.id, checked)} className="checkbox-3d border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 h-5 w-5 shadow-sm transition-all duration-300 ease-out" />
        </div>
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="sm" onClick={() => handleActionClick(item)} className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 shadow-xs text-xs font-semibold h-8 px-4 rounded-full flex items-center gap-2 transition-all duration-300 mx-auto">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      </TableCell>
      <TableCell className="text-center font-medium text-slate-500 text-xs">{index + 1}</TableCell>
      <TableCell><div className="font-mono text-xs text-slate-500 bg-slate-50 py-1 px-2 rounded-md mx-auto w-fit max-w-[120px] truncate" title={item.regId}>{item.regId}</div></TableCell>
      <TableCell className="whitespace-nowrap font-medium text-slate-800">{item.beneficiaryName}</TableCell>
      <TableCell className="whitespace-nowrap text-slate-600 font-mono text-xs">{item.mobileNumber}</TableCell>
      <TableCell className="whitespace-nowrap text-slate-600">{item.village}</TableCell>
      <TableCell className="whitespace-nowrap text-slate-600 font-medium text-blue-600 uppercase text-xs">{item.pumpCapacity}</TableCell>
      <TableCell className="whitespace-nowrap text-slate-600 text-xs">{item.pumpHead}</TableCell>
      <TableCell className="whitespace-nowrap text-slate-600 font-medium text-xs">{item.ipName}</TableCell>
      <TableCell className="whitespace-nowrap text-slate-600 text-xs">{item.invoiceNo || "-"}</TableCell>
      <TableCell className="whitespace-nowrap text-slate-600 text-xs">{item.wayBillNo || "-"}</TableCell>
      <TableCell className="whitespace-nowrap text-xs">
        {item.dispatchedPlan === "Done" ? (
          <Badge className="bg-green-100 text-green-700 border-green-200 shadow-none hover:bg-green-100">Done</Badge>
        ) : item.dispatchedPlan === "Pending" ? (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 shadow-none hover:bg-yellow-100">Pending</Badge>
        ) : (
          <span className="text-slate-600 text-xs">{item.dispatchedPlan || "-"}</span>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap text-slate-700 text-xs">{item.planDate || "-"}</TableCell>
      <TableCell className="whitespace-nowrap text-xs">
        {item.materialReceived === "Done" ? (
          <Badge className="bg-green-100 text-green-700 border-green-200 shadow-none hover:bg-green-100">Done</Badge>
        ) : item.materialReceived === "Pending" ? (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 shadow-none hover:bg-yellow-100">Pending</Badge>
        ) : (
          <span className="text-slate-600 font-medium text-xs">{item.materialReceived || "-"}</span>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap text-slate-700 text-xs">{item.materialReceivedDate || "-"}</TableCell>
      <TableCell className="whitespace-nowrap text-slate-700 text-xs">{item.date || "-"}</TableCell>
      <TableCell className="whitespace-nowrap bg-blue-50/30">{renderChallanCell(item.materialChalanLink)}</TableCell>
      <TableCell className="whitespace-nowrap">
        <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-200 border-teal-200">Completed</Badge>
      </TableCell>
    </>
  );

  const pendingColCount = pendingHeaders.length + 2; // +2 for checkbox + action
  const historyColCount = historyHeaders.length + 1; // +1 for checkbox (Action is included in historyHeaders?) Wait, let's look at historyHeaders array.
  // historyHeaders[0] is "Action". So +1 for Checkbox.

  return (
    <div className="space-y-8 p-6 md:p-8 max-w-[1600px] mx-auto bg-slate-50/50 min-h-screen animate-fade-in-up">
      <Tabs defaultValue="pending" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 relative p-1 bg-slate-100/80 h-14 rounded-xl border border-slate-200">
          <div className={`absolute top-1 bottom-1 left-1 w-[calc(50%-0.5rem)] rounded-lg bg-white shadow-sm transition-all duration-300 ease-in-out ${activeTab === "history" ? "translate-x-full" : "translate-x-0"}`} />
          <TabsTrigger value="pending" className="z-10 h-full data-[state=active]:bg-transparent data-[state=active]:text-blue-700 data-[state=active]:shadow-none transition-colors duration-200 text-base font-medium text-slate-500">Pending Actions</TabsTrigger>
          <TabsTrigger value="history" className="z-10 h-full data-[state=active]:bg-transparent data-[state=active]:text-blue-700 data-[state=active]:shadow-none transition-colors duration-200 text-base font-medium text-slate-500">History & Records</TabsTrigger>
        </TabsList>

        {/* PENDING TAB */}
        <TabsContent value="pending" className="mt-6 focus-visible:ring-0 focus-visible:outline-none animate-in fade-in-0 slide-in-from-left-4 duration-500 ease-out">
          <Card className="border border-blue-100 shadow-xl shadow-blue-100/20 bg-white/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="border-b border-blue-50 bg-blue-50/30 px-6 py-3 flex flex-col md:flex-row items-center gap-4 md:gap-0 justify-between h-auto min-h-[3.5rem]">
              <div className="flex items-center gap-2 w-full md:w-auto justify-between">
                <CardTitle className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                  <div className="p-1 bg-blue-100 rounded-lg"><Hammer className="h-4 w-4 text-blue-600" /></div>
                  Pending Foundation
                </CardTitle>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-100">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 bg-white border-black focus-visible:ring-blue-200 h-9 transition-all hover:border-blue-200" />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  {selectedRows.length >= 2 && (
                    <Button onClick={handleBulkClick} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 transition-all duration-300 animate-in fade-in slide-in-from-right-4 h-9" size="sm">
                      <Pencil className="h-4 w-4 mr-2" /> Foundation Selected ({selectedRows.length})
                    </Button>
                  )}
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200 px-3 py-1 h-9 flex items-center">{filteredPendingItems.length} Pending</Badge>
                </div>
              </div>
            </CardHeader>

            {/* Filter Dropdowns */}
            <div className="px-6 py-4 bg-slate-50/50 border-b border-blue-50">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {pendingFilterConfig.map(({ key, label }) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs text-slate-600">{label}</Label>
                    <select value={filters[key]} onChange={(e) => setFilters({ ...filters, [key]: e.target.value })} className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="">All</option>
                      {getUniquePendingValues(key).map((val) => (<option key={val} value={val}>{val}</option>))}
                    </select>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={clearFilters} className="mt-3 text-xs">Clear All Filters</Button>
            </div>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="[&_th]:text-center [&_td]:text-center">
                  <TableHeader className="bg-gradient-to-r from-blue-50/50 to-cyan-50/50">
                    <TableRow className="border-b border-blue-100 hover:bg-transparent">
                      <TableHead className="h-14 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap w-12">
                        <div className="flex justify-center">
                          <Checkbox checked={filteredPendingItems.length > 0 && selectedRows.length === filteredPendingItems.length} onCheckedChange={handleSelectAll} className="checkbox-3d border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 h-5 w-5 shadow-sm transition-all duration-300 ease-out" />
                        </div>
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap min-w-[150px]">Action</TableHead>
                      <TableHead className="h-14 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap w-14">S.No</TableHead>
                      {pendingHeaders.map((h) => (
                        <TableHead key={h} className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 6 }).map((_, index) => (
                        <TableRow key={`ps-${index}`} className="animate-pulse">
                          {Array.from({ length: pendingColCount }).map((__, i) => (
                            <TableCell key={i}><div className="h-4 w-full bg-slate-200 rounded mx-auto"></div></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredPendingItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={pendingColCount} className="h-48 text-center text-slate-500 bg-slate-50/30">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center"><Hammer className="h-6 w-6 text-slate-400" /></div>
                            <p>No pending foundation requests found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPendingItems.map((item, index) => (
                        <TableRow key={item.id} className="hover:bg-blue-50/30 transition-colors">
                          <TableCell className="px-4">
                            <div className="flex justify-center">
                              <Checkbox checked={selectedRows.includes(item.id)} onCheckedChange={(checked) => handleSelectRow(item.id, checked)} className="checkbox-3d border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 h-5 w-5 shadow-sm transition-all duration-300 ease-out" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => handleActionClick(item)} disabled={selectedRows.length >= 2} className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 shadow-xs text-xs font-semibold h-8 px-4 rounded-full flex items-center gap-2 transition-all duration-300 mx-auto disabled:opacity-50 disabled:cursor-not-allowed">
                              <Hammer className="h-3.5 w-3.5" /> Process
                            </Button>
                          </TableCell>
                          <TableCell className="text-center font-medium text-slate-500 text-xs">{index + 1}</TableCell>
                          {renderPendingRow(item, index)}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="mt-6 focus-visible:ring-0 focus-visible:outline-none animate-in fade-in-0 slide-in-from-right-4 duration-500 ease-out">
          <Card className="border border-blue-100 shadow-xl shadow-blue-100/20 bg-white/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="border-b border-blue-50 bg-blue-50/30 px-6 py-3 flex flex-col md:flex-row items-center gap-4 md:gap-0 justify-between h-auto min-h-[3.5rem]">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <CardTitle className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                  <div className="p-1 bg-blue-100 rounded-lg"><FileCheck className="h-4 w-4 text-blue-600" /></div>
                  Foundation History
                </CardTitle>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-100">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 bg-white border-black focus-visible:ring-blue-200 h-9 transition-all hover:border-blue-200" />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  {selectedRows.length >= 2 && (
                    <Button onClick={handleBulkClick} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 transition-all duration-300 animate-in fade-in slide-in-from-right-4 h-9" size="sm">
                      <Pencil className="h-4 w-4 mr-2" /> Foundation Selected ({selectedRows.length})
                    </Button>
                  )}
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 px-3 py-1 h-9 flex items-center whitespace-nowrap">{filteredHistoryItems.length} Records</Badge>
                </div>
              </div>
            </CardHeader>

            {/* Filter Dropdowns */}
            <div className="px-6 py-4 bg-slate-50/50 border-b border-blue-50">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {pendingFilterConfig.map(({ key, label }) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs text-slate-600">{label}</Label>
                    <select value={filters[key]} onChange={(e) => setFilters({ ...filters, [key]: e.target.value })} className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="">All</option>
                      {getUniqueHistoryValues(key).map((val) => (<option key={val} value={val}>{val}</option>))}
                    </select>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={clearFilters} className="mt-3 text-xs">Clear All Filters</Button>
            </div>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="[&_th]:text-center [&_td]:text-center">
                  <TableHeader className="bg-gradient-to-r from-blue-50/50 to-cyan-50/50">
                    <TableRow className="border-b border-blue-100 hover:bg-transparent">
                       <TableHead className="h-14 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap w-12">
                        <div className="flex justify-center">
                          <Checkbox checked={filteredHistoryItems.length > 0 && selectedRows.length === filteredHistoryItems.length} onCheckedChange={handleSelectAll} className="checkbox-3d border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 h-5 w-5 shadow-sm transition-all duration-300 ease-out" />
                        </div>
                      </TableHead>
                      {historyHeaders.map((h) => (
                        <TableHead key={h} className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 6 }).map((_, index) => (
                        <TableRow key={`hs-${index}`} className="animate-pulse">
                          {Array.from({ length: historyColCount }).map((__, i) => (
                            <TableCell key={i}><div className="h-4 w-full bg-slate-200 rounded mx-auto"></div></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredHistoryItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={historyColCount} className="h-48 text-center text-slate-500 bg-slate-50/30">
                          {historyItems.length === 0 ? "No foundation history found." : "No history records found matching your search."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredHistoryItems.map((item, index) => (
                        <TableRow key={item.id} className="hover:bg-blue-50/30 transition-colors">{renderHistoryRow(item, index)}</TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* FOUNDATION DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent showCloseButton={!isSuccess} className={`max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isSuccess ? "bg-transparent !shadow-none !border-none" : ""}`}>
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center w-full p-8 text-center space-y-6 animate-in fade-in duration-300">
              <div className="rounded-full bg-white p-5 shadow-2xl shadow-white/20 ring-8 ring-white/10 animate-in zoom-in duration-500 ease-out">
                <CheckCircle2 className="h-16 w-16 text-green-600 scale-110" />
              </div>
              <h2 className="text-3xl font-bold text-white drop-shadow-md animate-in slide-in-from-bottom-4 fade-in duration-500 delay-150 ease-out tracking-wide">Submitted Successfully!</h2>
            </div>
          ) : (
            <>
              <DialogHeader className="p-6 pb-2 border-b border-blue-100 bg-blue-50/30">
                <DialogTitle className="text-xl font-bold bg-linear-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent flex items-center gap-2">
                  <span className="bg-blue-100 p-1.5 rounded-md"><Hammer className="h-4 w-4 text-blue-600" /></span>
                  Process Foundation Work
                </DialogTitle>
                <DialogDescription className="text-slate-500 ml-10">
                  {isBulk ? (
                    <span>Applying changes to <span className="font-bold text-blue-700">{selectedRows.length} selected items</span>.</span>
                  ) : (
                    <span>Processing foundation for <span className="font-semibold text-slate-700">{selectedItem?.beneficiaryName}</span> <span className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded text-slate-600 border border-slate-200">{selectedItem?.regId}</span></span>
                  )}
                </DialogDescription>
              </DialogHeader>

              {(selectedItem || isBulk) && (
                <>
                  <div className="p-6 space-y-6">
                    {(isBulk || selectedItem) && (
                      <div className="rounded-xl border border-blue-100 bg-linear-to-br from-blue-50/50 to-cyan-50/30 p-5 shadow-sm">
                        <h3 className="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2 border-b border-blue-100 pb-2">
                          <span className="bg-white p-1 rounded shadow-sm"><CheckCircle2 className="h-4 w-4 text-blue-500" /></span>
                          BENEFICIARY DETAILS
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-5 gap-x-6">
                          {[
                            { label: "Reg ID", value: isBulk ? "Multiple" : selectedItem?.regId, mono: true },
                            { label: "Beneficiary Name", value: isBulk ? "Multiple" : selectedItem?.beneficiaryName },
                            { label: "Village & Block", value: isBulk ? "Multiple" : `${selectedItem?.village}, ${selectedItem?.block}` },
                            { label: "District", value: isBulk ? "Multiple" : selectedItem?.district },
                            { label: "Pump Capacity", value: isBulk ? "Multiple" : selectedItem?.pumpCapacity },
                            { label: "Pump Head", value: isBulk ? "Multiple" : selectedItem?.pumpHead },
                            { label: "IP Name", value: isBulk ? "Multiple" : selectedItem?.ipName },
                            { label: "Mobile", value: isBulk ? "Multiple" : selectedItem?.mobileNumber, mono: true },
                          ].map(({ label, value, mono }) => (

                            <div key={label} className="space-y-1">
                              <span className="text-[10px] uppercase font-bold text-blue-900/60 block mb-1">{label}</span>
                              <p className={`font-medium text-slate-700 ${mono ? "font-mono break-all" : ""}`}>{value || "-"}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-5 w-1 bg-cyan-500 rounded-full"></div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Work Details</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700">Dispatched Plan</Label>
                          <select value={formData.dispatchedPlan} onChange={(e) => setFormData({ ...formData, dispatchedPlan: e.target.value })} className="h-10 w-full border border-slate-200 rounded-md px-3 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-100 focus:border-cyan-400 transition-all">
                            <option value="Done">Done</option>
                            <option value="Pending">Pending</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700">Plan Date</Label>
                          <Input type="date" value={formData.planDate} onChange={(e) => setFormData({ ...formData, planDate: e.target.value })} className="h-10 border-slate-200 focus:border-cyan-400 focus-visible:ring-cyan-100 transition-all bg-white" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700">Material Received Status</Label>
                          <select value={formData.materialReceived} onChange={(e) => setFormData({ ...formData, materialReceived: e.target.value })} className="h-10 w-full border border-slate-200 rounded-md px-3 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-100 focus:border-cyan-400 transition-all">
                            <option value="Done">Done</option>
                            <option value="Pending">Pending</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700">Material Received Date</Label>
                          <Input type="date" value={formData.materialReceivedDate} onChange={(e) => setFormData({ ...formData, materialReceivedDate: e.target.value })} className="h-10 border-slate-200 focus:border-cyan-400 focus-visible:ring-cyan-100 transition-all bg-white" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700">Invoice No</Label>
                          <Input value={formData.invoiceNo} onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })} placeholder="Enter invoice number" className="h-10 border-slate-200 focus:border-cyan-400 focus-visible:ring-cyan-100 transition-all bg-white" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700">Way Bill No</Label>
                          <Input value={formData.wayBillNo} onChange={(e) => setFormData({ ...formData, wayBillNo: e.target.value })} placeholder="Enter way bill number" className="h-10 border-slate-200 focus:border-cyan-400 focus-visible:ring-cyan-100 transition-all bg-white" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700">Date</Label>
                          <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="h-10 border-slate-200 focus:border-cyan-400 focus-visible:ring-cyan-100 transition-all bg-white" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700">Upload Challan</Label>
                          <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 bg-slate-50/50 flex flex-col items-center justify-center gap-1 hover:bg-slate-50 transition-all cursor-pointer group border-blue-100/50 hover:border-blue-200 h-24" onClick={() => document.getElementById("challan-file")?.click()}>
                            <div className="h-8 w-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                              <Upload className="h-4 w-4 text-blue-500" />
                            </div>
                            <span className="text-xs font-medium text-slate-600 group-hover:text-blue-600 transition-colors w-full text-center truncate px-2">{formData.materialChalanLink || "Click to Upload"}</span>
                            <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} className="hidden" id="challan-file" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 pb-6 pr-6">
                    <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="h-10 px-6 text-slate-600 hover:text-slate-800 hover:bg-slate-100/50" disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleSubmit} className="h-10 px-6 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-md transition-all hover:shadow-lg" disabled={isSubmitting}>
                      {isSubmitting ? "Processing..." : "Complete Foundation"}
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
