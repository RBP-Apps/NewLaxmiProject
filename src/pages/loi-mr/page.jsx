import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, FileCheck, Upload, CheckCircle2, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function LoiMrPage() {
  const [pendingItems, setPendingItems] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [isBulk, setIsBulk] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [ipOptions, setIpOptions] = useState([]); // Master dropdown options

  // Format date/timestamp to DD/MM/YYYY
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const [filters, setFilters] = useState({
    regId: "",
    village: "",
    block: "",
    district: "",
    pumpType: "",
    company: "",
  });

  const getUniquePendingValues = (field) => {
    const values = pendingItems
      .map((item) => item[field])
      .filter((v) => v && v !== "-");
    return [...new Set(values)].sort();
  };

  const getUniqueHistoryValues = (field) => {
    const values = historyItems
      .map((item) => item[field])
      .filter((v) => v && v !== "-");
    return [...new Set(values)].sort();
  };

  // const filteredPendingItems = pendingItems.filter((item) =>
  //   Object.values(item).some((value) =>
  //     String(value).toLowerCase().includes(searchTerm.toLowerCase())
  //   )
  // )

  // const filteredHistoryItems = historyItems.filter((item) =>
  //   Object.values(item).some((value) =>
  //     String(value).toLowerCase().includes(searchTerm.toLowerCase())
  //   )
  // )

  const filteredPendingItems = pendingItems.filter((item) => {
    const matchesSearch = Object.values(item).some((value) =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const matchesFilters =
      (!filters.regId || item.regId === filters.regId) &&
      (!filters.village || item.village === filters.village) &&
      (!filters.block || item.block === filters.block) &&
      (!filters.district || item.district === filters.district) &&
      (!filters.pumpType || item.pumpType === filters.pumpType) &&
      (!filters.company || item.company === filters.company);

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
      (!filters.pumpType || item.pumpType === filters.pumpType) &&
      (!filters.company || item.company === filters.company);

    return matchesSearch && matchesFilters;
  });

  const handleSelectAll = (checked) => {
    if (checked) {
      const items = activeTab === "history" ? filteredHistoryItems : filteredPendingItems;
      const idField = activeTab === "history" ? "regId" : "serialNo"; // History uses regId as key, Pending uses serialNo
      setSelectedRows(items.map((item) => item[idField]));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id, checked) => {
    if (checked) {
      setSelectedRows((prev) => [...prev, id]);
    } else {
      setSelectedRows((prev) => prev.filter((rowId) => rowId !== id));
    }
  };

  // Clear selection when switching tabs
  useEffect(() => {
    setSelectedRows([]);
    setSelectedItem(null);
  }, [activeTab]);

  // Form state for processing
  const [formData, setFormData] = useState({
    beneficiaryName: "",
    company: "",
    workOrderNo: "",
    workOrderDate: "",
    workOrderFile: null,
    workOrderFileObj: null,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Fetch data from Supabase
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch from portal, work_order, and master_dropdown tables
      const [portalRes, workOrderRes, masterRes] = await Promise.all([
        supabase.from("portal").select("*"),
        supabase.from("work_order").select("*"),
        supabase.from("master_dropdown").select("*"),
      ]);

      if (portalRes.error) throw portalRes.error;
      if (workOrderRes.error) throw workOrderRes.error;

      const portalData = portalRes.data || [];
      const workOrderData = workOrderRes.data || [];
      const masterData = masterRes.data || [];

      // Extract IP Name options from master_dropdown
      const extractedIpOptions = masterData
        .map((m) => m.installer_name || m.name || m.value || m.label)
        .filter(Boolean);
      const uniqueIpOptions = [...new Set(extractedIpOptions)].sort();
      setIpOptions(uniqueIpOptions);

      // Create a lookup map from portal by reg_id for enrichment
      const portalMap = {};
      portalData.forEach((p) => {
        if (p.reg_id) portalMap[p.reg_id] = p;
      });

      const parsedPending = [];
      const parsedHistory = [];

      // Pending & History both come from work_order table
      workOrderData.forEach((wo) => {
        const portal = portalMap[wo.reg_id] || {};

        const item = {
          regId: wo.reg_id || "-",
          serialNo: wo.serial_no || portal.serial_no || "-",
          beneficiaryName: portal.beneficiary_name || "-",
          fatherName: portal.fathers_name || "-",
          mobileNumber: portal.mobile_number || "-",
          village: portal.village || "-",
          block: portal.block || "-",
          district: portal.district || "-",
          pumpCapacity: portal.pump_capacity || "-",
          pumpHead: portal.pump_head || "-",
          pumpType: portal.pump_capacity || "-",
          company: portal.ip_name || "-",
          ipName: portal.ip_name || "-",
          pincode: portal.pincode || "-", // Mapped from portal data
          installer: portal.installer || portal.installer_name || portal["Installer Name"] || "-",
          // Fields from work_order
          workOrderNo: wo.work_order_no || "",
          workOrderDate: wo.work_order_date || "",
          workOrderFile: wo.work_order_file || "",
          actual1: wo.actual_1 || "",
          planned1: wo.planned_1 || "",
        };

        const isPlannedFilled = item.planned1 && String(item.planned1).trim() !== "";
        const isActualFilled = item.actual1 && String(item.actual1).trim() !== "";

        // Pending: planned_1 NOT NULL, actual_1 NULL (in work_order)
        // History: planned_1 NOT NULL AND actual_1 NOT NULL (in work_order)
        if (isPlannedFilled && !isActualFilled) {
          parsedPending.push(item);
        } else if (isPlannedFilled && isActualFilled) {
          parsedHistory.push(item);
        }
      });

      setPendingItems(parsedPending);
      setHistoryItems(parsedHistory);
      setIsLoaded(true);
    } catch (e) {
      console.error("Error fetching data:", e);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);

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
    setSelectedItem(item);
    setIsBulk(false);
    setIsSuccess(false);
    setFormData({
      beneficiaryName: item.beneficiaryName,
      company: item.company || item.ipName || "",
      workOrderNo: item.workOrderNo || "",
      workOrderDate: item.workOrderDate || "",
      workOrderFile: item.workOrderFile || null,
      workOrderFileObj: null,
    });
    setIsDialogOpen(true);
  };

  const handleBulkClick = () => {
    if (selectedRows.length < 2) return;
    setSelectedItem(null);
    setIsBulk(true);
    setIsSuccess(false);
    setFormData({
      beneficiaryName: "Multiple Beneficiaries",
      company: "Multiple Companies",
      workOrderNo: "",
      workOrderDate: "",
      workOrderFile: null,
      workOrderFileObj: null,
    });
    setIsDialogOpen(true);
  };

  const handleFileUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData({
        ...formData,
        workOrderFile: file.name,
        workOrderFileObj: file,
      });
    }
  };

  // Format date as YYYY-MM-DD HH:mm:ss
  const formatDateTime = (date) => {
    const pad = (n) => String(n).padStart(2, "0");

    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
        date.getDate()
      )} ` +
      `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
        date.getSeconds()
      )}`
    );
  };

  const handleSubmit = async () => {
    if (!selectedItem && !isBulk) return;
    setIsSubmitting(true);

    try {
      let finalFileUrl = "";

      // 1. Upload File to Supabase Storage
      if (formData.workOrderFileObj) {
        const file = formData.workOrderFileObj;
        const filePath = `work-order-documents/${Date.now()}_${file.name}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("Image_bucket")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("Image_bucket")
          .getPublicUrl(filePath);

        finalFileUrl = urlData?.publicUrl || "";
      }

      // 2. Prepare Data Update for work_order table
      const currentItems = activeTab === "history" ? historyItems : pendingItems;
      const idField = activeTab === "history" ? "regId" : "serialNo";

      const itemsToProcess = isBulk
        ? currentItems.filter((item) => selectedRows.includes(item[idField]))
        : [selectedItem];

      const updatePromises = itemsToProcess.map(async (item) => {
        const rowUpdate = {
          work_order_no: formData.workOrderNo,
          work_order_date: formData.workOrderDate || null,
          actual_1: formatDateTime(new Date()),
        };

        if (finalFileUrl) rowUpdate.work_order_file = finalFileUrl;

        if (!item.regId || item.regId === "-") {
          console.error("Item reg_id missing for update", item);
          return;
        }

        // Update work_order table
        const { error: woError } = await supabase
          .from("work_order")
          .update(rowUpdate)
          .eq("reg_id", item.regId);

        if (woError) throw woError;
      });

      const results = await Promise.allSettled(updatePromises);

      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length > 0) {
        const firstError = failed[0].reason;
        console.error("Bulk update failed:", firstError);

        if (firstError?.code === '23505' || firstError?.message?.includes('duplicate key')) {
          alert("Error: Work Order Number already exists.\n\nIt seems 'Work Order No' must be unique in your database.\nTo assign the SAME Work Order No to multiple beneficiaries, please remove the UNIQUE constraint from the 'work_order_no' column in your Supabase table settings.");
        } else {
          alert(`Error updating records: ${firstError.message || "Unknown error"}`);
        }
      } else {
        setIsSuccess(true);
        fetchData();
        if (isBulk) setSelectedRows([]); // Clear selection after bulk process
      }

    } catch (error) {
      console.error(error);
      alert("An unexpected error occurred: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 p-6 md:p-8 max-w-[1600px] mx-auto bg-slate-50/50 min-h-screen animate-fade-in-up">
      <Tabs
        defaultValue="pending"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 relative p-1 bg-slate-100/80 h-14 rounded-xl border border-slate-200">
          <div
            className={`absolute top-1 bottom-1 left-1 w-[calc(50%-0.5rem)] rounded-lg bg-white shadow-sm transition-all duration-300 ease-in-out ${activeTab === "history" ? "translate-x-full" : "translate-x-0"
              }`}
          />
          <TabsTrigger
            value="pending"
            className="z-10 h-full data-[state=active]:bg-transparent data-[state=active]:text-blue-700 data-[state=active]:shadow-none transition-colors duration-200 text-base font-medium text-slate-500"
          >
            Pending LOI & MR
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="z-10 h-full data-[state=active]:bg-transparent data-[state=active]:text-blue-700 data-[state=active]:shadow-none transition-colors duration-200 text-base font-medium text-slate-500"
          >
            Processed History
          </TabsTrigger>
        </TabsList>

        {/* PENDING TAB */}
        <TabsContent
          value="pending"
          className="mt-6 focus-visible:outline-hidden"
        >
          <Card className="border border-blue-100 shadow-xl shadow-blue-100/20 bg-white/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="border-b border-blue-50 bg-blue-50/30 px-6 py-3 flex flex-col md:flex-row items-center gap-4 md:gap-0 justify-between h-auto min-h-[3.5rem]">
              <div className="flex items-center gap-2 w-full md:w-auto justify-between">
                <CardTitle className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                  <div className="p-1 bg-blue-100 rounded-lg">
                    <FileCheck className="h-4 w-4 text-blue-600" />
                  </div>
                  Pending LOI & MR
                </CardTitle>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-100">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-white border-black focus-visible:ring-blue-200 h-9 transition-all hover:border-blue-200"
                  />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  {selectedRows.length >= 2 && (
                    <Button
                      onClick={handleBulkClick}
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 transition-all duration-300 animate-in fade-in slide-in-from-right-4 h-9"
                      size="sm"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Process Selected ({selectedRows.length})
                    </Button>
                  )}
                  <Badge
                    variant="outline"
                    className="bg-yellow-100 text-yellow-700 border-yellow-200 px-3 py-1 h-9 flex items-center"
                  >
                    {filteredPendingItems.length} Pending
                  </Badge>
                </div>
              </div>
            </CardHeader>

            {/* Filter Dropdowns */}
            <div className="px-6 py-4 bg-slate-50/50 border-b border-blue-50">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                  { key: "regId", label: "Reg ID" },
                  { key: "village", label: "Village" },
                  { key: "block", label: "Block" },
                  { key: "district", label: "District" },
                  { key: "pumpType", label: "Pump Type" },
                  { key: "company", label: "Company" },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs text-slate-600">{label}</Label>
                    <select
                      value={filters[key]}
                      onChange={(e) =>
                        setFilters({ ...filters, [key]: e.target.value })
                      }
                      className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">All</option>
                      {getUniquePendingValues(key).map((val) => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setFilters({
                    regId: "",
                    village: "",
                    block: "",
                    district: "",
                    pumpType: "",
                    company: "",
                  })
                }
                className="mt-3 text-xs"
              >
                Clear All Filters
              </Button>
            </div>

            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[70vh] overflow-y-auto relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <Table className="[&_th]:text-center [&_td]:text-center">
                  <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-blue-50 shadow-sm">
                    <TableRow className="border-b border-blue-100 hover:bg-transparent">
                      <TableHead className="h-14 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap w-12">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={
                              filteredPendingItems.length > 0 &&
                              selectedRows.length ===
                              filteredPendingItems.length
                            }
                            onCheckedChange={handleSelectAll}
                            aria-label="Select all rows"
                            className="checkbox-3d border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 h-5 w-5 shadow-sm transition-all duration-300 ease-out"
                          />
                        </div>
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap w-32">
                        Action
                      </TableHead>
                      <TableHead className="h-14 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap w-14">S.No</TableHead>

                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Reg ID
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Beneficiary Name
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Father's Name
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Mobile Number
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Village
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Block
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        District
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Pincode
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Pump Capacity
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Pump Head
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        IP Name
                      </TableHead>

                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 8 }).map((_, index) => (
                        <TableRow
                          key={`skeleton-${index}`}
                          className="animate-pulse"
                        >
                          <TableCell>
                            <div className="h-4 w-20 bg-slate-200 rounded mx-auto"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-12 bg-slate-200 rounded mx-auto"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-24 bg-slate-200 rounded mx-auto"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-32 bg-slate-200 rounded mx-auto"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-28 bg-slate-200 rounded mx-auto"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-24 bg-slate-200 rounded mx-auto"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-24 bg-slate-200 rounded mx-auto"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-24 bg-slate-200 rounded mx-auto"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-16 bg-slate-200 rounded mx-auto"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-20 bg-slate-200 rounded mx-auto"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-20 bg-slate-200 rounded mx-auto"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-24 bg-slate-200 rounded mx-auto"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-20 bg-slate-200 rounded mx-auto"></div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : filteredPendingItems.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={14}
                          className="h-32 text-center text-muted-foreground"
                        >
                          No pending items found matching your search.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPendingItems.map((item) => (
                        <TableRow
                          key={item.serialNo}
                          className="hover:bg-blue-50/50 transition-colors"
                        >
                          <TableCell className="px-4">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={selectedRows.includes(item.serialNo)}
                                onCheckedChange={(checked) =>
                                  handleSelectRow(item.serialNo, checked)
                                }
                                aria-label={`Select row ${item.serialNo}`}
                                className="checkbox-3d border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 h-5 w-5 shadow-sm transition-all duration-300 ease-out active:scale-75 hover:scale-110 data-[state=checked]:scale-110"
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleActionClick(item)}
                              disabled={selectedRows.length >= 2}
                              className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 shadow-xs text-xs font-semibold h-8 px-4 rounded-full flex items-center gap-2 transition-all duration-300 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Process
                            </Button>
                          </TableCell>
                          <TableCell className="text-center font-medium text-slate-500 text-xs">{filteredPendingItems.indexOf(item) + 1}</TableCell>

                          <TableCell className="text-slate-600 font-mono text-xs">
                            {item.regId}
                          </TableCell>
                          <TableCell className="font-medium text-slate-800">
                            {item.beneficiaryName}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {item.fatherName}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {item.mobileNumber}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {item.village}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {item.block}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {item.district}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {item.pincode}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {item.pumpCapacity}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {item.pumpHead}
                          </TableCell>
                          <TableCell className="text-slate-600 font-medium">
                            {item.company}
                          </TableCell>

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
        <TabsContent
          value="history"
          className="mt-6 focus-visible:outline-hidden"
        >
          <Card className="border border-blue-100 shadow-xl shadow-blue-100/20 bg-white/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="border-b border-blue-50 bg-blue-50/30 px-6 py-3 flex flex-col md:flex-row items-center gap-4 md:gap-0 justify-between h-auto min-h-[3.5rem]">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <CardTitle className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                  <div className="p-1 bg-blue-100 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  </div>
                  Processed History
                </CardTitle>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-100">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-white border-black focus-visible:ring-blue-200 h-9 transition-all hover:border-blue-200"
                  />
                  </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  {selectedRows.length >= 2 && (
                    <Button
                      onClick={handleBulkClick}
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 transition-all duration-300 animate-in fade-in slide-in-from-right-4 h-9"
                      size="sm"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Process Selected ({selectedRows.length})
                    </Button>
                  )}
                  <Badge
                    variant="outline"
                    className="bg-blue-100 text-blue-700 border-blue-200 px-3 py-1 h-9 flex items-center whitespace-nowrap"
                  >
                    {filteredHistoryItems.length} Records
                  </Badge>
                </div>
              </div>
            </CardHeader>

            {/* Filter Dropdowns */}
            <div className="px-6 py-4 bg-slate-50/50 border-b border-blue-50">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                  { key: "regId", label: "Reg ID" },
                  { key: "village", label: "Village" },
                  { key: "block", label: "Block" },
                  { key: "district", label: "District" },
                  { key: "pumpType", label: "Pump Type" },
                  { key: "company", label: "Company" },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs text-slate-600">{label}</Label>
                    <select
                      value={filters[key]}
                      onChange={(e) =>
                        setFilters({ ...filters, [key]: e.target.value })
                      }
                      className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">All</option>
                      {getUniqueHistoryValues(key).map((val) => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setFilters({
                    regId: "",
                    village: "",
                    block: "",
                    district: "",
                    pumpType: "",
                    company: "",
                  })
                }
                className="mt-3 text-xs"
              >
                Clear All Filters
              </Button>
            </div>
            <CardContent className="p-0">
              <div className="hidden md:block overflow-x-auto max-h-[70vh] overflow-y-auto relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <Table className="[&_th]:text-center [&_td]:text-center">
                  <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-blue-50 shadow-sm">
                    <TableRow className="border-b border-blue-100 hover:bg-transparent">
                      <TableHead className="h-14 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap w-12">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={
                              filteredHistoryItems.length > 0 &&
                              selectedRows.length ===
                              filteredHistoryItems.length
                            }
                            onCheckedChange={handleSelectAll}
                            aria-label="Select all rows"
                            className="checkbox-3d border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 h-5 w-5 shadow-sm transition-all duration-300 ease-out"
                          />
                        </div>
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Action
                      </TableHead>
                      <TableHead className="h-14 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap w-14">S.No</TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Reg ID
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Beneficiary Name
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Father's Name
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Mobile Number
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Village
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Block
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        District
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Pincode
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Pump Capacity
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Pump Head
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        IP Name
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Work Order No
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Work Order Date
                      </TableHead>

                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Document
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 6 }).map((_, index) => (
                        <TableRow
                          key={`history-skeleton-${index}`}
                          className="animate-pulse"
                        >
                          {Array.from({ length: 11 }).map((__, i) => (
                            <TableCell key={i}>
                              <div className="h-4 w-full bg-slate-200 rounded mx-auto"></div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredHistoryItems.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={17} // Increased colspan for checkbox column
                          className="h-48 text-center text-slate-500 bg-slate-50/30"
                        >
                          {historyItems.length === 0
                            ? "No work order history found."
                            : "No history records found matching your search."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredHistoryItems.map((item, index) => (
                        <TableRow
                          key={item.regId}
                          className="hover:bg-blue-50/30 transition-colors"
                        >
                          <TableCell className="px-4">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={selectedRows.includes(item.regId)}
                                onCheckedChange={(checked) =>
                                  handleSelectRow(item.regId, checked)
                                }
                                aria-label={`Select row ${item.regId}`}
                                className="checkbox-3d border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 h-5 w-5 shadow-sm transition-all duration-300 ease-out active:scale-75 hover:scale-110 data-[state=checked]:scale-110"
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-8 px-3 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                              onClick={() => {
                                setSelectedItem(item);
                                setIsBulk(false);
                                setFormData({
                                  beneficiaryName: item.beneficiaryName,
                                  company: item.ipName || "",
                                  workOrderNo: item.workOrderNo || "",
                                  workOrderDate: item.workOrderDate || "",
                                  workOrderFile: item.workOrderFile || null,
                                  workOrderFileObj: null,
                                });
                                setIsDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </TableCell>
                          <TableCell className="text-center font-medium text-slate-500 text-xs">{index + 1}</TableCell>
                          <TableCell className="text-slate-600 font-mono text-xs">
                            {item.regId}
                          </TableCell>
                          <TableCell className="font-medium text-slate-800">
                            {item.beneficiaryName}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {item.fatherName}
                          </TableCell>
                          <TableCell className="text-slate-600 text-xs">
                            {item.mobileNumber}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {item.village}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {item.block}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {item.district}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {item.pincode}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {item.pumpCapacity}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {item.pumpHead}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {item.ipName}
                          </TableCell>

                          <TableCell className="text-slate-600">
                            {item.workOrderNo || "-"}
                          </TableCell>
                          <TableCell className="text-slate-600 text-xs">
                            {formatDate(item.workOrderDate)}
                          </TableCell>
                          <TableCell>
                            {item.workOrderFile ? (
                              item.workOrderFile.startsWith("http") ? (
                                <a
                                  href={item.workOrderFile}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 underline text-xs cursor-pointer hover:text-blue-800 flex items-center justify-center gap-1"
                                >
                                  <Upload className="h-4 w-4" />
                                  View
                                </a>
                              ) : (
                                <span className="text-slate-600 text-xs flex items-center justify-center gap-1">
                                  <FileCheck className="h-4 w-4" />
                                  {item.workOrderFile.substring(0, 15)}...
                                </span>
                              )
                            ) : (
                              "-"
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* PROCESSING DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          showCloseButton={!isSuccess}
          className={`max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isSuccess ? "bg-transparent !shadow-none !border-none" : ""
            }`}
        >
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center w-full p-8 text-center space-y-6 animate-in fade-in duration-300">
              <div className="rounded-full bg-white p-5 shadow-2xl shadow-white/20 ring-8 ring-white/10 animate-in zoom-in duration-500 ease-out">
                <CheckCircle2 className="h-16 w-16 text-green-600 scale-110" />
              </div>
              <h2 className="text-3xl font-bold text-white drop-shadow-md animate-in slide-in-from-bottom-4 fade-in duration-500 delay-150 ease-out tracking-wide">
                Submitted Successfully!
              </h2>
            </div>
          ) : (
            <>
              {/* Header Content */}
              <DialogHeader className="p-6 pb-2 border-b border-blue-100 bg-blue-50/30">
                <DialogTitle className="text-xl font-bold bg-linear-to-r from-blue-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2">
                  <span className="bg-blue-100 p-1.5 rounded-md">
                    <Pencil className="h-4 w-4 text-blue-600" />
                  </span>
                  {isBulk ? `Batch Process Items` : `Process LOI & MR`}
                </DialogTitle>
                <DialogDescription className="text-slate-500 ml-10">
                  {isBulk ? (
                    <span>
                      Applying changes to{" "}
                      <span className="font-bold text-blue-700">
                        {selectedRows.length} selected items
                      </span>
                      . All fields below will be updated for these items.
                    </span>
                  ) : (
                    <span>
                      Processing application for{" "}
                      <span className="font-semibold text-slate-700">
                        {selectedItem?.beneficiaryName}
                      </span>{" "}
                      <span className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded text-slate-600 border border-slate-200">
                        {selectedItem?.serialNo}
                      </span>
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>

              {(selectedItem || isBulk) && (
                <div className="p-6 space-y-6">
                  {/* Beneficiary Info - Read Only (Hide in Bulk Mode) */}
                  {!isBulk && selectedItem && (
                    <div className="rounded-xl border border-blue-100 bg-linear-to-br from-blue-50/50 to-blue-50/30 p-5 shadow-sm">
                      <h3 className="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2 border-b border-blue-100 pb-2">
                        <span className="bg-white p-1 rounded shadow-sm">
                          <CheckCircle2 className="h-4 w-4 text-blue-500" />
                        </span>
                        BENEFICIARY DETAILS
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-y-5 gap-x-6">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-blue-900/60 block mb-1">
                            Reg ID
                          </span>
                          <div className="font-medium text-slate-700 font-mono bg-white/50 px-2 py-1 rounded border border-blue-100/50 inline-block break-all max-w-full">
                            {selectedItem.regId}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-blue-900/60 block mb-1">
                            Father's Name
                          </span>
                          <p className="font-medium text-slate-700">
                            {selectedItem.fatherName}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-blue-900/60 block mb-1">
                            Village & Block
                          </span>
                          <p className="font-medium text-slate-700">
                            {selectedItem.village}, {selectedItem.block}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-blue-900/60 block mb-1">
                            District
                          </span>
                          <p className="font-medium text-slate-700">
                            {selectedItem.district}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-blue-900/60 block mb-1">
                            Pump Type
                          </span>
                          <Badge
                            variant="secondary"
                            className="bg-white text-blue-700 border-blue-200 shadow-sm font-medium"
                          >
                            {selectedItem.pumpType}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Form Fields */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-5 w-1 bg-blue-500 rounded-full"></div>
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                        Work Order Details
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          Beneficiary Name
                        </Label>
                        <Input
                          value={formData.beneficiaryName || ""}
                          readOnly
                          className="bg-slate-100/50 border-slate-200 text-slate-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          Mobile Number
                        </Label>
                        <Input
                          value={isBulk ? "Multiple" : (selectedItem?.mobileNumber || "")}
                          readOnly
                          className="bg-slate-100/50 border-slate-200 text-slate-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          Village
                        </Label>
                        <Input
                          value={isBulk ? "Multiple" : (selectedItem?.village || "")}
                          readOnly
                          className="bg-slate-100/50 border-slate-200 text-slate-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          Pump Capacity
                        </Label>
                        <Input
                          value={isBulk ? "Multiple" : (selectedItem?.pumpCapacity || "")}
                          readOnly
                          className="bg-slate-100/50 border-slate-200 text-slate-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          Pump Head
                        </Label>
                        <Input
                          value={isBulk ? "Multiple" : (selectedItem?.pumpHead || "")}
                          readOnly
                          className="bg-slate-100/50 border-slate-200 text-slate-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          IP Name
                        </Label>
                        <Input
                          value={formData.company || ""}
                          readOnly
                          className="bg-slate-100/50 border-slate-200 text-slate-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          Work Order No
                        </Label>
                        <Input
                          value={formData.workOrderNo}
                          onChange={(e) =>
                            setFormData({ ...formData, workOrderNo: e.target.value })
                          }
                          placeholder="e.g. WO/2025/001"
                          className="border-slate-200 focus:border-cyan-400 focus:ring-cyan-100"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          Work Order Date
                        </Label>
                        <Input
                          type="date"
                          value={formData.workOrderDate}
                          onChange={(e) =>
                            setFormData({ ...formData, workOrderDate: e.target.value })
                          }
                          className="border-slate-200 focus:border-cyan-400 focus:ring-cyan-100"
                        />
                      </div>





                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-sm font-medium text-slate-700">
                          Work Order Document
                        </Label>
                        <div
                          className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-all cursor-pointer group border-blue-100/50 hover:border-blue-200"
                          onClick={() =>
                            document.getElementById("work-order-upload")?.click()
                          }
                        >
                          <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                            <Upload className="h-5 w-5 text-blue-500" />
                          </div>
                          <div className="text-center">
                            <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
                              {formData.workOrderFile
                                ? formData.workOrderFile
                                : "Click to Upload Work Order Document"}
                            </span>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Any file (Image, PDF, DOC) up to 10MB
                            </p>
                          </div>
                          <Input
                            type="file"
                            accept="image/*,.pdf,.doc,.docx"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="work-order-upload"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="h-10 px-6 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-800"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="h-10 px-8 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/20 transition-all"
                    >
                      {isSubmitting ? "Submitting..." : "Submit"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
