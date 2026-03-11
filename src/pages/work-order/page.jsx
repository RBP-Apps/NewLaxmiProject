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
    <div className="space-y-6 sm:space-y-8 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto bg-slate-50/50 min-h-screen animate-fade-in-up">
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
          <Card className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between">
                <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <div className="p-2 bg-blue-50 rounded-lg border border-blue-100/50">
                    <FileCheck className="h-4 w-4 text-blue-600" />
                  </div>
                  Pending LOI & MR
                </CardTitle>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-64 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-white border-slate-200 focus-visible:ring-blue-100 h-9 transition-all hover:border-slate-300"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {selectedRows.length >= 2 && (
                    <Button
                      onClick={handleBulkClick}
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all duration-300 h-9 px-4"
                      size="sm"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Process Selected</span>
                      <span className="sm:hidden">Process</span> ({selectedRows.length})
                    </Button>
                  )}
                  <Badge
                    variant="outline"
                    className="bg-yellow-50 text-yellow-700 border-yellow-200 px-3 py-1 h-9 flex items-center font-medium shadow-sm whitespace-nowrap"
                  >
                    {filteredPendingItems.length} Pending
                  </Badge>
                </div>
              </div>
            </CardHeader>

            {/* Filter Dropdowns */}
            <div className="px-4 sm:px-6 py-4 bg-slate-50/30 border-b border-slate-100/50">
              <div className="grid grid-cols-2 lg:grid-cols-6 xl:grid-cols-7 gap-4">
                {[
                  { key: "regId", label: "Reg ID" },
                  { key: "village", label: "Village" },
                  { key: "block", label: "Block" },
                  { key: "district", label: "District" },
                  { key: "pumpType", label: "Pump Type" },
                  { key: "company", label: "Company" },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-1.5 hidden lg:block first:block sm:block">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</Label>
                    <select
                      value={filters[key]}
                      onChange={(e) =>
                        setFilters({ ...filters, [key]: e.target.value })
                      }
                      className="w-full h-9 flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
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

              <div className="flex justify-end mt-4">
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
                  className="text-xs h-8 px-3 border-slate-200 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 shadow-sm"
                >
                  Clear Filters
                </Button>
              </div>
            </div>

            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[70vh] overflow-y-auto relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <Table className="[&_th]:text-center [&_td]:text-center">
                  <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 bg-slate-50/80">
                    <TableRow className="border-b border-slate-100 hover:bg-transparent">
                      <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap w-12 text-center align-middle bg-slate-50 backdrop-blur">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={
                              filteredPendingItems.length > 0 &&
                              selectedRows.length ===
                              filteredPendingItems.length
                            }
                            onCheckedChange={handleSelectAll}
                            aria-label="Select all rows"
                            className="checkbox-3d border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 h-4 w-4 shadow-sm transition-all duration-300 ease-out"
                          />
                        </div>
                      </TableHead>
                      <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap min-w-[120px] text-center align-middle bg-slate-50 backdrop-blur">
                        Action
                      </TableHead>
                      <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap w-12 text-center align-middle bg-slate-50 backdrop-blur">S.No</TableHead>

                      <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50 backdrop-blur">
                        Reg ID
                      </TableHead>
                      <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50 backdrop-blur">
                        Beneficiary Name
                      </TableHead>
                      <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50 backdrop-blur">
                        Father's Name
                      </TableHead>
                      <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50 backdrop-blur">
                        Mobile Number
                      </TableHead>
                      <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50 backdrop-blur">
                        Village
                      </TableHead>
                      <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50 backdrop-blur">
                        Block
                      </TableHead>
                      <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50 backdrop-blur">
                        District
                      </TableHead>
                      <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50 backdrop-blur">
                        Pincode
                      </TableHead>
                      <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50 backdrop-blur">
                        Pump Capacity
                      </TableHead>
                      <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50 backdrop-blur">
                        Pump Head
                      </TableHead>
                      <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50 backdrop-blur">
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
                      filteredPendingItems.map((item, index) => (
                        <TableRow
                          key={item.serialNo}
                          className="hover:bg-slate-50/80 transition-colors data-[state=selected]:bg-slate-50 border-b border-slate-100 group"
                        >
                          <TableCell className="px-4 py-2 text-center align-middle">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={selectedRows.includes(item.serialNo)}
                                onCheckedChange={(checked) =>
                                  handleSelectRow(item.serialNo, checked)
                                }
                                aria-label={`Select row ${item.serialNo}`}
                                className="checkbox-3d border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 h-4 w-4 shadow-sm transition-all duration-300 ease-out active:scale-75 hover:scale-110 data-[state=checked]:scale-110"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-2 text-center align-middle">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleActionClick(item)}
                              disabled={selectedRows.length >= 2}
                              className="bg-slate-50 text-blue-600 hover:bg-blue-50 border border-slate-200 shadow-sm text-[11px] font-semibold h-7 px-3 rounded-md flex items-center gap-1.5 transition-all duration-300 mx-auto disabled:opacity-50 disabled:cursor-not-allowed group-hover:border-blue-200 group-hover:bg-white"
                            >
                              <Pencil className="h-3 w-3" />
                              Process
                            </Button>
                          </TableCell>
                          <TableCell className="px-4 py-2 text-center align-middle font-medium text-slate-500 text-[13px]">{item.serialNo}</TableCell>

                          <TableCell className="whitespace-nowrap font-mono text-[13px] text-slate-600 bg-slate-50 rounded px-2 py-0.5 border border-slate-100 w-fit mx-auto mt-1.5 block">
                            {item.regId}
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-medium text-slate-800 text-[13px] px-4 py-2 text-center align-middle">
                            {item.beneficiaryName}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600 text-[13px] px-4 py-2 text-center align-middle">
                            {item.fatherName}
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-medium text-slate-600 text-[13px] px-4 py-2 text-center align-middle">
                            {item.mobileNumber}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600 text-[13px] px-4 py-2 text-center align-middle">
                            {item.village}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600 text-[13px] px-4 py-2 text-center align-middle">
                            {item.block}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600 text-[13px] px-4 py-2 text-center align-middle">
                            {item.district}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600 text-[13px] px-4 py-2 text-center align-middle">
                            {item.pincode}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-slate-700 font-medium text-[13px] px-4 py-2 text-center align-middle uppercase">
                            {item.pumpCapacity}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600 text-[13px] px-4 py-2 text-center align-middle">
                            {item.pumpHead}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600 font-medium text-[13px] px-4 py-2 text-center align-middle">
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
          <Card className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <div className="p-2 bg-green-50 rounded-lg border border-green-100/50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                  Processed History
                </CardTitle>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-64 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-white border-slate-200 focus-visible:ring-blue-100 h-9 transition-all hover:border-slate-300"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {selectedRows.length >= 2 && (
                    <Button
                      onClick={handleBulkClick}
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all duration-300 h-9 px-4"
                      size="sm"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Process Selected</span>
                      <span className="sm:hidden">Process</span> ({selectedRows.length})
                    </Button>
                  )}
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1 h-9 flex items-center font-medium shadow-sm whitespace-nowrap"
                  >
                    {filteredHistoryItems.length} Records
                  </Badge>
                </div>
              </div>
            </CardHeader>

            {/* Filter Dropdowns */}
            <div className="px-4 sm:px-6 py-4 bg-slate-50/30 border-b border-slate-100/50">
              <div className="grid grid-cols-2 lg:grid-cols-6 xl:grid-cols-7 gap-4">
                {[
                  { key: "regId", label: "Reg ID" },
                  { key: "village", label: "Village" },
                  { key: "block", label: "Block" },
                  { key: "district", label: "District" },
                  { key: "pumpType", label: "Pump Type" },
                  { key: "company", label: "Company" },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-1.5 hidden lg:block first:block sm:block">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</Label>
                    <select
                      value={filters[key]}
                      onChange={(e) =>
                        setFilters({ ...filters, [key]: e.target.value })
                      }
                      className="w-full h-9 flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
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

              <div className="flex justify-end mt-4">
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
                  className="text-xs h-8 px-3 border-slate-200 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 shadow-sm"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
            <CardContent className="p-0">
              <div className="hidden md:block overflow-x-auto max-h-[70vh] overflow-y-auto relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <Table className="[&_th]:text-center [&_td]:text-center">
                  <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 bg-slate-50/80">
                    <TableRow className="border-b border-slate-100 hover:bg-transparent">
                      <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap w-12 text-center align-middle bg-slate-50 backdrop-blur">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={
                              filteredHistoryItems.length > 0 &&
                              selectedRows.length ===
                              filteredHistoryItems.length
                            }
                            onCheckedChange={handleSelectAll}
                            aria-label="Select all rows"
                            className="checkbox-3d border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 h-4 w-4 shadow-sm transition-all duration-300 ease-out"
                          />
                        </div>
                      </TableHead>
                      <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap min-w-[120px] text-center align-middle bg-slate-50 backdrop-blur">
                        Action
                      </TableHead>
                      <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap w-12 text-center align-middle bg-slate-50 backdrop-blur">S.No</TableHead>
                      <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50 backdrop-blur">
                        Reg ID
                      </TableHead>
                      <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50 backdrop-blur">
                        Beneficiary Name
                      </TableHead>
                      <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50 backdrop-blur">
                        Father's Name
                      </TableHead>
                      <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50 backdrop-blur">
                        Mobile Number
                      </TableHead>
                      <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50 backdrop-blur">
                        Village
                      </TableHead>
                      <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50 backdrop-blur">
                        Block
                      </TableHead>
                      <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50 backdrop-blur">
                        District
                      </TableHead>
                      <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50 backdrop-blur">
                        Pincode
                      </TableHead>
                      <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50 backdrop-blur">
                        Pump Capacity
                      </TableHead>
                      <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50 backdrop-blur">
                        Pump Head
                      </TableHead>
                      <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50 backdrop-blur">
                        IP Name
                      </TableHead>
                      <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50 backdrop-blur">
                        Work Order No
                      </TableHead>
                      <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50 backdrop-blur">
                        Work Order Date
                      </TableHead>

                      <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50 backdrop-blur">
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
                          className="hover:bg-slate-50/80 transition-colors data-[state=selected]:bg-slate-50 border-b border-slate-100 group"
                        >
                          <TableCell className="px-4 py-2 text-center align-middle">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={selectedRows.includes(item.regId)}
                                onCheckedChange={(checked) =>
                                  handleSelectRow(item.regId, checked)
                                }
                                aria-label={`Select row ${item.regId}`}
                                className="checkbox-3d border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 h-4 w-4 shadow-sm transition-all duration-300 ease-out active:scale-75 hover:scale-110 data-[state=checked]:scale-110"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-2 text-center align-middle">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[11px] h-7 px-3 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 shadow-sm rounded-md transition-all font-semibold flex items-center gap-1.5 mx-auto group-hover:border-blue-200 group-hover:text-blue-600 group-hover:bg-white"
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
                              <Pencil className="h-3 w-3" />
                              Edit
                            </Button>
                          </TableCell>
                          <TableCell className="px-4 py-2 text-center align-middle font-medium text-slate-500 text-[13px]">{item.serialNo}</TableCell>
                          <TableCell className="whitespace-nowrap font-mono text-[13px] text-slate-600 bg-slate-50 rounded px-2 py-0.5 border border-slate-100 w-fit mx-auto mt-1.5 block">
                            {item.regId}
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-medium text-slate-800 text-[13px] px-4 py-2 text-center align-middle">
                            {item.beneficiaryName}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600 text-[13px] px-4 py-2 text-center align-middle">
                            {item.fatherName}
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-medium text-slate-600 text-[13px] px-4 py-2 text-center align-middle">
                            {item.mobileNumber}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600 text-[13px] px-4 py-2 text-center align-middle">
                            {item.village}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600 text-[13px] px-4 py-2 text-center align-middle">
                            {item.block}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600 text-[13px] px-4 py-2 text-center align-middle">
                            {item.district}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600 text-[13px] px-4 py-2 text-center align-middle">
                            {item.pincode}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-slate-700 font-medium text-[13px] px-4 py-2 text-center align-middle uppercase">
                            {item.pumpCapacity}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600 text-[13px] px-4 py-2 text-center align-middle">
                            {item.pumpHead}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600 font-medium text-[13px] px-4 py-2 text-center align-middle">
                            {item.ipName}
                          </TableCell>

                          <TableCell className="whitespace-nowrap text-slate-700 font-semibold text-[13px] px-4 py-2 text-center align-middle border-l border-slate-100 bg-slate-50/50">
                            {item.workOrderNo || "-"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600 text-[13px] px-4 py-2 text-center align-middle bg-slate-50/50">
                            {formatDate(item.workOrderDate)}
                          </TableCell>
                          <TableCell className="px-4 py-2 text-center align-middle bg-slate-50/50">
                            {item.workOrderFile ? (
                              item.workOrderFile.startsWith("http") ? (
                                <a
                                  href={item.workOrderFile}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 underline font-medium text-[13px] cursor-pointer hover:text-blue-800 flex items-center justify-center gap-1 mx-auto"
                                >
                                  <Upload className="h-4 w-4" />
                                  View File
                                </a>
                              ) : (
                                <span className="text-slate-600 text-[13px] flex items-center justify-center gap-1 mx-auto bg-slate-100 px-2 py-1 rounded w-fit">
                                  <FileCheck className="h-3.5 w-3.5" />
                                  {item.workOrderFile.substring(0, 15)}...
                                </span>
                              )
                            ) : (
                              <span className="text-slate-400 text-[13px]">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View for History */}
              <div className="md:hidden p-3 space-y-3 max-h-[70vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={`mobile-skeleton-${i}`} className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                      <div className="h-4 w-3/4 bg-slate-200 rounded"></div>
                      <div className="h-3 w-1/2 bg-slate-200 rounded"></div>
                      <div className="h-3 w-2/3 bg-slate-200 rounded"></div>
                    </div>
                  ))
                ) : filteredHistoryItems.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Search className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm">{historyItems.length === 0 ? "No work order history found." : "No history records found matching your search."}</p>
                  </div>
                ) : (
                  filteredHistoryItems.map((item, index) => (
                    <Card key={item.regId} className="border border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                      <CardContent className="p-4 space-y-3">
                        {/* Top Row: S.No, Reg ID, Checkbox */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{index + 1}</span>
                            <span className="font-mono text-xs text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{item.regId}</span>
                          </div>
                          <Checkbox
                            checked={selectedRows.includes(item.regId)}
                            onCheckedChange={(checked) => handleSelectRow(item.regId, checked)}
                            className="border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 h-4 w-4"
                          />
                        </div>

                        {/* Beneficiary Info */}
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{item.beneficiaryName}</p>
                          <p className="text-xs text-slate-500">S/O: {item.fatherName}</p>
                        </div>

                        {/* Location & Details Grid */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                          <div>
                            <span className="text-slate-400 font-medium">Village</span>
                            <p className="text-slate-700 font-medium">{item.village}</p>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium">Block</span>
                            <p className="text-slate-700 font-medium">{item.block}</p>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium">District</span>
                            <p className="text-slate-700 font-medium">{item.district}</p>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium">Pincode</span>
                            <p className="text-slate-700 font-medium">{item.pincode}</p>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium">Pump Capacity</span>
                            <p className="text-slate-700 font-medium uppercase">{item.pumpCapacity}</p>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium">Mobile</span>
                            <p className="text-slate-700 font-medium">{item.mobileNumber}</p>
                          </div>
                        </div>

                        {/* Work Order Info */}
                        <div className="border-t border-slate-100 pt-3 space-y-2">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                            <div>
                              <span className="text-slate-400 font-medium">Work Order No</span>
                              <p className="text-slate-700 font-semibold">{item.workOrderNo || "-"}</p>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Work Order Date</span>
                              <p className="text-slate-700 font-medium">{formatDate(item.workOrderDate)}</p>
                            </div>
                          </div>
                          {item.workOrderFile && item.workOrderFile.startsWith("http") && (
                            <a
                              href={item.workOrderFile}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-medium hover:underline"
                            >
                              <Upload className="h-3.5 w-3.5" />
                              View Document
                            </a>
                          )}
                        </div>

                        {/* Edit Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs h-8 border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all font-semibold flex items-center justify-center gap-1.5"
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
                          <Pencil className="h-3 w-3" />
                          Edit Work Order
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* PROCESSING DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          showCloseButton={!isSuccess}
          className={`max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isSuccess ? "bg-transparent shadow-none! border-none!" : "bg-white rounded-xl shadow-2xl border-slate-200"
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
              <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm">
                <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <span className="bg-blue-100 p-2 rounded-lg border border-blue-200/50 shadow-sm">
                    <Pencil className="h-4 w-4 text-blue-700" />
                  </span>
                  {isBulk ? `Batch Process Items` : `Process LOI & MR`}
                </DialogTitle>
                <DialogDescription className="text-slate-500 ml-12 text-sm mt-1">
                  {isBulk ? (
                    <span>
                      Applying changes to{" "}
                      <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                        {selectedRows.length} selected items
                      </span>
                      . All fields below will be updated for these items.
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Processing application for{" "}
                      <span className="font-semibold text-slate-700">
                        {selectedItem?.beneficiaryName}
                      </span>
                      <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-300"></span>
                      <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200 shadow-sm">
                        {selectedItem?.serialNo}
                      </span>
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>

              {(selectedItem || isBulk) && (
                <div className="p-6 space-y-8 bg-slate-50/30">
                  {/* Beneficiary Info - Read Only (Hide in Bulk Mode) */}
                  {!isBulk && selectedItem && (
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                        <CheckCircle2 className="h-4 w-4 text-slate-400" />
                        Beneficiary Details
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-y-5 gap-x-6">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">
                            Reg ID
                          </span>
                          <div className="font-medium text-slate-700 font-mono text-sm bg-slate-50 px-2 py-1 rounded border border-slate-100 inline-block break-all max-w-full">
                            {selectedItem.regId}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">
                            Father's Name
                          </span>
                          <p className="font-medium text-slate-700 text-sm">
                            {selectedItem.fatherName || "-"}
                          </p>
                        </div>
                        <div className="space-y-1 col-span-2 md:col-span-1 xl:col-span-2">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">
                            Location (Village, Block, District)
                          </span>
                          <p className="font-medium text-slate-700 text-sm">
                            {selectedItem.village}, {selectedItem.block}, {selectedItem.district}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">
                            Pump Details
                          </span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-slate-200 font-medium text-xs">
                              {selectedItem.pumpType || "-"}
                            </Badge>
                            <Badge variant="outline" className="border-slate-200 text-slate-600 font-medium text-xs bg-white">
                              {selectedItem.pumpCapacity || "-"}
                            </Badge>
                            <Badge variant="outline" className="border-slate-200 text-slate-600 font-medium text-xs bg-white">
                              {selectedItem.pumpHead || "-"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Form Fields */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-5 w-1 bg-blue-500 rounded-full shadow-sm shadow-blue-500/50"></div>
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                        Work Order Details
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          Beneficiary Name
                        </Label>
                        <Input
                          value={formData.beneficiaryName || ""}
                          readOnly
                          className="bg-slate-50 border-slate-200 text-slate-500 shadow-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          Mobile Number
                        </Label>
                        <Input
                          value={isBulk ? "Multiple" : (selectedItem?.mobileNumber || "")}
                          readOnly
                          className="bg-slate-50 border-slate-200 text-slate-500 shadow-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          Village
                        </Label>
                        <Input
                          value={isBulk ? "Multiple" : (selectedItem?.village || "")}
                          readOnly
                          className="bg-slate-50 border-slate-200 text-slate-500 shadow-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          Pump Capacity
                        </Label>
                        <Input
                          value={isBulk ? "Multiple" : (selectedItem?.pumpCapacity || "")}
                          readOnly
                          className="bg-slate-50 border-slate-200 text-slate-500 shadow-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          Pump Head
                        </Label>
                        <Input
                          value={isBulk ? "Multiple" : (selectedItem?.pumpHead || "")}
                          readOnly
                          className="bg-slate-50 border-slate-200 text-slate-500 shadow-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          IP Name
                        </Label>
                        <Input
                          value={formData.company || ""}
                          readOnly
                          className="bg-slate-50 border-slate-200 text-slate-500 shadow-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700 flex items-center justify-between">
                          Work Order No
                          <span className="text-[10px] text-slate-400 font-normal">Required</span>
                        </Label>
                        <Input
                          value={formData.workOrderNo}
                          onChange={(e) =>
                            setFormData({ ...formData, workOrderNo: e.target.value })
                          }
                          placeholder="e.g. WO/2025/001"
                          className="border-slate-300 focus:border-blue-400 focus:ring-blue-100 shadow-sm transition-all bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700 flex items-center justify-between">
                          Work Order Date
                          <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                        </Label>
                        <Input
                          type="date"
                          value={formData.workOrderDate}
                          onChange={(e) =>
                            setFormData({ ...formData, workOrderDate: e.target.value })
                          }
                          className="border-slate-300 focus:border-blue-400 focus:ring-blue-100 shadow-sm transition-all bg-white"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2 mt-4">
                        <Label className="text-sm font-medium text-slate-700">
                          Work Order Document
                        </Label>
                        <div
                          className="border-2 border-dashed border-slate-300 rounded-xl p-6 bg-slate-50 flex flex-col items-center justify-center gap-3 hover:bg-slate-100/50 transition-all cursor-pointer group hover:border-blue-300"
                          onClick={() =>
                            document.getElementById("work-order-upload")?.click()
                          }
                        >
                          <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200 group-hover:scale-110 transition-transform group-hover:border-blue-200 group-hover:shadow-blue-100">
                            <Upload className="h-6 w-6 text-slate-500 group-hover:text-blue-500 transition-colors" />
                          </div>
                          <div className="text-center space-y-1">
                            <p className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
                              {formData.workOrderFile
                                ? (
                                  formData.workOrderFile.startsWith("http")
                                    ? (
                                      <span className="flex flex-col items-center gap-1.5">
                                        <span className="inline-flex items-center gap-1.5 text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200 text-xs font-semibold">
                                          <FileCheck className="h-3.5 w-3.5" />
                                          Document Uploaded
                                        </span>
                                        <a
                                          href={formData.workOrderFile}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 text-xs font-medium underline hover:text-blue-800"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          View File
                                        </a>
                                      </span>
                                    )
                                    : formData.workOrderFile
                                )
                                : "Click to Upload Work Order Document"}
                            </p>
                            <p className="text-xs text-slate-500">
                              Supports JPG, PNG, PDF, or DOC (Max 10MB)
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

                  <div className="flex justify-end gap-3 mt-8 pt-5 border-t border-slate-200">
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="h-10 px-6 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="h-10 px-8 bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Submitting...</span>
                        </div>
                      ) : (
                        "Submit Data"
                      )}
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
