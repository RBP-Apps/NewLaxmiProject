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
    photoUploadedOnUpadApp: null,
    delay4: "",
  });

  const getPreviewUrl = (url) => {
    if (!url) return url;
    return url;
  };
  const fetchData = async () => {
    setIsLoading(true);
    try {
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
        const { data: portalData, error: portalError } = await supabase
          .from("portal")
          .select("*")
          .in("reg_id", pendingRegIds);

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
        const { data: portalHistData, error: portalHistError } = await supabase
          .from("portal")
          .select("reg_id, beneficiary_name, mobile_number, village, pump_capacity, pump_head, ip_name")
          .in("reg_id", historyRegIds);

        if (!portalHistError && portalHistData) {
          const portalHistMap = {};
          portalHistData.forEach((p) => (portalHistMap[p.reg_id] = p));

          historyItemsParsed.forEach((item) => {
            const pData = portalHistMap[item.regId] || {};
            item.beneficiaryName = pData.beneficiary_name || "-";
            item.mobileNumber = pData.mobile_number || "-";
            item.village = pData.village || "-";
            item.pumpCapacity = pData.pump_capacity || "-";
            item.pumpHead = pData.pump_head || "-";
            item.ipName = pData.ip_name || "-";
          });
        }
      }

      setPendingItems(parsedPending);
      setHistoryItems(historyItemsParsed);
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
    setFormData({
      installationStatus: item.installationStatus === "Completed" ? "Done" : (item.installationStatus || "Done"),
      installationDate: item.installationDate || "",
      photoUploadedOnUpadApp: item.photoUploadedOnUpadApp || null,
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
      // In `sanction` page we used `serialNo`.
      // In `loi-mr` we used `regId`.
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
      photoUploadedOnUpadApp: null,
      delay4: "",
    });
    setIsDialogOpen(true);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({
        ...formData,
        photoUploadedOnUpadApp: e.target.files[0].name,
        photoFileObj: e.target.files[0],
      });
    }
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
      let finalFileUrl = "";
      if (formData.photoFileObj) {
        const file = formData.photoFileObj;
        const filePath = `installation-photos/${Date.now()}_${file.name}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("Image_bucket")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("Image_bucket")
          .getPublicUrl(filePath);

        finalFileUrl = urlData?.publicUrl || "";
      }

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

        if (finalFileUrl) {
          rowUpdate.photo_uploaded_on_upad_app = finalFileUrl;
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
    <div className="space-y-8 p-6 md:p-8 max-w-[1600px] mx-auto bg-slate-50/50 min-h-screen animate-fade-in-up">
      <Tabs
        defaultValue="pending"
        className="w-full"
        onValueChange={setActiveTab}
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
            Pending Installation
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="z-10 h-full data-[state=active]:bg-transparent data-[state=active]:text-blue-700 data-[state=active]:shadow-none transition-colors duration-200 text-base font-medium text-slate-500"
          >
            Installation History
          </TabsTrigger>
        </TabsList>

        {/* PENDING TAB */}
        <TabsContent
          value="pending"
          className="mt-6 focus-visible:ring-0 focus-visible:outline-none animate-in fade-in-0 slide-in-from-left-4 duration-500 ease-out"
        >
          <Card className="border border-blue-100 shadow-xl shadow-blue-100/20 bg-white/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="border-b border-blue-50 bg-blue-50/30 px-6 py-3 flex flex-col md:flex-row items-center gap-4 md:gap-0 justify-between h-auto min-h-[3.5rem]">
              <div className="flex items-center gap-2 w-full md:w-auto justify-between">
                <CardTitle className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                  <div className="p-1 bg-blue-100 rounded-lg">
                    <Wrench className="h-4 w-4 text-blue-600" />
                  </div>
                  Pending Installation
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

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  {selectedRows.length >= 2 && (
                    <Button
                      onClick={handleBulkClick}
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 transition-all duration-300 animate-in fade-in slide-in-from-right-4 h-9"
                      size="sm"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Installation Selected ({selectedRows.length})
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
                  { key: "pumpSource", label: "Pump Source" },
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
                    pumpSource: "",
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
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap min-w-[150px]">
                        Action
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Reg ID</TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Beneficiary Name</TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Father's Name</TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Mobile Number</TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Village</TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Block</TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">District</TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Pincode</TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Pump Capacity</TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Pump Head</TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">IP Name</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 6 }).map((_, index) => (
                        <TableRow
                          key={`install-skel-${index}`}
                          className="animate-pulse"
                        >
                          {Array.from({ length: 12 }).map((__, i) => (
                            <TableCell key={i}>
                              <div className="h-4 w-full bg-slate-200 rounded mx-auto"></div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredPendingItems.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={12}
                          className="h-48 text-center text-slate-500 bg-slate-50/30"
                        >
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                              <Wrench className="h-6 w-6 text-slate-400" />
                            </div>
                            <p>
                              No pending installation requests found matching
                              your search
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPendingItems.map((item) => (
                        <TableRow
                          key={item.serialNo}
                          className="hover:bg-blue-50/30 transition-colors"
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
                              <Wrench className="h-3.5 w-3.5" />
                              Install
                            </Button>
                          </TableCell>

                          <TableCell className="whitespace-nowrap font-mono text-xs text-slate-500 bg-slate-50 py-1 px-2 rounded-md mx-auto w-fit">{item.regId}</TableCell>
                          <TableCell className="whitespace-nowrap font-medium text-slate-800">{item.beneficiaryName}</TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600">{item.fatherName}</TableCell>
                          <TableCell className="whitespace-nowrap text-slate-700">{item.mobileNumber}</TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600">{item.village}</TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600">{item.block}</TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600">{item.district}</TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600">{item.pincode}</TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600 font-medium text-blue-600 uppercase">{item.pumpCapacity}</TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600">{item.pumpHead}</TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600 font-medium">{item.ipName}</TableCell>
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
                            Sanction No
                          </span>
                          <span className="font-medium text-orange-600 font-mono">
                            {item.sanctionNo || "-"}
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
          className="mt-6 focus-visible:ring-0 focus-visible:outline-none animate-in fade-in-0 slide-in-from-right-4 duration-500 ease-out"
        >
          <Card className="border border-blue-100 shadow-xl shadow-blue-100/20 bg-white/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="border-b border-blue-50 bg-blue-50/30 px-6 py-3 flex flex-col md:flex-row items-center gap-4 md:gap-0 justify-between h-auto min-h-[3.5rem]">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <CardTitle className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                  <div className="p-1 bg-blue-100 rounded-lg">
                    <FileCheck className="h-4 w-4 text-blue-600" />
                  </div>
                  Installation History
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
                       Installation Selected ({selectedRows.length})
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
                  { key: "pumpSource", label: "Pump Source" },
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
                    pumpSource: "",
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
              <div className="hidden md:block overflow-x-auto">
                <Table className="[&_th]:text-center [&_td]:text-center">
                  <TableHeader className="bg-gradient-to-r from-blue-50/50 to-cyan-50/50">
                    <TableRow className="border-b border-blue-100 hover:bg-transparent">
                      <TableHead className="h-14 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap w-12">
                        <div className="flex justify-center">
                          <Checkbox checked={filteredHistoryItems.length > 0 && selectedRows.length === filteredHistoryItems.length} onCheckedChange={handleSelectAll} className="checkbox-3d border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 h-5 w-5 shadow-sm transition-all duration-300 ease-out" />
                        </div>
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap min-w-[120px]">Action</TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Reg ID</TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Beneficiary Name</TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Mobile Number</TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Village</TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Pump Capacity</TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Pump Head</TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">IP Name</TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Installation Date</TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Photo</TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 6 }).map((_, index) => (
                        <TableRow
                          key={`history-skel-${index}`}
                          className="animate-pulse"
                        >
                          {Array.from({ length: 12 }).map((__, i) => (
                            <TableCell key={i}>
                              <div className="h-4 w-full bg-slate-200 rounded mx-auto"></div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredHistoryItems.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={12}
                          className="h-48 text-center text-slate-500 bg-slate-50/30"
                        >
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                              <FileCheck className="h-6 w-6 text-slate-400" />
                            </div>
                            <p>
                              {historyItems.length === 0
                                ? "No installation history found."
                                : "No history records found matching your search."}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredHistoryItems.map((item) => (
                        <TableRow
                          key={item.serialNo}
                          className="hover:bg-blue-50/30 transition-colors"
                        >
                          <TableCell className="px-4">
                            <div className="flex justify-center">
                              <Checkbox checked={selectedRows.includes(item.serialNo || item.id)} onCheckedChange={(checked) => handleSelectRow(item.serialNo || item.id, checked)} className="checkbox-3d border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 h-5 w-5 shadow-sm transition-all duration-300 ease-out" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleActionClick(item)}
                              disabled={selectedRows.length >= 2}
                              className="bg-cyan-50 text-cyan-600 hover:bg-cyan-600 hover:text-white border border-cyan-200 shadow-xs text-xs font-semibold h-8 px-4 rounded-full flex items-center gap-2 transition-all duration-300 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-mono text-xs text-slate-500 bg-slate-50 py-1 px-2 rounded-md mx-auto w-fit">{item.regId}</TableCell>
                          <TableCell className="whitespace-nowrap font-medium text-slate-800">{item.beneficiaryName}</TableCell>
                          <TableCell className="whitespace-nowrap text-slate-700">{item.mobileNumber}</TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600">{item.village}</TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600 font-medium text-blue-600 uppercase">{item.pumpCapacity}</TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600">{item.pumpHead}</TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600 font-medium text-xs">{item.ipName}</TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600">{item.installationDate}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {item.photoUploadedOnUpadApp ? (
                              <a href={getPreviewUrl(item.photoUploadedOnUpadApp)} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs flex items-center justify-center gap-1 hover:text-blue-800">
                                <FileCheck className="h-4 w-4" /> View Photo
                              </a>
                            ) : <span className="text-slate-400">-</span>}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge
                              className={`
                                ${item.installationStatus === "Done" || item.installationStatus === "Completed" ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-200" : ""}
                                ${item.installationStatus === "Pending" ? "bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200" : ""}
                              `}
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

              {/* Mobile View */}
              <div className="md:hidden space-y-4 p-4 bg-slate-50">
                {filteredHistoryItems.map((item) => (
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
                        <Badge className="bg-teal-100 text-teal-800 border-teal-200 text-xs">
                          Installed
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs border-t border-b py-3 my-2 border-slate-100">
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-400 text-[10px] uppercase font-semibold">
                            Status
                          </span>
                          <div className="flex flex-wrap gap-1">
                            <Badge
                              variant="outline"
                              className={`
                              ${item.installationStatus === "Completed"
                                  ? "bg-green-100 text-green-700 border-green-200"
                                  : ""
                                }
                              ${item.installationStatus === "In Progress"
                                  ? "bg-blue-100 text-blue-700 border-blue-200"
                                  : ""
                                }
                              ${item.installationStatus === "Pending"
                                  ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                                  : ""
                                }
                              ${item.installationStatus === "On Hold"
                                  ? "bg-red-100 text-red-700 border-red-200"
                                  : ""
                                }
                              ${![
                                  "Completed",
                                  "In Progress",
                                  "Pending",
                                  "On Hold",
                                ].includes(item.installationStatus)
                                  ? "bg-slate-100 text-slate-700 border-slate-200"
                                  : ""
                                }
                            `}
                            >
                              {item.installationStatus}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-400 text-[10px] uppercase font-semibold">
                            Completed On
                          </span>
                          <span className="font-medium text-slate-700">
                            {item.installationCompletionDate}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-400 text-[10px] uppercase font-semibold">
                            Ins Ageing
                          </span>
                          <span className="font-medium text-slate-700">
                            {item.installationMaterialAgeing}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-400 text-[10px] uppercase font-semibold">
                            Material Rcvd
                          </span>
                          <span className="font-medium text-slate-700">
                            {item.installationMaterialReceivingDate}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 text-[10px] uppercase block mb-1 font-semibold">
                            Challan Document
                          </span>
                          {item.installationChallanLink ? (
                            <span className="text-blue-600 underline cursor-pointer flex items-center gap-1">
                              <FileCheck className="h-3 w-3" />
                              {item.installationChallanLink} (File)
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">
                              No document
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* INSTALLATION DIALOG */}
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
                Installed Successfully!
              </h2>
            </div>
          ) : (
            <>
              <DialogHeader className="p-6 pb-2 border-b border-blue-100 bg-blue-50/30">
                <DialogTitle className="text-xl font-bold bg-linear-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent flex items-center gap-2">
                  <span className="bg-blue-100 p-1.5 rounded-md">
                    <Wrench className="h-4 w-4 text-blue-600" />
                  </span>
                  Process Installation Work
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
                      Update installation details for{" "}
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

              <div className="p-6 space-y-6">
                {(selectedItem || isBulk) && (
                  <>
                    {/* PREFILLED BENEFICIARY DETAILS CARD - Show in Bulk Mode too with props */}
                    {(isBulk || selectedItem) && (
                      <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-4">
                        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                          <FileCheck className="h-4 w-4 text-blue-600" />
                          Beneficiary Details
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8 text-sm">
                          <div>
                            <span className="text-slate-500 text-xs block mb-1">
                              Serial No
                            </span>
                            <p className="font-medium text-slate-800">
                              {isBulk ? "Multiple" : selectedItem.serialNo}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-500 text-xs block mb-1">
                              Reg ID
                            </span>
                            <p className="font-medium text-slate-800 font-mono break-all">
                              {isBulk ? "Multiple" : selectedItem.regId}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-500 text-xs block mb-1">
                              Beneficiary Name
                            </span>
                            <p className="font-medium text-slate-800">
                              {isBulk ? "Multiple" : selectedItem.beneficiaryName}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-500 text-xs block mb-1">
                              Father's Name
                            </span>
                            <p className="font-medium text-slate-800">
                              {isBulk ? "Multiple" : selectedItem.fatherName}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-500 text-xs block mb-1">
                              Village/Block
                            </span>
                            <p className="font-medium text-slate-800">
                              {isBulk ? "Multiple" : `${selectedItem.village}, ${selectedItem.block}`}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-500 text-xs block mb-1">
                              Pump Type
                            </span>
                            <p className="font-medium text-blue-700 bg-blue-50 inline-block px-2 py-0.5 rounded text-xs border border-blue-100">
                              {isBulk ? "Multiple" : selectedItem.pumpCapacity}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* INSTALLATION INPUT FORM */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">Installation Status</Label>
                        <select
                          className="h-10 w-full border border-slate-200 rounded-md px-3 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-100 focus:border-cyan-400 transition-all font-medium text-slate-700 hover:border-cyan-200"
                          value={formData.installationStatus}
                          onChange={(e) => setFormData({ ...formData, installationStatus: e.target.value })}
                        >
                          <option value="Done" className="text-slate-700">Done</option>
                          <option value="Pending" className="text-slate-700">Pending</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">Installation Date</Label>
                        <Input type="date" value={formData.installationDate} onChange={(e) => setFormData({ ...formData, installationDate: e.target.value })} className="h-10 border-slate-200 focus:border-cyan-400 focus-visible:ring-cyan-100 transition-all" />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-sm font-medium text-slate-700">Installation Photo</Label>
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => document.getElementById("photo-file")?.click()}>
                          <Input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" id="photo-file" />
                          <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                            <Upload className="h-5 w-5 text-cyan-600" />
                          </div>
                          <div className="text-center">
                            <span className="text-sm font-medium text-slate-700 group-hover:text-cyan-700 transition-colors">
                              {formData.photoUploadedOnUpadApp ? "Change Photo" : "Upload Installation Photo"}
                            </span>
                            <p className="text-xs text-slate-400 mt-1">PNG, JPG or JPEG (max. 10MB)</p>
                          </div>
                          {formData.photoUploadedOnUpadApp && (
                            <Badge variant="secondary" className="mt-2 bg-cyan-50 text-cyan-700 border-cyan-200">
                              <FileCheck className="h-3 w-3 mr-1" />
                              {formData.photoUploadedOnUpadApp}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 pb-6 pr-6">
                      <Button
                        variant="ghost"
                        onClick={() => setIsDialogOpen(false)}
                        disabled={isSubmitting}
                        className="h-10 px-6 text-slate-600 hover:text-slate-800 hover:bg-slate-100/50"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="h-10 px-6 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-md transition-all hover:shadow-lg min-w-[150px]"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Installing...
                          </>
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
