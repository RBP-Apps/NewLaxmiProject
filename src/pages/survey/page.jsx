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
import { FileCheck, Upload, CheckCircle2, Pencil, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function SurveyPage() {
  const [pendingItems, setPendingItems] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [isBulk, setIsBulk] = useState(false);

  const [filters, setFilters] = useState({
    regId: "",
    village: "",
    block: "",
    district: "",
    pumpSource: "",
    pumpCapacity: "",
    ipName: "",
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

  const handleSelectAll = (checked) => {
    if (checked) {
      const items = activeTab === "history" ? filteredHistoryItems : filteredPendingItems;
      setSelectedRows(items.map((item) => item.serialNo));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (serialNo, checked) => {
    if (checked) {
      setSelectedRows((prev) => [...prev, serialNo]);
    } else {
      setSelectedRows((prev) => prev.filter((id) => id !== serialNo));
    }
  };

  // Clear selection when switching tabs
  useEffect(() => {
    setSelectedRows([]);
    setSelectedItem(null);
  }, [activeTab]);

  const [searchTerm, setSearchTerm] = useState("");

  // const filteredPendingItems = pendingItems.filter((item) =>
  //   Object.values(item).some((value) =>
  //     String(value).toLowerCase().includes(searchTerm.toLowerCase())
  //   )
  // );

  // const filteredHistoryItems = historyItems.filter((item) =>
  //   Object.values(item).some((value) =>
  //     String(value).toLowerCase().includes(searchTerm.toLowerCase())
  //   )
  // );

  const filteredPendingItems = pendingItems.filter((item) => {
    const searchFields = [
      item.regId,
      item.serialNo,
      item.beneficiaryName,
      item.mobileNumber,
      item.fatherName,
      item.village,
      item.block,
      item.district,
      item.ipName
    ];

    const matchesSearch = searchFields.some((value) =>
      String(value || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const matchesFilters =
      (!filters.regId || item.regId === filters.regId) &&
      (!filters.village || item.village === filters.village) &&
      (!filters.block || item.block === filters.block) &&
      (!filters.district || item.district === filters.district) &&
      (!filters.pumpSource || item.pumpSource === filters.pumpSource) &&
      (!filters.pumpCapacity || item.pumpCapacity === filters.pumpCapacity) &&
      (!filters.ipName || item.ipName === filters.ipName);

    return matchesSearch && matchesFilters;
  });

  const filteredHistoryItems = historyItems.filter((item) => {
    const searchFields = [
      item.regId,
      item.serialNo,
      item.beneficiaryName,
      item.mobileNumber,
      item.fatherName,
      item.village,
      item.block,
      item.district,
      item.ipName
    ];

    const matchesSearch = searchFields.some((value) =>
      String(value || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const matchesFilters =
      (!filters.regId || item.regId === filters.regId) &&
      (!filters.village || item.village === filters.village) &&
      (!filters.block || item.block === filters.block) &&
      (!filters.district || item.district === filters.district) &&
      (!filters.pumpSource || item.pumpSource === filters.pumpSource) &&
      (!filters.pumpCapacity || item.pumpCapacity === filters.pumpCapacity) &&
      (!filters.ipName || item.ipName === filters.ipName);

    return matchesSearch && matchesFilters;
  });

  const [formData, setFormData] = useState({
    actual2: "",
    surveyStatus: "Completed",
    surveyFile: null,
    surveyFileObj: null,
    surveyRemarks: "",
    surveyorName: "",
    isApproved: false,
  });

  // Fetch data from Supabase
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch portal and survey tables
      const [
        { data: portalData, error: portalError },
        { data: surveyData, error: surveyError },
      ] = await Promise.all([
        supabase.from("portal").select("*"),
        supabase.from("survey").select("*"),
      ]);

      if (portalError || surveyError) {
        console.error("Supabase fetch error:", portalError || surveyError);
        throw portalError || surveyError;
      }

      console.log("Portal data fetched:", portalData?.length);
      console.log("Survey data fetched:", surveyData?.length);

      if (!portalData || portalData.length === 0) {
        console.log("No data found in portal table");
        setPendingItems([]);
        setHistoryItems([]);
        return;
      }

      // Create a map of survey data for quick lookup
      const surveyMap = {};
      if (surveyData) {
        surveyData.forEach((row) => {
          surveyMap[row.reg_id] = {
            planned2: row.planned_2 || "",
            actual2: row.actual_2 || "",
            delay2: row.delay_2 || 0,
            surveyStatus: row.survey_status || "Completed",
            surveyRemarks: row.survey_remarks || "",
            surveyorName: row.surveyor_name || "",
            surveyFile: row.survey_file || "",
            isApproved: row.is_approved || false,
          };
        });
      }

      const parsedPending = [];
      const parsedHistory = [];

      portalData.forEach((row) => {
        const item = {
          regId: row.reg_id || "-",
          serialNo: row.serial_no || "-",
          beneficiaryName: row.beneficiary_name || "-",
          mobileNumber: row.mobile_number || "-",
          fatherName: row.fathers_name || "-",
          village: row.village || "-",
          block: row.block || "-",
          district: row.district || "-",
          category: row.category || "-",
          pincode: row.pincode || "-",
          pumpSource: row.pump_source || "-",
          pumpCapacity: row.pump_capacity || "-",
          pumpHead: row.pump_head || "-",
          ipName: row.ip_name || row.company || "-",
          otherRemark: row.other_remark || "",
          loiFileName: row.loi_file_name || "",
          loiDocument: row.loi_file_name || "",
          mrNo: row.mr_no || "-",
          mrDate: row.mr_date || "-",
          amount: row.amount || "-",
          paidBy: row.paid_by || "-",
          beneficiaryShare: row.beneficiary_share || "-",

          surveyNo: row.survey_no || "",
          surveyDate: row.survey_date || "",
          surveyFile: row.survey_file || "",
        };

        // Get survey data for this reg_id
        const surveyInfo = surveyMap[item.regId];

        if (surveyInfo) {
          // Add survey data to item
          item.planned2 = surveyInfo.planned2;
          item.actual2 = surveyInfo.actual2;
          item.delay2 = surveyInfo.delay2;
          item.surveyStatus = surveyInfo.surveyStatus;
          item.surveyRemarks = surveyInfo.surveyRemarks;
          item.surveyorName = surveyInfo.surveyorName;
          item.surveyFile = surveyInfo.surveyFile;
          item.isApproved = surveyInfo.isApproved;

          const isPlanned2Filled =
            surveyInfo.planned2 && String(surveyInfo.planned2).trim() !== "";
          const isActual2Filled =
            surveyInfo.actual2 && String(surveyInfo.actual2).trim() !== "";

          // Pending: planned_2 filled, actual_2 empty
          // History: planned_2 filled and actual_2 filled
          if (isPlanned2Filled && !isActual2Filled) {
            parsedPending.push(item);
          } else if (isPlanned2Filled && isActual2Filled) {
            parsedHistory.push(item);
          }
        }
      });

      console.log("Parsed pending items:", parsedPending);
      console.log("Parsed history items:", parsedHistory);

      setPendingItems(parsedPending);
      setHistoryItems(parsedHistory);
    } catch (e) {
      console.error("Error fetching data:", e);
      setPendingItems([]);
      setHistoryItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to real-time changes on both portal and survey tables
    const portalSubscription = supabase
      .channel("portal_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "portal",
        },
        (payload) => {
          console.log("Portal table changed:", payload);
          fetchData();
        }
      )
      .subscribe();

    const surveySubscription = supabase
      .channel("survey_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "survey",
        },
        (payload) => {
          console.log("Survey table changed:", payload);
          fetchData();
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      portalSubscription.unsubscribe();
      surveySubscription.unsubscribe();
    };
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

  // Format date for input field
  const formatDateForInput = (dateValue) => {
    if (!dateValue) return "";
    if (typeof dateValue === "string") return dateValue;
    if (dateValue instanceof Date) {
      return dateValue.toISOString().split("T")[0];
    }
    return "";
  };

  const handleActionClick = (item) => {
    setSelectedItem(item);
    setIsBulk(false);
    setIsSuccess(false);
    setFormData({
      actual2: formatDateForInput(item.actual2) || "",
      surveyStatus: "Completed",
      surveyFile: item.surveyFile ? item.surveyFile.split("/").pop() : null,

      surveyFileObj: null,
      surveyRemarks: item.surveyRemarks || "",
      surveyorName: item.surveyorName || "",
      isApproved: item.isApproved || false,
    });
    setIsDialogOpen(true);
  };

  const handleBulkClick = () => {
    if (selectedRows.length < 2) return;
    setSelectedItem(null);
    setIsBulk(true);
    setIsSuccess(false);
    setFormData({
      actual2: "",
      surveyStatus: "Completed",
      surveyFile: null,
      surveyFileObj: null,
      surveyRemarks: "",
      surveyorName: "",
      isApproved: false,
    });
    setIsDialogOpen(true);
  };

  const handleFileUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({
        ...formData,
        surveyFile: e.target.files[0].name,
        surveyFileObj: e.target.files[0],
      });
    }
  };

  // Supabase Storage public URL helper
  const getPreviewUrl = (url) => {
    if (!url) return url;
    // If it's already a full URL (Supabase or Drive), return as-is
    return url;
  };

  const handleSubmit = async () => {
    if (!selectedItem && !isBulk) return;
    setIsSubmitting(true);

    try {
      let finalFileUrl = "";

      // 1. Upload Survey File to Supabase Storage if present
      if (formData.surveyFileObj) {
        const file = formData.surveyFileObj;
        const filePath = `survey-documents/${Date.now()}_${file.name}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("Image_bucket")
          .upload(filePath, file);

        if (uploadError) {
          console.error("File upload error:", uploadError);
          throw new Error(`File upload failed: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from("Image_bucket")
          .getPublicUrl(filePath);

        finalFileUrl = urlData?.publicUrl || "";
      }

      // 2. Prepare items to process
      const currentItems = activeTab === "history" ? historyItems : pendingItems;
      const itemsToProcess = isBulk
        ? currentItems.filter((item) => selectedRows.includes(item.regId))
        : [selectedItem];

      if (itemsToProcess.length === 0) {
        throw new Error("No items selected for processing.");
      }

      const updatePromises = itemsToProcess.map(async (item) => {
        const rowUpdate = {
          actual_2: formData.actual2 || null,
          survey_dt: formData.actual2 || null,
          survey_status: formData.surveyStatus,
          survey_remarks: formData.surveyRemarks,
          surveyor_name: formData.surveyorName,
          is_approved: formData.isApproved,
        };

        if (formData.actual2 && item.planned2) {
          const actual = new Date(formData.actual2);
          const planned = new Date(item.planned2);
          const diffTime = actual.getTime() - planned.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          rowUpdate.delay_2 = diffDays > 0 ? diffDays : 0;
        }

        if (finalFileUrl) {
          rowUpdate.survey_file = finalFileUrl;
        } else if (item.surveyFile) {
          rowUpdate.survey_file = item.surveyFile;
        }

        if (!item.regId || item.regId === "-") {
          throw new Error(`Beneficiary Registration ID (reg_id) missing for item: ${item.beneficiaryName || "Unknown"}`);
        }

        const { error } = await supabase
          .from("survey")
          .update(rowUpdate)
          .eq("reg_id", item.regId);

        if (error) {
          console.error(`Update failed for reg_id ${item.regId}:`, error);
          throw error;
        }
      });

      const results = await Promise.allSettled(updatePromises);
      const failed = results.filter((r) => r.status === "rejected");

      if (failed.length > 0) {
        const errors = failed.map((f) => f.reason.message || "Unknown error").join("\n");
        console.error("Some updates failed:", failed);
        alert(`Failed to update ${failed.length} record(s):\n\n${errors}\n\nCheck console for details.`);
      } else {
        await fetchData();
        setIsSuccess(true);
        if (isBulk) setSelectedRows([]);
      }
    } catch (error) {
      console.error("Submission error:", error);
      alert(`Submission failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 md:p-8 max-w-[1600px] mx-auto bg-slate-50/50 min-h-screen animate-fade-in-up">
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
            Pending Surveys
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="z-10 h-full data-[state=active]:bg-transparent data-[state=active]:text-blue-700 data-[state=active]:shadow-none transition-colors duration-200 text-base font-medium text-slate-500"
          >
            Survey History
          </TabsTrigger>
        </TabsList>

        {/* PENDING TAB */}
        <TabsContent
          value="pending"
          className="focus-visible:outline-none focus-visible:ring-0"
        >
          <Card className="border-slate-200 shadow-sm bg-white overflow-hidden rounded-xl">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 border border-blue-200/50">
                  <FileCheck className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-slate-800">
                    Pending for Survey
                  </CardTitle>
                  <p className="text-sm text-slate-500">
                    Review and process pending surveys
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search records..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-10 w-full bg-white border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm rounded-lg transition-all"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {selectedRows.length >= 2 && (
                    <Button
                      onClick={handleBulkClick}
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow h-10 px-4 transition-all duration-300 rounded-lg"
                      size="sm"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Batch Update ({selectedRows.length})
                    </Button>
                  )}
                  <Badge
                    variant="secondary"
                    className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-transparent h-10 px-4 rounded-lg text-sm font-medium flex items-center shadow-sm"
                  >
                    {filteredPendingItems.length} Pending
                  </Badge>
                </div>
              </div>
            </CardHeader>

            {/* Filter Dropdowns */}
            <div className="px-6 py-4 bg-white border-b border-slate-100">
              <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                {[
                  { key: "regId", label: "Reg ID" },
                  { key: "village", label: "Village" },
                  { key: "block", label: "Block" },
                  { key: "district", label: "District" },
                  { key: "pumpSource", label: "Pump Source" },
                  { key: "pumpCapacity", label: "Pump Capacity" },
                  { key: "ipName", label: "IP Name" },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-1.5 flex flex-col">
                    <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</Label>
                    <select
                      value={filters[key]}
                      onChange={(e) =>
                        setFilters({ ...filters, [key]: e.target.value })
                      }
                      className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300 transition-colors appearance-none cursor-pointer"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='2' stroke='%2364748B'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1rem' }}
                    >
                      <option value="">All {label}</option>
                      {getUniquePendingValues(key).map((val) => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {Object.values(filters).some(v => v !== "") && (
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setFilters({
                        regId: "",
                        village: "",
                        block: "",
                        district: "",
                        pumpSource: "",
                        pumpCapacity: "",
                        ipName: "",
                      })
                    }
                    className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 h-8 px-3 text-xs font-medium bg-white border border-slate-200 shadow-sm"
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
            <CardContent className="p-0">
              <div className="max-h-[70vh] overflow-auto [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-20 [&_thead_th]:bg-slate-50">
                <Table>
                  <TableHeader className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm border-b border-slate-200">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-12 px-4 py-3 text-center">
                        <Checkbox
                          checked={
                            filteredPendingItems.length > 0 &&
                            selectedRows.length ===
                            filteredPendingItems.length
                          }
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all rows"
                          className="border-slate-300 rounded data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                        />
                      </TableHead>
                      <TableHead className="w-[120px] font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-center">
                        Action
                      </TableHead>
                      <TableHead className="w-14 font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-center">S.No</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-left min-w-[120px]">
                        Reg ID
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-left min-w-[150px]">
                        Beneficiary Name
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-left min-w-[150px]">
                        Father's Name
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-left min-w-[120px]">
                        Mobile Number
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-left min-w-[100px]">
                        Village
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-left min-w-[100px]">
                        Block
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-left min-w-[100px]">
                        District
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-center min-w-[100px]">
                        Pincode
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-center min-w-[130px]">
                        Pump Capacity
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-center min-w-[130px]">
                        Pump Head
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-left min-w-[150px]">
                        IP Name
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={`skeleton-pending-${index}`} className="animate-pulse border-b border-slate-100">
                          {Array.from({ length: 14 }).map((__, i) => (
                            <TableCell key={i} className="px-4 py-3">
                              <div className="h-4 bg-slate-200 rounded"></div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredPendingItems.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={14}
                          className="h-48 text-center text-slate-500 bg-slate-50/50"
                        >
                          <div className="flex flex-col items-center justify-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center shadow-inner">
                              <FileCheck className="h-6 w-6 text-slate-400" />
                            </div>
                            <p className="text-sm">No pending items found matching your search.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPendingItems.map((item, index) => (
                        <TableRow
                          key={item.serialNo}
                          className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 group"
                        >
                          <TableCell className="px-4 py-3 align-middle text-center">
                            <Checkbox
                              checked={selectedRows.includes(item.serialNo)}
                              onCheckedChange={(checked) =>
                                handleSelectRow(item.serialNo, checked)
                              }
                              aria-label={`Select row ${item.serialNo}`}
                              className="border-slate-300 rounded data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 transition-all opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100"
                            />
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleActionClick(item)}
                              disabled={selectedRows.length >= 2}
                              className="h-8 px-3 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 transition-all text-xs font-medium w-full max-w-[100px] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
                            >
                              Process
                            </Button>
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-center font-medium text-slate-500 text-xs">{index + 1}</TableCell>
                          <TableCell className="px-4 py-3 align-middle">
                            <span className="font-mono text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                              {item.regId}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle font-medium text-slate-800">
                            {item.beneficiaryName}
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-slate-700">
                            {item.fatherName}
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-slate-700">
                            {item.mobileNumber}
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-slate-600">
                            {item.village}
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-slate-600">
                            {item.block}
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-slate-600">
                            {item.district}
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-center text-slate-600">
                            {item.pincode}
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-center">
                            <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 font-medium">
                              {item.pumpCapacity}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-center">
                            <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 font-medium">
                              {item.pumpHead}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-slate-600 font-medium">
                            {item.ipName}
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
          className="focus-visible:outline-none focus-visible:ring-0"
        >
          <Card className="border-slate-200 shadow-sm bg-white overflow-hidden rounded-xl">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-50 border border-teal-200/50">
                  <CheckCircle2 className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-slate-800">
                    Completed Survey History
                  </CardTitle>
                  <p className="text-sm text-slate-500">
                    Review and manage previously processed surveys
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search records..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-10 w-full bg-white border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm rounded-lg transition-all"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {selectedRows.length >= 2 && (
                    <Button
                      onClick={handleBulkClick}
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow h-10 px-4 transition-all duration-300 rounded-lg"
                      size="sm"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Batch Update ({selectedRows.length})
                    </Button>
                  )}
                  <Badge
                    variant="secondary"
                    className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-transparent h-10 px-4 rounded-lg text-sm font-medium flex items-center shadow-sm"
                  >
                    {filteredHistoryItems.length} Completed
                  </Badge>
                </div>
              </div>
            </CardHeader>

            {/* Filter Dropdowns */}
            <div className="px-6 py-4 bg-white border-b border-slate-100">
              <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                {[
                  { key: "regId", label: "Reg ID" },
                  { key: "village", label: "Village" },
                  { key: "block", label: "Block" },
                  { key: "district", label: "District" },
                  { key: "pumpSource", label: "Pump Source" },
                  { key: "pumpCapacity", label: "Pump Capacity" },
                  { key: "ipName", label: "IP Name" },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-1.5 flex flex-col">
                    <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</Label>
                    <select
                      value={filters[key]}
                      onChange={(e) =>
                        setFilters({ ...filters, [key]: e.target.value })
                      }
                      className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300 transition-colors appearance-none cursor-pointer"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='2' stroke='%2364748B'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1rem' }}
                    >
                      <option value="">All {label}</option>
                      {getUniqueHistoryValues(key).map((val) => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {Object.values(filters).some(v => v !== "") && (
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setFilters({
                        regId: "",
                        village: "",
                        block: "",
                        district: "",
                        pumpSource: "",
                        pumpCapacity: "",
                        ipName: "",
                      })
                    }
                    className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 h-8 px-3 text-xs font-medium bg-white border border-slate-200 shadow-sm"
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
            <CardContent className="p-0">
              <div className="max-h-[70vh] overflow-auto [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-20 [&_thead_th]:bg-slate-50">
                <Table>
                  <TableHeader className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm border-b border-slate-200">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-12 px-4 py-3 text-center">
                        <Checkbox
                          checked={
                            filteredHistoryItems.length > 0 &&
                            selectedRows.length ===
                            filteredHistoryItems.length
                          }
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all rows"
                          className="border-slate-300 rounded data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                        />
                      </TableHead>
                      <TableHead className="w-[120px] font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-center">
                        Action
                      </TableHead>
                      <TableHead className="w-14 font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-center">S.No</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-left min-w-[120px]">
                        Reg ID
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-left min-w-[150px]">
                        Beneficiary Name
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-left min-w-[150px]">
                        Father's Name
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-left min-w-[120px]">
                        Mobile Number
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-left min-w-[100px]">
                        Village
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-left min-w-[100px]">
                        Block
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-left min-w-[100px]">
                        District
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-center min-w-[100px]">
                        Pincode
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-center min-w-[130px]">
                        Pump Capacity
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-center min-w-[130px]">
                        Pump Head
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-left min-w-[150px]">
                        IP Name
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-center min-w-[100px]">
                        Photo
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-center min-w-[120px]">
                        Planned Date
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-center min-w-[120px]">
                        Survey Date
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-center min-w-[100px]">
                        Delay
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-center min-w-[120px]">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={`skeleton-history-${index}`} className="animate-pulse border-b border-slate-100">
                          {Array.from({ length: 19 }).map((__, i) => (
                            <TableCell key={i} className="px-4 py-3">
                              <div className="h-4 bg-slate-200 rounded"></div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredHistoryItems.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={19}
                          className="h-48 text-center text-slate-500 bg-slate-50/50"
                        >
                          <div className="flex flex-col items-center justify-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center shadow-inner">
                              <FileCheck className="h-6 w-6 text-slate-400" />
                            </div>
                            <p className="text-sm">No survey history found.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredHistoryItems.map((item, index) => (
                        <TableRow
                          key={item.serialNo}
                          className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 group"
                        >
                          <TableCell className="px-4 py-3 align-middle text-center">
                            <Checkbox
                              checked={selectedRows.includes(item.serialNo)}
                              onCheckedChange={(checked) =>
                                handleSelectRow(item.serialNo, checked)
                              }
                              aria-label={`Select row ${item.serialNo}`}
                              className="border-slate-300 rounded data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 transition-all opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100"
                            />
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleActionClick(item)}
                              disabled={selectedRows.length >= 2}
                              className="h-8 px-3 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 transition-all text-xs font-medium w-full max-w-[100px] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
                            >
                              Edit
                            </Button>
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-center font-medium text-slate-500 text-xs">{index + 1}</TableCell>
                          <TableCell className="px-4 py-3 align-middle">
                            <span className="font-mono text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                              {item.regId}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle font-medium text-slate-800">
                            {item.beneficiaryName}
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-slate-700">
                            {item.fatherName}
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-slate-700">
                            {item.mobileNumber}
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-slate-600">
                            {item.village}
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-slate-600">
                            {item.block}
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-slate-600">
                            {item.district}
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-center text-slate-600">
                            {item.pincode}
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-center">
                            <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 font-medium">
                              {item.pumpCapacity}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-center">
                            <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 font-medium">
                              {item.pumpHead}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-slate-600 font-medium">
                            {item.ipName}
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-center">
                            {item.surveyFile ? (
                              <a
                                href={getPreviewUrl(item.surveyFile)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 hover:underline hover:bg-blue-50 px-2 py-1 rounded transition-colors text-sm font-medium"
                              >
                                <Upload className="h-4 w-4" /> View
                              </a>
                            ) : (
                              <span className="text-slate-400 italic text-sm">--</span>
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-center text-slate-600">
                            {item.planned2 || "--"}
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-center text-slate-600">
                            {item.actual2 || "--"}
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-center">
                            {item.delay2 > 0 ? (
                              <span className="text-red-600 font-medium">{item.delay2} Days</span>
                            ) : (
                              <span className="text-slate-400">--</span>
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-center">
                            <Badge
                              className={`
                                ${item.surveyStatus === "Completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""}
                                ${item.surveyStatus === "Pending" ? "bg-amber-50 text-amber-700 border-amber-200" : ""}
                              `}
                              variant="outline"
                            >
                              {item.surveyStatus || "Pending"}
                            </Badge>
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

      {/* survey DIALOG WITH PREFILLED INFO */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          showCloseButton={!isSuccess}
          className={`max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:rounded-2xl ${isSuccess ? "bg-transparent shadow-none! border-none!" : ""
            }`}
        >
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center w-full p-8 text-center space-y-6 animate-in fade-in duration-300">
              <div className="rounded-full bg-white p-5 shadow-2xl shadow-white/20 ring-8 ring-white/10 animate-in zoom-in duration-500 ease-out">
                <CheckCircle2 className="h-16 w-16 text-emerald-600 scale-110" />
              </div>
              <h2 className="text-3xl font-bold text-white drop-shadow-md animate-in slide-in-from-bottom-4 fade-in duration-500 delay-150 ease-out tracking-wide">
                Approved Successfully!
              </h2>
            </div>
          ) : (
            <>
              <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-white sticky top-0 z-10 shadow-sm">
                <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg border border-blue-100/50">
                    <FileCheck className="h-5 w-5 text-blue-600" />
                  </div>
                  Process Survey
                </DialogTitle>
                <DialogDescription className="text-slate-500 ml-12 text-sm">
                  {isBulk ? (
                    <span>
                      Applying changes to{" "}
                      <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                        {selectedRows.length} selected items
                      </span>
                      . All fields below will be updated for these items.
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Processing survey for{" "}
                      <span className="font-semibold text-slate-700">
                        {selectedItem?.beneficiaryName}
                      </span>{" "}
                      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded-md text-slate-600 border border-slate-200">
                        Reg ID: {selectedItem?.regId}
                      </span>
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>

              {(selectedItem || isBulk) && (
                <div className="p-6 space-y-8 bg-slate-50/30">
                  {/* PREFILLED BENEFICIARY DETAILS CARD */}
                  {selectedItem && !isBulk && (
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                        <div className="p-1 bg-emerald-50 rounded shadow-sm border border-emerald-100">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                        BENEFICIARY DETAILS
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8">
                        <div className="space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                            Reg ID
                          </span>
                          <div className="font-semibold text-slate-800 font-mono bg-slate-50 px-2.5 py-1 rounded border border-slate-200 inline-block break-all text-sm">
                            {selectedItem.regId}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                            Father's Name
                          </span>
                          <p className="font-medium text-slate-800 text-sm">
                            {selectedItem.fatherName}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                            Village & Block
                          </span>
                          <p className="font-medium text-slate-800 text-sm">
                            {selectedItem.village}, {selectedItem.block}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                            District
                          </span>
                          <p className="font-medium text-slate-800 text-sm">
                            {selectedItem.district}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                            Pump Type
                          </span>
                          <Badge
                            variant="secondary"
                            className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-none whitespace-normal text-left h-auto leading-tight group-hover:bg-slate-200 transition-colors"
                          >
                            {selectedItem.pumpCapacity}
                          </Badge>
                        </div>
                        <div className="space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                            Company
                          </span>
                          <p className="font-medium text-slate-800 text-sm">
                            {selectedItem.ipName}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* READ ONLY INFO GRID FOR BULK OR SINGLE */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-2">
                    <div className="space-y-1.5 flex flex-col">
                      <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Beneficiary Name
                      </Label>
                      <Input
                        value={isBulk ? "Multiple" : (selectedItem?.beneficiaryName || "")}
                        readOnly
                        className="bg-slate-50 border-slate-200 text-slate-700 h-10 font-medium cursor-not-allowed shadow-none"
                      />
                    </div>
                    <div className="space-y-1.5 flex flex-col">
                      <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Mobile Number
                      </Label>
                      <Input
                        value={isBulk ? "Multiple" : (selectedItem?.mobileNumber || "")}
                        readOnly
                        className="bg-slate-50 border-slate-200 text-slate-700 h-10 font-medium cursor-not-allowed shadow-none"
                      />
                    </div>
                    <div className="space-y-1.5 flex flex-col">
                      <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Village
                      </Label>
                      <Input
                        value={isBulk ? "Multiple" : (selectedItem?.village || "")}
                        readOnly
                        className="bg-slate-50 border-slate-200 text-slate-700 h-10 font-medium cursor-not-allowed shadow-none"
                      />
                    </div>
                    <div className="space-y-1.5 flex flex-col">
                      <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Pump Capacity
                      </Label>
                      <Input
                        value={isBulk ? "Multiple" : (selectedItem?.pumpCapacity || "")}
                        readOnly
                        className="bg-slate-50 border-slate-200 text-slate-700 h-10 font-medium cursor-not-allowed shadow-none"
                      />
                    </div>
                    <div className="space-y-1.5 flex flex-col">
                      <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        IP Name
                      </Label>
                      <Input
                        value={isBulk ? "Multiple" : (selectedItem?.ipName || "")}
                        readOnly
                        className="bg-slate-50 border-slate-200 text-slate-700 h-10 font-medium cursor-not-allowed shadow-none"
                      />
                    </div>
                  </div>

                  {/* SURVEY INPUT FORM */}
                  <div className="space-y-6 pt-6 border-t border-slate-200 mt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-5 w-1.5 bg-blue-600 rounded-full"></div>
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                        Survey Details
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5 flex flex-col">
                        <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Actual Survey Date
                        </Label>
                        <Input
                          type="date"
                          value={formData.actual2}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              actual2: e.target.value,
                            })
                          }
                          className="h-10 border-slate-200 focus:border-blue-500 focus-visible:ring-blue-500/20 transition-all bg-white shadow-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        {/* Empty placeholder to align grid correctly if needed */}
                      </div>
                      <div className="space-y-1.5 flex flex-col">
                        <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Survey Status
                        </Label>
                        <select
                          value={formData.surveyStatus}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              surveyStatus: e.target.value,
                            })
                          }
                          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300 transition-colors shadow-sm appearance-none cursor-pointer"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='2' stroke='%2364748B'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>
                      <div className="space-y-2 flex items-end">
                      </div>
                      <div className="space-y-2 md:col-span-2">
                      </div>
                      <div className="space-y-1.5 flex flex-col md:col-span-2">
                        <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                          Survey Document
                        </Label>
                        {selectedItem?.surveyFile && (
                          <div className="mb-4 p-3.5 bg-blue-50/50 rounded-lg border border-blue-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100/50 rounded text-blue-600">
                                <FileCheck className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 font-medium mb-0.5">Current Document</p>
                                <a
                                  href={selectedItem.surveyFile}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-sm font-semibold hover:underline"
                                >
                                  View Uploaded File
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                        <div
                          className="border-2 border-dashed border-slate-200 rounded-xl p-8 bg-slate-50/50 flex flex-col items-center justify-center gap-4 hover:bg-blue-50/30 hover:border-blue-400/50 transition-all cursor-pointer group"
                          onClick={() =>
                            document.getElementById("survey-file")?.click()
                          }
                        >
                          <div className="h-14 w-14 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200 group-hover:scale-110 group-hover:border-blue-200 group-hover:shadow-blue-100 transition-all duration-300">
                            <Upload className="h-6 w-6 text-slate-400 group-hover:text-blue-500 transition-colors" />
                          </div>
                          <div className="text-center space-y-1.5">
                            <span className="text-base font-semibold text-slate-700 group-hover:text-blue-700 transition-colors block">
                              {formData.surveyFile
                                ? formData.surveyFile
                                : "Click or drag to upload"}
                            </span>
                            <p className="text-xs text-slate-500 font-medium">
                              PNG, JPG, PDF up to 10MB
                            </p>
                          </div>
                          <Input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="survey-file"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      disabled={isSubmitting}
                      className="text-slate-600 hover:bg-slate-50 h-10 px-6 font-medium border-slate-200 shadow-sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm hover:shadow transition-all"
                    >
                      {isSubmitting ? "Processing..." : "Submit Survey"}
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
