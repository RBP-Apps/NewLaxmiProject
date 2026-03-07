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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Wrench,
  Upload,
  FileCheck,
  Pencil,
  Loader2,
  CheckCircle2,
  Search,
  X,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function InstallationPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [isSuccess, setIsSuccess] = useState(false);
  const [pendingItems, setPendingItems] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState([]);
  const [isBulk, setIsBulk] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [filters, setFilters] = useState({
    regId: "",
    village: "",
    block: "",
    district: "",
    pumpSource: "",
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
      (!filters.pumpSource || item.pumpSource === filters.pumpSource) &&
      (!filters.pumpType || item.pumpType === filters.pumpType) &&
      (!filters.company || item.company === filters.company);

    return matchesSearch && matchesFilters;
  });

  const [formData, setFormData] = useState({
    installationStatus: "Done",
    installationDate: "",
    existingPhotos: [],
    photoFileObjs: [],
    delay4: "",
  });

  const getPreviewUrl = (url) => {
    if (!url) return url;
    return url;
  };
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Get logged in user details
      const loggedInUserStr = localStorage.getItem("loggedInUser");
      const loggedInUser = loggedInUserStr ? JSON.parse(loggedInUserStr) : null;
      const isIpRole = loggedInUser?.role === "IP";
      const userIpName = loggedInUser?.ipName || "";

      // 1. Fetch dispatch_material to identify pending reg_ids and history records
      const { data: insData, error: insError } = await supabase.from("installation").select("*");
      if (insError) throw insError;

      const pendingRegIds = [];
      const imMap = {};
      const historyItemsParsed = [];

      insData.forEach((row) => {
        const isPlanned4 = row.planned_4 != null && String(row.planned_4).trim() !== "";
        const isActual4 = row.actual_4 != null && String(row.actual_4).trim() !== "";

        if (isPlanned4 && isActual4) {
          // History: both set
          historyItemsParsed.push({
            id: row.id,
            regId: row.reg_id || "-",
            serialNo: row.serial_no || "-",
            installationStatus: row.installation_status || "",
            installationDate: row.installation_date || "",
            photoUploadedOnUpadApp: row.photo_uploaded_on_upad_app || "",
            delay4: row.delay_4 || "",
            actual4: row.actual_4 || "",
            planned4: row.planned_4 || "",
          });
        } else if (isPlanned4 && !isActual4) {
          // Pending: planned_4 set but actual_4 not set
          const regId = row.reg_id;
          if (regId) {
            pendingRegIds.push(regId);
            imMap[regId] = row;
          }
        }
      });

      // 2. Fetch portal records matching pending reg_ids
      let parsedPending = [];
      if (pendingRegIds.length > 0) {
        let portalQuery = supabase.from("portal").select("*").in("reg_id", pendingRegIds);

        // Apply IP role filter if necessary
        if (isIpRole && userIpName) {
          portalQuery = portalQuery.eq("ip_name", userIpName);
        }

        const { data: portalData, error: portalError } = await portalQuery;

        if (portalError) throw portalError;

        parsedPending = portalData.map((row) => {
          const insRow = imMap[row.reg_id] || {};
          return {
            id: insRow.id, // installation id for update
            regId: row.reg_id || "-",
            serialNo: row.serial_no || "-",
            beneficiaryName: row.beneficiary_name || "-",
            mobileNumber: row.mobile_number || "-",
            fatherName: row.fathers_name || "-",
            village: row.village || "-",
            block: row.block || "-",
            district: row.district || "-",
            category: row.category || "-",
            pumpSource: row.pump_source || "-",
            pumpCapacity: row.pump_capacity || "-",
            pumpHead: row.pump_head || "-",
            ipName: row.ip_name || "-",
            pincode: row.pincode || "-",
            installer: row.installer || row.installer_name || row["Installer Name"] || "-",
            installationStatus: insRow.installation_status || "Pending",
          };
        });
      }

      // 3. For History records, we need some portal info too
      if (historyItemsParsed.length > 0) {
        const historyRegIds = historyItemsParsed.map((i) => i.regId);

        // Base query for history portal data
        let portalHistQuery = supabase
          .from("portal")
          .select("reg_id, beneficiary_name, mobile_number, village, pump_capacity, pump_head, ip_name")
          .in("reg_id", historyRegIds);

        // Apply IP role filter if necessary
        if (isIpRole && userIpName) {
          portalHistQuery = portalHistQuery.eq("ip_name", userIpName);
        }

        const { data: portalHistData, error: portalHistError } = await portalHistQuery;

        if (!portalHistError && portalHistData) {
          const portalHistMap = {};
          portalHistData.forEach((p) => (portalHistMap[p.reg_id] = p));

          // Filter out history items that do not belong to the IP user (if IP role)
          const validHistoryItems = [];

          historyItemsParsed.forEach((item) => {
            const pData = portalHistMap[item.regId];

            // If IP role and the record isn't in filtered portal data, skip it
            if (isIpRole && !pData) return;

            item.beneficiaryName = pData?.beneficiary_name || "-";
            item.mobileNumber = pData?.mobile_number || "-";
            item.village = pData?.village || "-";
            item.pumpCapacity = pData?.pump_capacity || "-";
            item.pumpHead = pData?.pump_head || "-";
            item.ipName = pData?.ip_name || "-";

            validHistoryItems.push(item);
          });

          setHistoryItems(validHistoryItems);
        } else {
          // If there's an error or no data, and it's an IP role, show nothing (filtered out)
          setHistoryItems(isIpRole ? [] : historyItemsParsed);
        }
      } else {
        setHistoryItems([]);
      }

      setPendingItems(parsedPending);
    } catch (err) {
      console.error("Installation fetch error:", err);
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

  // Local storage logic removed as per request

  const handleActionClick = (item) => {
    setSelectedItem(item);
    setIsSuccess(false);
    setIsBulk(false);
    let photos = [];
    if (item.photoUploadedOnUpadApp && typeof item.photoUploadedOnUpadApp === 'string') {
      photos = item.photoUploadedOnUpadApp.split(',').filter(Boolean).map(s => s.trim());
    }

    setFormData({
      installationStatus: item.installationStatus === "Completed" ? "Done" : (item.installationStatus || "Done"),
      installationDate: item.installationDate || "",
      existingPhotos: photos,
      photoFileObjs: [],
      delay4: item.delay4 || "",
    });
    setIsDialogOpen(true);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const items = activeTab === "history" ? filteredHistoryItems : filteredPendingItems;
      setSelectedRows(items.map((item) => item.serialNo || item.id)); // Use ID for history if serialNo not available? Let's check historyItems structure
      // historyItemsParsed has: id, regId, serialNo.
      // pendingItems has: id, regId, serialNo.
      // So use item.serialNo if it's the key, or id.
      // previous implementation used serialNo for Pending.
      // Let's stick to serialNo as key if unique, but history items might not have it or might be duplicate?
      // Wait, history items are fetched from installation table. They have unique IDs.
      // Pending items are from portal table (mapped). Portal table has unique reg_id or serial_no?
      // In pending map: `id: insRow.id`. If pending, insRow might be empty?
      // Ah, pending items are those with `planned_4` but NO `actual_4`. So they exist in installation table.
      // So they have `id` from installation table.
      // Let's use `id` (installation table ID) as the key for selection, to be safe.
      // But `handleSelectRow` uses `serialNo`. Let's check `filteredPendingItems` map.
      // `id: insRow.id`. `serialNo: row.serial_no`.
      // The pending table uses `item.serialNo` as key for checkbox.
      // If we change to ID, we must update table row checkbox too.
      // Let's check if serialNo is reliable.
      // In `foundation` page we used `id`.
      // In `survey` page we used `serialNo`.
      // In `work-order` we used `regId`.
      // Let's stick to `serialNo` if that's what `installation` page is already using for Pending.
      // Yes, `selectedRows` stores `serialNo`.
      setSelectedRows(items.map((item) => item.serialNo));
    } else {
      setSelectedRows([]);
    }
  };

  useEffect(() => {
    setSelectedRows([]);
    setSelectedItem(null);
  }, [activeTab]);

  const handleSelectRow = (serialNo, checked) => {
    if (checked) {
      setSelectedRows((prev) => [...prev, serialNo]);
    } else {
      setSelectedRows((prev) => prev.filter((id) => id !== serialNo));
    }
  };

  const handleBulkClick = () => {
    setIsBulk(true);
    setSelectedItem(null);
    setIsSuccess(false);
    setFormData({
      installationStatus: "Done",
      installationDate: "",
      existingPhotos: [],
      photoFileObjs: [],
      delay4: "",
    });
    setIsDialogOpen(true);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileUpload = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const currentNewFiles = formData.photoFileObjs || [];
      const currentExisting = formData.existingPhotos || [];

      if (currentExisting.length + currentNewFiles.length + newFiles.length > 5) {
        alert("You can only upload a maximum of 5 photos.");
        return;
      }

      setFormData({
        ...formData,
        photoFileObjs: [...currentNewFiles, ...newFiles],
      });
    }
  };

  const removeNewFile = (indexToRemove) => {
    const newFileObjs = (formData.photoFileObjs || []).filter((_, index) => index !== indexToRemove);
    setFormData({
      ...formData,
      photoFileObjs: newFileObjs,
    });
  };

  const removeExistingFile = (indexToRemove) => {
    const newExisting = (formData.existingPhotos || []).filter((_, index) => index !== indexToRemove);
    setFormData({
      ...formData,
      existingPhotos: newExisting,
    });
  };

  const getBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async () => {
    if (!selectedItem && (!isBulk || selectedRows.length === 0)) return;
    setIsSubmitting(true);

    try {
      // 1. UPLOAD FILE ONCE (if any)
      let uploadedUrls = [...(formData.existingPhotos || [])];

      if (formData.photoFileObjs && formData.photoFileObjs.length > 0) {
        for (const file of formData.photoFileObjs) {
          const filePath = `installation-photos/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("Image_bucket")
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from("Image_bucket")
            .getPublicUrl(filePath);

          if (urlData?.publicUrl) {
            uploadedUrls.push(urlData.publicUrl);
          }
        }
      }

      const finalFileUrl = uploadedUrls.length > 0 ? uploadedUrls.join(",") : "";

      // 2. IDENTIFY ITEMS
      let itemsToProcess = [];
      const currentItems = activeTab === "history" ? historyItems : pendingItems;
      if (isBulk) {
        itemsToProcess = currentItems.filter((item) =>
          selectedRows.includes(item.serialNo)
        );
      } else {
        itemsToProcess = [selectedItem];
      }

      // 3. UPDATE via Supabase
      const updatePromises = itemsToProcess.map(async (item) => {
        const rowUpdate = {
          installation_status: formData.installationStatus,
          installation_date: formData.installationDate || null,
          delay_4: formData.delay4,
        };

        if (isBulk) {
          if (formData.photoFileObjs && formData.photoFileObjs.length > 0) {
            rowUpdate.photo_uploaded_on_upad_app = finalFileUrl;
          }
        } else {
          rowUpdate.photo_uploaded_on_upad_app = finalFileUrl || null;
        }

        // Set actual_4 if missing (first installation)
        if (!item.actual4) {
          const now = new Date();
          const timestampStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
          rowUpdate.actual_4 = timestampStr;
        }

        if (!item.id) {
          console.error("Item ID missing for update", item);
          return;
        }

        const { error } = await supabase
          .from("installation")
          .update(rowUpdate)
          .eq("id", item.id);

        if (error) throw error;
      });

      await Promise.all(updatePromises);

      // 4. SUCCESS
      setSelectedRows([]);
      setIsBulk(false);
      setIsSuccess(true);
      fetchData();
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to Submit: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 md:p-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="space-y-1.5">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span className="bg-blue-600 w-2 h-8 rounded-full hidden md:block"></span>
            Installation Management
          </h1>
          <p className="text-slate-500 text-sm md:text-base max-w-2xl">
            Monitor and process pending installations, and review the history of completed work.
          </p>
        </div>
      </div>

      <Tabs
        defaultValue="pending"
        className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-backwards"
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full max-w-md grid-cols-2 p-1 bg-slate-200/50 rounded-xl h-12 border border-slate-200/60 shadow-inner">
          <TabsTrigger
            value="pending"
            className="rounded-lg text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
          >
            Pending Installation
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="rounded-lg text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
          >
            Installation History
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
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100/50 border border-blue-200/50">
                  <Wrench className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-slate-800">
                    Pending Installations
                  </CardTitle>
                  <p className="text-sm text-slate-500">
                    Manage and update installation status
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
                    {filteredPendingItems.length} Records
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
                  { key: "pumpType", label: "Pump Type" },
                  { key: "company", label: "Company" },
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
                        pumpType: "",
                        company: "",
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
                            selectedRows.length === filteredPendingItems.length
                          }
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all rows"
                          className="border-slate-300 rounded data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                        />
                      </TableHead>
                      <TableHead className="w-[120px] font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-center">Action</TableHead>
                      <TableHead className="w-14 font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-center">S.No</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-left min-w-[120px]">Reg ID</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-left min-w-[150px]">Beneficiary Name</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-left min-w-[130px]">Father's Name</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-left min-w-[120px]">Mobile Number</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-left min-w-[100px]">Village</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-left min-w-[100px]">Block</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-left min-w-[100px]">District</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-center min-w-[100px]">Pincode</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-center min-w-[130px]">Pump Capacity</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-center min-w-[130px]">Pump Head</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-left min-w-[150px]">IP Name</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 6 }).map((_, index) => (
                        <TableRow
                          key={`install-skel-${index}`}
                          className="animate-pulse border-b border-slate-100"
                        >
                          {Array.from({ length: 14 }).map((__, i) => (
                            <TableCell key={i} className="px-4 py-3">
                              <div className="h-4 w-full bg-slate-200 rounded"></div>
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
                              <Wrench className="h-6 w-6 text-slate-400" />
                            </div>
                            <p className="text-sm">
                              No pending installation requests found matching your search.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPendingItems.map((item, index) => (
                        <TableRow
                          key={item.regId}
                          className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 group"
                        >
                          <TableCell className="px-4 py-3 align-middle text-center">
                            <Checkbox
                              checked={selectedRows.includes(item.serialNo)}
                              onCheckedChange={(checked) => handleSelectRow(item.serialNo, checked)}
                              aria-label={`Select row ${item.serialNo}`}
                              className="border-slate-300 rounded data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 transition-all opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100"
                            />
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedItem(item);
                                setIsBulk(false);
                                setIsSuccess(false);
                                setFormData({
                                  installationStatus: "Done",
                                  installationDate: "",
                                  photoUploadedOnUpadApp: null,
                                  delay4: "",
                                });
                                setIsDialogOpen(true);
                              }}
                              disabled={selectedRows.length >= 2}
                              className="h-8 px-3 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 transition-all text-xs font-medium w-full max-w-[100px] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
                            >
                              Install
                            </Button>
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-center font-medium text-slate-500 text-xs">{index + 1}</TableCell>
                          <TableCell className="px-4 py-3 align-middle">
                            <span className="font-mono text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                              {item.regId}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle font-medium text-slate-800">{item.beneficiaryName}</TableCell>
                          <TableCell className="px-4 py-3 align-middle text-slate-600">{item.fatherName}</TableCell>
                          <TableCell className="px-4 py-3 align-middle text-slate-700">{item.mobileNumber}</TableCell>
                          <TableCell className="px-4 py-3 align-middle text-slate-600">{item.village}</TableCell>
                          <TableCell className="px-4 py-3 align-middle text-slate-600">{item.block}</TableCell>
                          <TableCell className="px-4 py-3 align-middle text-slate-600">{item.district}</TableCell>
                          <TableCell className="px-4 py-3 align-middle text-slate-600 text-center">{item.pincode}</TableCell>
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
                          <TableCell className="px-4 py-3 align-middle text-slate-600 font-medium">{item.ipName}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden space-y-4 p-4 bg-slate-50">
                {filteredPendingItems.map((item) => (
                  <Card
                    key={item.serialNo}
                    className="bg-white border text-sm shadow-sm"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <Badge
                            variant="secondary"
                            className="bg-slate-100 text-slate-600"
                          >
                            {item.serialNo}
                          </Badge>
                          <h4 className="font-semibold text-base text-slate-800">
                            {item.beneficiaryName}
                          </h4>
                          <p className="text-muted-foreground text-xs font-mono">
                            {item.regId}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs"
                        >
                          Pending
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs border-t border-b py-3 my-2 border-slate-100">
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-400 text-[10px] uppercase font-semibold">
                            Father's Name
                          </span>
                          <span className="font-medium text-slate-700">
                            {item.fatherName}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-400 text-[10px] uppercase font-semibold">
                            Village
                          </span>
                          <span className="font-medium text-slate-700">
                            {item.village}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-400 text-[10px] uppercase font-semibold">
                            District
                          </span>
                          <span className="font-medium text-slate-700">
                            {item.district}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-400 text-[10px] uppercase font-semibold">
                            survey No
                          </span>
                          <span className="font-medium text-orange-600 font-mono">
                            {item.surveyNo || "-"}
                          </span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        disabled={selectedRows.length >= 2}
                        className="w-full bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => handleActionClick(item)}
                      >
                        <Wrench className="h-4 w-4 mr-2" />
                        Process Installation
                      </Button>
                    </CardContent>
                  </Card>
                ))}
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
                  <FileCheck className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-slate-800">
                    Installation History
                  </CardTitle>
                  <p className="text-sm text-slate-500">
                    Review previously completed or processed installations
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
                    {filteredHistoryItems.length} Records
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
                  { key: "pumpType", label: "Pump Type" },
                  { key: "company", label: "Company" },
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
                        pumpType: "",
                        company: "",
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
                        <Checkbox checked={filteredHistoryItems.length > 0 && selectedRows.length === filteredHistoryItems.length} onCheckedChange={handleSelectAll} className="border-slate-300 rounded data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" />
                      </TableHead>
                      <TableHead className="w-[120px] font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-center">Action</TableHead>
                      <TableHead className="w-14 font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-center">S.No</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-left min-w-[120px]">Reg ID</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-left min-w-[150px]">Beneficiary Name</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-left min-w-[120px]">Mobile Number</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-left min-w-[100px]">Village</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-center min-w-[130px]">Pump Capacity</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-center min-w-[130px]">Pump Head</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-left min-w-[150px]">IP Name</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-left min-w-[140px]">Installation Date</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-center min-w-[100px]">Photo</TableHead>
                      <TableHead className="font-semibold text-slate-700 h-11 text-xs uppercase tracking-wider text-center min-w-[120px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 6 }).map((_, index) => (
                        <TableRow
                          key={`history-skel-${index}`}
                          className="animate-pulse border-b border-slate-100"
                        >
                          {Array.from({ length: 13 }).map((__, i) => (
                            <TableCell key={i} className="px-4 py-3">
                              <div className="h-4 w-full bg-slate-200 rounded"></div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredHistoryItems.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={13}
                          className="h-48 text-center text-slate-500 bg-slate-50/50"
                        >
                          <div className="flex flex-col items-center justify-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center shadow-inner">
                              <FileCheck className="h-6 w-6 text-slate-400" />
                            </div>
                            <p className="text-sm">
                              {historyItems.length === 0
                                ? "No installation history found."
                                : "No history records found matching your search."}
                            </p>
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
                            <Checkbox checked={selectedRows.includes(item.serialNo || item.id)} onCheckedChange={(checked) => handleSelectRow(item.serialNo || item.id, checked)} className="border-slate-300 rounded data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 transition-all opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100" />
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
                          <TableCell className="px-4 py-3 align-middle font-medium text-slate-800">{item.beneficiaryName}</TableCell>
                          <TableCell className="px-4 py-3 align-middle text-slate-700">{item.mobileNumber}</TableCell>
                          <TableCell className="px-4 py-3 align-middle text-slate-600">{item.village}</TableCell>
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
                          <TableCell className="px-4 py-3 align-middle text-slate-600 font-medium">{item.ipName}</TableCell>
                          <TableCell className="px-4 py-3 align-middle text-slate-600">{item.installationDate}</TableCell>
                          <TableCell className="px-4 py-3 align-middle text-center">
                            {item.photoUploadedOnUpadApp ? (
                              <div className="flex flex-wrap items-center justify-center gap-2">
                                {item.photoUploadedOnUpadApp.split(',').filter(Boolean).map((url, i) => (
                                  <a key={i} href={getPreviewUrl(url.trim())} title={url.trim()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline hover:bg-blue-50 px-2 py-1 rounded transition-colors text-xs font-medium border border-blue-100 bg-white shadow-sm">
                                    <FileCheck className="h-3.5 w-3.5" /> Photo {i + 1}
                                  </a>
                                ))}
                              </div>
                              <a href={getPreviewUrl(item.photoUploadedOnUpadApp)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 hover:underline hover:bg-blue-50 px-2 py-1 rounded transition-colors text-sm font-medium">
                                <FileCheck className="h-4 w-4" /> View
                              </a>
                            ) : <span className="text-slate-400 italic text-sm">--</span>}
                          </TableCell>
                          <TableCell className="px-4 py-3 align-middle text-center">
                            <Badge
                              className={`
                                ${item.installationStatus === "Done" || item.installationStatus === "Completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""}
                                ${item.installationStatus === "Pending" ? "bg-amber-50 text-amber-700 border-amber-200" : ""}
                              `}
                              variant="outline"
                            >
                              {item.installationStatus || "Pending"}
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

      {/* INSTALLATION DIALOG */}
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
                Installed Successfully!
              </h2>
            </div>
          ) : (
            <>
              <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm">
                <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <span className="bg-blue-100 p-2 rounded-lg border border-blue-200/50 shadow-sm">
                    <Wrench className="h-4 w-4 text-blue-700" />
                  </span>
                  Process Installation Work
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
                      Update installation details for{" "}
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

              <div className="p-6 space-y-8 bg-slate-50/30">
                {(selectedItem || isBulk) && (
                  <>
                    {/* PREFILLED BENEFICIARY DETAILS CARD - Show in Bulk Mode too with props */}
                    {(isBulk || selectedItem) && (
                      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                          <FileCheck className="h-4 w-4 text-slate-400" />
                          Beneficiary Details
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-y-5 gap-x-6 text-sm">
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">
                              Serial No
                            </span>
                            <p className="font-medium text-slate-700">
                              {isBulk ? "Multiple" : selectedItem.serialNo}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">
                              Reg ID
                            </span>
                            <p className="font-medium text-slate-700 font-mono text-[13px] bg-slate-50 px-2 py-1 rounded border border-slate-100 break-all w-max max-w-full">
                              {isBulk ? "Multiple" : selectedItem.regId}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">
                              Beneficiary Name
                            </span>
                            <p className="font-medium text-slate-700">
                              {isBulk ? "Multiple" : selectedItem.beneficiaryName}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">
                              Father's Name
                            </span>
                            <p className="font-medium text-slate-700">
                              {isBulk ? "Multiple" : selectedItem.fatherName}
                            </p>
                          </div>
                          <div className="space-y-1 col-span-2 md:col-span-1 xl:col-span-2">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">
                              Village/Block
                            </span>
                            <p className="font-medium text-slate-700">
                              {isBulk ? "Multiple" : `${selectedItem.village}, ${selectedItem.block}`}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">
                              Pump Type
                            </span>
                            <p className="font-medium text-slate-600 bg-slate-100 inline-block px-2 py-0.5 rounded text-xs border border-slate-200">
                              {isBulk ? "Multiple" : selectedItem.pumpCapacity}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* INSTALLATION INPUT FORM */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700 flex justify-between items-center">
                          Installation Status
                          <span className="text-[10px] text-slate-400 font-normal">Required</span>
                        </Label>
                        <select
                          className="h-10 w-full border border-slate-300 rounded-md px-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium text-slate-700 shadow-sm"
                          value={formData.installationStatus}
                          onChange={(e) => setFormData({ ...formData, installationStatus: e.target.value })}
                        >
                          <option value="Done" className="text-slate-700">Done</option>
                          <option value="Pending" className="text-slate-700">Pending</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700 flex justify-between items-center">
                          Installation Date
                          <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                        </Label>
                        <Input type="date" value={formData.installationDate} onChange={(e) => setFormData({ ...formData, installationDate: e.target.value })} className="h-10 border-slate-300 focus:border-blue-400 focus-visible:ring-blue-100 transition-all shadow-sm" />
                      </div>

                      <div className="space-y-2 md:col-span-2 mt-2">
                        <Label className="text-sm font-medium text-slate-700">Installation Photo</Label>
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 bg-slate-50 flex flex-col items-center justify-center gap-3 hover:bg-slate-100/50 transition-all cursor-pointer group hover:border-blue-300" onClick={() => document.getElementById("photo-file")?.click()}>
                          <Input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" id="photo-file" />
                          <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200 group-hover:scale-110 transition-transform group-hover:border-blue-200 group-hover:shadow-blue-100">
                            <Upload className="h-6 w-6 text-slate-500 group-hover:text-blue-500 transition-colors" />
                          </div>
                          <div className="text-center space-y-1">
                            <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors block">
                              {formData.photoUploadedOnUpadApp ? "Change Photo" : "Upload Installation Photo"}
                            </span>
                            <p className="text-xs text-slate-500 block">PNG, JPG or JPEG (max. 10MB)</p>
                          </div>
                          {formData.photoUploadedOnUpadApp && (
                            <Badge variant="secondary" className="mt-2 bg-slate-100 text-slate-700 border-slate-200">
                              <FileCheck className="h-3 w-3 mr-1" />
                              {formData.photoUploadedOnUpadApp}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8 pt-5 border-t border-slate-200">
                      <Button
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                        disabled={isSubmitting}
                        className="h-10 px-6 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-sm"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="h-10 px-8 bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed min-w-[180px]"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Installing...</span>
                          </div>
                        ) : (
                          "Complete Installation"
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
