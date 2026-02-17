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

export default function SanctionPage() {
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
      setSelectedRows(filteredPendingItems.map((item) => item.serialNo));
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
    const matchesSearch = Object.values(item).some((value) =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
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
    const matchesSearch = Object.values(item).some((value) =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
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

          sanctionNo: row.sanction_no || "",
          sanctionDate: row.sanction_date || "",
          sanctionFile: row.sanction_file || "",
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
      installer: "",
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

      // Upload Survey File to Supabase Storage
      if (formData.surveyFileObj) {
        const file = formData.surveyFileObj;
        const filePath = `survey-documents/${Date.now()}_${file.name}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("Image_bucket")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("Image_bucket")
          .getPublicUrl(filePath);

        finalFileUrl = urlData?.publicUrl || "";
      }

      // Prepare items to process
      const itemsToProcess = isBulk
        ? pendingItems.filter((item) => selectedRows.includes(item.serialNo))
        : [selectedItem];

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
          console.error("Item reg_id missing for update", item);
          return;
        }

        const { error } = await supabase
          .from("survey")
          .update(rowUpdate)
          .eq("reg_id", item.regId);

        if (error) throw error;
      });

      await Promise.all(updatePromises);
      await fetchData();
      setIsSuccess(true);
      if (isBulk) setSelectedRows([]);
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to submit data.");
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
          className="mt-6 focus-visible:outline-hidden animate-in fade-in-0 slide-in-from-left-4 duration-500 ease-out"
        >
          <Card className="border border-blue-100 shadow-xl shadow-blue-100/20 bg-white/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="border-b border-blue-50 bg-blue-50/30 px-6 py-0.5 h-10 flex items-center">
              <div className="flex flex-col md:flex-row items-center gap-4 w-full justify-between">
                <CardTitle className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                  <div className="p-1 bg-blue-100 rounded-lg">
                    <FileCheck className="h-4 w-4 text-blue-600" />
                  </div>
                  Pending for Survey
                </CardTitle>

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

                  <div className="flex items-center gap-3 justify-end w-full md:w-auto">
                    {selectedRows.length >= 2 && (
                      <Button
                        onClick={handleBulkClick}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 transition-all duration-300 animate-in fade-in slide-in-from-right-4 h-9"
                        size="sm"
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Sanction Selected ({selectedRows.length})
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
                  { key: "pumpSource", label: "Pump Source" },
                  { key: "pumpCapacity", label: "Pump Capacity" },
                  { key: "ipName", label: "IP Name" },
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
                    pumpSource: "",
                    pumpCapacity: "",
                    ipName: "",
                  })
                }
                className="mt-3 text-xs"
              >
                Clear All Filters
              </Button>
            </div>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="[&_th]:text-center [&_td]:text-center">
                  <TableHeader className="bg-gradient-to-r from-blue-50/50 to-cyan-50/50">
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
                    {filteredPendingItems.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={13}
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
                              <FileCheck className="h-3.5 w-3.5" />
                              Submit
                            </Button>
                          </TableCell>
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
                          <TableCell className="text-slate-600">
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
          className="mt-6 focus-visible:outline-hidden animate-in fade-in-0 slide-in-from-right-4 duration-500 ease-out"
        >
          <Card className="border border-blue-100 shadow-xl shadow-blue-100/20 bg-white/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="border-b border-blue-50 bg-blue-50/30 px-6 py-0.5 h-10 flex items-center">
              <div className="flex flex-col md:flex-row items-center gap-4 w-full justify-between">
                <CardTitle className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                  <div className="p-1 bg-blue-100 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  </div>
                  Completed Survey History
                </CardTitle>

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
                  <Badge
                    variant="outline"
                    className="bg-blue-100 text-blue-700 border-blue-200 px-3 py-1 h-9 flex items-center whitespace-nowrap"
                  >
                    {filteredHistoryItems.length} Completed
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
                  { key: "pumpSource", label: "Pump Source" },
                  { key: "pumpCapacity", label: "Pump Capacity" },
                  { key: "ipName", label: "IP Name" },
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
                    pumpSource: "",
                    pumpCapacity: "",
                    ipName: "",
                  })
                }
                className="mt-3 text-xs"
              >
                Clear All Filters
              </Button>
            </div>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="[&_th]:text-center [&_td]:text-center">
                  <TableHeader className="bg-gradient-to-r from-blue-50/50 to-cyan-50/50">
                    <TableRow className="border-b border-blue-100 hover:bg-transparent">
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Action
                      </TableHead>
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
                        Photo
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Planned Date
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Survey Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistoryItems.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={22}
                          className="h-48 text-center text-slate-500 bg-slate-50/30"
                        >
                          No survey history found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredHistoryItems.map((item) => (
                        <TableRow
                          key={item.serialNo}
                          className="hover:bg-blue-50/30 transition-colors"
                        >
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleActionClick(item)}
                              className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 shadow-xs text-xs font-semibold h-8 px-4 rounded-full flex items-center gap-2 transition-all duration-300 mx-auto"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                          </TableCell>
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
                          <TableCell className="text-slate-600">
                            {item.ipName}
                          </TableCell>
                          <TableCell className="py-3 px-4">
                            {item.surveyFile ? (
                              <div className="flex justify-center">
                                <a
                                  href={getPreviewUrl(item.surveyFile)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 flex items-center gap-2 hover:text-blue-800 transition-colors group"
                                >
                                  <Upload className="h-4 w-4" />
                                  <span className="underline font-medium text-sm">View</span>
                                </a>
                              </div>
                            ) : (
                              <span className="text-slate-300 font-mono text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-600 whitespace-nowrap">
                            {item.planned2 || "-"}
                          </TableCell>
                          <TableCell className="text-slate-600 whitespace-nowrap">
                            {item.actual2 || "-"}
                          </TableCell>
                          <TableCell className="text-red-500 font-medium">
                            {item.delay2 > 0 ? `${item.delay2} Days` : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-xs font-medium ${item.surveyStatus === "Completed"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : item.surveyStatus === "Pending"
                                }`}
                            >
                              {item.surveyStatus}
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

      {/* SANCTION DIALOG WITH PREFILLED INFO */}
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
                Approved Successfully!
              </h2>
            </div>
          ) : (
            <>
              <DialogHeader className="p-6 pb-2 border-b border-blue-100 bg-blue-50/30">
                <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent flex items-center gap-2">
                  <span className="bg-blue-100 p-1.5 rounded-md">
                    <FileCheck className="h-4 w-4 text-blue-600" />
                  </span>
                  Process Survey
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
                      Processing survey for{" "}
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
                  {/* PREFILLED BENEFICIARY DETAILS CARD */}
                  {selectedItem && !isBulk && (
                    <div className="rounded-xl border border-blue-100 bg-linear-to-br from-blue-50/50 to-cyan-50/30 p-5 shadow-sm">
                      <h3 className="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2 border-b border-blue-100 pb-2">
                        <span className="bg-white p-1 rounded shadow-sm">
                          <CheckCircle2 className="h-4 w-4 text-blue-500" />
                        </span>
                        BENEFICIARY DETAILS
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-5 gap-x-6">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-blue-900/60 block mb-1">
                            Reg ID
                          </span>
                          <div className="font-medium text-slate-700 font-mono bg-white/50 px-2 py-1 rounded border border-blue-100/50 inline-block break-all">
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
                            className="whitespace-normal text-left h-auto leading-tight"
                          >
                            {selectedItem.pumpCapacity}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-blue-900/60 block mb-1">
                            Company
                          </span>
                          <p className="font-medium text-slate-700">
                            {selectedItem.ipName}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SURVEY INPUT FORM */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-5 w-1 bg-cyan-500 rounded-full"></div>
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                        Survey Details
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
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
                          className="h-10 border-slate-200 focus:border-cyan-400 focus-visible:ring-cyan-100 transition-all bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
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
                          className="h-10 border-slate-200 focus:border-cyan-400 focus-visible:ring-cyan-100 transition-all bg-white border px-3 rounded-md"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>
                      <div className="space-y-2 flex items-end">
                      </div>
                      <div className="space-y-2 md:col-span-2">
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-sm font-medium text-slate-700">
                          Survey Document
                        </Label>
                        {selectedItem?.surveyFile && (
                          <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <p className="text-xs text-slate-600 mb-1">Current Document:</p>
                            <a
                              href={selectedItem.surveyFile}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline text-sm flex items-center gap-1 hover:text-blue-800"
                            >
                              <Upload className="h-4 w-4" />
                              View Current Survey Document
                            </a>
                          </div>
                        )}
                        <div
                          className="border-2 border-dashed border-slate-200 rounded-2xl p-8 bg-slate-50/30 flex flex-col items-center justify-center gap-4 hover:bg-slate-50 hover:border-blue-400/50 transition-all cursor-pointer group"
                          onClick={() =>
                            document.getElementById("survey-file")?.click()
                          }
                        >
                          <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-xl border border-slate-50 group-hover:scale-110 transition-transform duration-300">
                            <Upload className="h-8 w-8 text-[#0EA5E9]" />
                          </div>
                          <div className="text-center space-y-1">
                            <span className="text-lg font-semibold text-[#0369a1] block">
                              {formData.surveyFile
                                ? formData.surveyFile
                                : "Upload Survey Photo"}
                            </span>
                            <p className="text-sm text-slate-400 font-medium">
                              PNG, JPG or JPEG (max. 10MB)
                            </p>
                          </div>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="survey-file"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-6 mt-8">
                    <Button
                      variant="ghost"
                      onClick={() => setIsDialogOpen(false)}
                      disabled={isSubmitting}
                      className="text-slate-600 hover:text-slate-900 font-semibold text-base transition-colors"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="h-14 px-12 bg-gradient-to-r from-[#0EA5E9] to-[#2563EB] hover:from-[#0284C7] hover:to-[#1D4ED8] text-white font-bold text-lg rounded-2xl shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 transition-all duration-300 transform active:scale-95"
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
    </div >
  );
}
