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
import {
  CreditCard,
  CheckCircle2,
  Loader2,
  Activity,
  IndianRupee,
  ClipboardCheck,
  Search,
  Edit,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function PaymentPage() {
  const [activeTab, setActiveTab] = useState("Done");
  const [isSuccess, setIsSuccess] = useState(false);
  const [pendingItems, setPendingItems] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [columnMapping, setColumnMapping] = useState({});
  const [selectedRows, setSelectedRows] = useState([]);
  const [isBulk, setIsBulk] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [filters, setFilters] = useState({
    regId: "",
    village: "",
    block: "",
    district: "",
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

  const [formData, setFormData] = useState({
    ipJcrCsrPayment: "",
    installationPaymentToIp: "Done", // Default
    ipPaymentPerInstallation: "",
    gst18Percent: "",
    totalAmount: "",
    billSendDate: "",
  });

  // Calculate Total Amount: perInstallation + (perInstallation * gst% / 100)
  useEffect(() => {
    const install = parseFloat(formData.ipPaymentPerInstallation) || 0;
    const gstPercent = parseFloat(formData.gst18Percent) || 0;
    const gstAmount = (install * gstPercent) / 100;
    const total = (install + gstAmount).toFixed(2);

    if (formData.totalAmount !== total) {
      setFormData((prev) => ({ ...prev, totalAmount: total }));
    }
  }, [formData.ipPaymentPerInstallation, formData.gst18Percent]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Portal Data for details
      const { data: portalData, error: portalError } = await supabase
        .from("portal")
        .select("*");

      if (portalError) throw portalError;

      // 2. Fetch IP Payment Data
      const { data: paymentData, error: paymentError } = await supabase
        .from("ip_payment")
        .select("*");

      if (paymentError) throw paymentError;

      const portalMap = {};
      portalData?.forEach((p) => {
        const key = p.reg_id || p["Reg ID"];
        if (key) portalMap[key] = p;
      });

      if (!paymentData) {
        setPendingItems([]);
        setHistoryItems([]);
        return;
      }

      const pending = [];
      const history = [];

      paymentData.forEach((row) => {
        const regId = row.reg_id || row["Reg ID"];
        const portalItem = portalMap[regId];

        const item = {
          id: row.id,
          regId: regId || "-",
          serialNo: row.serial_no || portalItem?.serial_no || "-",

          // Portal Details
          beneficiaryName: portalItem?.beneficiary_name || "-",
          fatherName: portalItem?.fathers_name || portalItem?.father_husband_name || "-",
          mobileNumber: portalItem?.mobile_number || "-",
          village: portalItem?.village || "-",
          block: portalItem?.block || "-",
          district: portalItem?.district || "-",
          pincode: portalItem?.pincode || "-",
          pumpCapacity: portalItem?.pump_capacity || "-",
          pumpHead: portalItem?.pump_head || "-",
          ipName: portalItem?.ip_name || portalItem?.company || "-",

          // Payment Fields (Schema)
          ipJcrCsrPayment: row.ip_jcr_csr_payment || "",
          installationPaymentToIp: row.installation_payment_to_ip || "",
          ipPaymentPerInstallation: row.ip_payment_per_installation || "",
          gst18Percent: row.gst_18_percent || "",
          billSendDate: row.bill_send_date || "",
          totalAmount: 
            row.total_amount_payment_to_ip || 
            ((parseFloat(row.ip_payment_per_installation) || 0) + 
             (parseFloat(row.gst_18_percent) || 0)).toFixed(2), // Fallback calculation

          // Trigger columns
          planned11: row.planned_11,
          actual11: row.actual_11,
        };

        const isPlanned11 = item.planned11 && String(item.planned11).trim() !== "";
        const isPaymentDone = item.actual11 && String(item.actual11).trim() !== "";

        if (isPaymentDone) {
          history.push(item);
        } else if (isPlanned11) {
          pending.push(item);
        }
      });

      setPendingItems(pending);
      setHistoryItems(history);
    } catch (e) {
      console.error("Fetch Data Error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setTimeout(() => setIsLoading(false), 15000);
    return () => clearTimeout(timer);
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
    setIsBulk(false);
    setSelectedItem(item);
    setIsSuccess(false);
    setFormData({
      ipJcrCsrPayment: item.ipJcrCsrPayment || "",
      installationPaymentToIp: item.installationPaymentToIp || "Done",
      ipPaymentPerInstallation: item.ipPaymentPerInstallation || "",
      gst18Percent: item.gst18Percent || "",
      totalAmount: item.totalAmount || "",
      billSendDate: item.billSendDate || "",
    });
    setIsDialogOpen(true);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const items = activeTab === "history" ? filteredHistoryItems : filteredPendingItems;
      setSelectedRows(items.map((item) => item.regId));
    } else {
      setSelectedRows([]);
    }
  };

  useEffect(() => {
    setSelectedRows([]);
    setSelectedItem(null);
  }, [activeTab]);

  const handleSelectRow = (regId, checked) => {
    if (checked) {
      setSelectedRows((prev) => [...prev, regId]);
    } else {
      setSelectedRows((prev) => prev.filter((id) => id !== regId));
    }
  };

  const handleBulkClick = () => {
    setIsBulk(true);
    setSelectedItem(null);
    setIsSuccess(false);
    setFormData({
      ipJcrCsrPayment: "",
      installationPaymentToIp: "Done",
      ipPaymentPerInstallation: "",
      gst18Percent: "",
      totalAmount: "",
      billSendDate: "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedItem && (!isBulk || selectedRows.length === 0)) return;
    setIsSubmitting(true);

    try {
      // 1. Identify Items to Process
      let itemsToProcess = [];
      const currentItems = activeTab === "history" ? historyItems : pendingItems;
      if (isBulk) {
        itemsToProcess = currentItems.filter((item) =>
          selectedRows.includes(item.regId)
        );
      } else {
        itemsToProcess = [selectedItem];
      }

      // 2. Timestamp
      const now = new Date();
      const timestamp =
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ` +
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

      // 3. Update via Supabase
      const updatePromises = itemsToProcess.map(async (item) => {
        const rowUpdate = {
          ip_jcr_csr_payment: formData.ipJcrCsrPayment || null,
          installation_payment_to_ip: formData.installationPaymentToIp || null,
          ip_payment_per_installation: formData.ipPaymentPerInstallation || null,
          gst_18_percent: formData.gst18Percent || null,
          total_amount_payment_to_ip: formData.totalAmount || null,
          bill_send_date: formData.billSendDate || null,
          actual_11: timestamp,
        };

        console.log("Submitting payload for item:", item.id, rowUpdate);

        if (!item.id) {
          console.error("Item ID missing for update", item);
          return;
        }

        const { error } = await supabase
          .from("ip_payment")
          .update(rowUpdate)
          .eq("id", item.id);

        if (error) throw error;
      });

      await Promise.all(updatePromises);

      await fetchData();
      setSelectedItem(null);
      setIsBulk(false);
      setSelectedRows([]);
      setIsSuccess(true);
    } catch (error) {
      console.error("Submission Error:", error);
      alert("Error submitting form: " + error.message);
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
            Pending Payments
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="z-10 h-full data-[state=active]:bg-transparent data-[state=active]:text-blue-700 data-[state=active]:shadow-none transition-colors duration-200 text-base font-medium text-slate-500"
          >
            Payment History
          </TabsTrigger>
        </TabsList>

        {/* ====================== PENDING TAB ====================== */}
        <TabsContent
          value="pending"
          className="mt-6 focus-visible:ring-0 focus-visible:outline-none animate-in fade-in-0 slide-in-from-left-4 duration-500 ease-out"
        >
          <Card className="border border-blue-100 shadow-xl shadow-blue-100/20 bg-white/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="border-b border-blue-50 bg-blue-50/30 px-6 py-3 flex flex-col md:flex-row items-center gap-4 md:gap-0 justify-between h-auto min-h-[3.5rem]">
              <div className="flex items-center gap-2 w-full md:w-auto justify-between">
                <CardTitle className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                  <div className="p-1 bg-blue-100 rounded-lg">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                  </div>
                  Pending Payments
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
                      <ClipboardCheck className="h-4 w-4 mr-2" />
                      Pay Selected ({selectedRows.length})
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { key: "regId", label: "Reg ID" },
                  { key: "village", label: "Village" },
                  { key: "block", label: "Block" },
                  { key: "district", label: "District" },
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
              {/* Desktop Table View */}
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
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap min-w-[120px]">
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
                      Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={index} className="animate-pulse">
                          <TableCell>
                            <div className="h-8 w-24 bg-slate-200 rounded-full mx-auto" />
                          </TableCell>
                          {Array.from({ length: 12 }).map((_, i) => (
                            <TableCell key={i}>
                              <div className="h-4 w-full bg-slate-200 rounded" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredPendingItems.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={14}
                          className="h-48 text-center text-slate-500 bg-slate-50/30"
                        >
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                              <CreditCard className="h-6 w-6 text-slate-400" />
                            </div>
                            <p>
                              No pending payment records found matching your
                              search
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPendingItems.map((item, index) => (
                        <TableRow
                          key={item.serialNo}
                          className="hover:bg-blue-50/30 transition-colors"
                        >
                          <TableCell className="px-4">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={selectedRows.includes(item.regId)}
                                onCheckedChange={(checked) =>
                                  handleSelectRow(item.regId, checked)
                                }
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
                              <CreditCard className="h-3.5 w-3.5" />
                              Pay
                            </Button>
                          </TableCell>
                          <TableCell className="text-center font-medium text-slate-500 text-xs">{index + 1}</TableCell>

                          <TableCell className="whitespace-nowrap font-mono text-xs text-slate-500 bg-slate-50 py-1 px-2 rounded-md mx-auto w-fit">
                            {item.regId}
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-medium text-slate-800">
                            {item.beneficiaryName}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600">
                            {item.fatherName}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600">
                            {item.mobileNumber}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600">
                            {item.village}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600">
                            {item.block}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600">
                            {item.district}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600">
                            {item.pincode}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600">
                            {item.pumpCapacity}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600">
                            {item.pumpHead}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600">
                            {item.ipName}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4 p-4 bg-slate-50">
                {isLoading ? (
                  <div className="text-center p-4 text-slate-500">
                    Loading...
                  </div>
                ) : (
                  filteredPendingItems.map((item) => (
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
                              Village
                            </span>
                            <span className="font-medium text-slate-700">
                              {item.village}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-400 text-[10px] uppercase font-semibold">
                              Pump Capacity
                            </span>
                            <span className="font-medium text-slate-700">
                              {item.pumpCapacity}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-400 text-[10px] uppercase font-semibold">
                              Company
                            </span>
                            <span className="font-medium text-slate-700">
                              {item.ipName}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-400 text-[10px] uppercase font-semibold">
                              Planned Date
                            </span>
                            <span className="font-medium text-slate-700">
                              {item.planned11}
                            </span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          disabled={selectedRows.length >= 2}
                          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handleActionClick(item)}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Process Payment
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====================== HISTORY TAB ====================== */}
        <TabsContent
          value="history"
          className="mt-6 focus-visible:ring-0 focus-visible:outline-none animate-in fade-in-0 slide-in-from-right-4 duration-500 ease-out"
        >
          <Card className="border border-blue-100 shadow-xl shadow-blue-100/20 bg-white/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="border-b border-blue-50 bg-blue-50/30 px-6 py-3 flex flex-col md:flex-row items-center gap-4 md:gap-0 justify-between h-auto min-h-[3.5rem]">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <CardTitle className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                  <div className="p-1 bg-blue-100 rounded-lg">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                  </div>
                  Payment History
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
                <Badge
                  variant="outline"
                  className="bg-blue-100 text-blue-700 border-blue-200 px-3 py-1 h-9 flex items-center whitespace-nowrap"
                >
                  {filteredHistoryItems.length} Records
                </Badge>
                {selectedRows.length >= 2 && (
                  <Button
                    onClick={handleBulkClick}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 transition-all duration-300 animate-in fade-in slide-in-from-right-4 h-9"
                    size="sm"
                  >
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                    Pay Selected ({selectedRows.length})
                  </Button>
                )}
              </div>
            </CardHeader>
            {/* Filter Dropdowns */}
            <div className="px-6 py-4 bg-slate-50/50 border-b border-blue-50">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { key: "regId", label: "Reg ID" },
                  { key: "village", label: "Village" },
                  { key: "block", label: "Block" },
                  { key: "district", label: "District" },
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
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <Table className="[&_th]:text-center [&_td]:text-center">
                  <TableHeader className="bg-gradient-to-r from-blue-50/50 to-cyan-50/50">
                    <TableRow className="border-b border-blue-100 hover:bg-transparent">
                      <TableHead className="h-14 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap w-12">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={filteredHistoryItems.length > 0 && selectedRows.length === filteredHistoryItems.length}
                            onCheckedChange={handleSelectAll}
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
                        District
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        IP JCR
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Install Payment
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        IP Payment
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        GST
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Total
                      </TableHead>
                      <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Bill Date
                      </TableHead>

                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={index} className="animate-pulse">
                          {Array.from({ length: 12 }).map((_, i) => (
                            <TableCell key={i}>
                              <div className="h-4 w-full bg-slate-200 rounded" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredHistoryItems.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={13}
                          className="h-48 text-center text-slate-500 bg-slate-50/30"
                        >
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                              <CreditCard className="h-6 w-6 text-slate-400" />
                            </div>
                            <p>
                              {historyItems.length === 0
                                ? "No payment records found"
                                : "No history records found matching your search."}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredHistoryItems.map((item, index) => (
                        <TableRow
                          key={item.serialNo}
                          className="hover:bg-blue-50/30 transition-colors"
                        >
                          <TableCell className="px-4">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={selectedRows.includes(item.regId)}
                                onCheckedChange={(checked) => handleSelectRow(item.regId, checked)}
                                className="checkbox-3d border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 h-5 w-5 shadow-sm transition-all duration-300 ease-out"
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
                              <Edit className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                          </TableCell>
                          <TableCell className="text-center font-medium text-slate-500 text-xs">{index + 1}</TableCell>
                          <TableCell>
                            <span className="font-mono text-xs text-slate-500 bg-slate-50 py-1 px-2 rounded-md">
                              {item.regId}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-medium text-slate-800">
                            {item.beneficiaryName}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {item.district}
                          </TableCell>
                          <TableCell className="text-slate-600 font-mono text-xs">
                             ₹{item.ipJcrCsrPayment || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.installationPaymentToIp === "Done" ? "default" : "secondary"} className={item.installationPaymentToIp === "Done" ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-800"}>
                                {item.installationPaymentToIp || "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-600 font-mono text-xs">
                             ₹{item.ipPaymentPerInstallation || "-"}
                          </TableCell>
                          <TableCell className="text-slate-600 font-mono text-xs">
                             ₹{item.gst18Percent || "-"}
                          </TableCell>
                          <TableCell className="text-green-700 font-bold bg-green-50/50">
                            ₹{item.totalAmount || "0"}
                          </TableCell>
                          <TableCell className="text-slate-600 text-xs">
                            {item.billSendDate || "-"}
                          </TableCell>

                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4 p-4 bg-slate-50">
                {filteredHistoryItems.map((item) => (
                  <Card
                    key={item.serialNo}
                    className="bg-white border text-sm shadow-sm"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="font-semibold text-blue-900">
                            #{item.serialNo}
                          </p>
                          <p className="text-base font-medium text-slate-800">
                            {item.beneficiaryName}
                          </p>
                        </div>
                        <Badge className={item.installationPaymentToIp === "Done" ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-800"}>
                            {item.installationPaymentToIp || "Pending"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-2 mt-2">
                        <div>
                          <span className="font-medium text-slate-500">
                            Amount:
                          </span>{" "}
                          ₹{item.totalAmount || "0"}
                        </div>
                        <div>
                          <span className="font-medium text-slate-500">
                            Bill Date:
                          </span>{" "}
                          {item.billSendDate || "-"}
                        </div>
                        <div>
                          <span className="font-medium text-slate-500">
                            GST:
                          </span>{" "}
                          ₹{item.gst18Percent || "0"}
                        </div>
                        <div>
                          <span className="font-medium text-slate-500">
                            IP JCR:
                          </span>{" "}
                          ₹{item.ipJcrCsrPayment || "0"}
                        </div>
                        <div className="col-span-2 pt-2 flex justify-end">
                          <Button size="sm" variant="outline" onClick={() => handleActionClick(item)} className="h-8 gap-2">
                            <Edit className="h-3.5 w-3.5" /> Edit
                          </Button>
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

      {/* PAYMENT DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          showCloseButton={!isSuccess}
          className={`max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isSuccess ? "bg-transparent !shadow-none !border-none" : "bg-white"
            }`}
        >
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center w-full p-8 text-center space-y-6 animate-in fade-in duration-300">
              <div className="rounded-full bg-white p-5 shadow-2xl shadow-green-900/20 ring-8 ring-white/10 animate-in zoom-in duration-500 ease-out relative">
                <div className="absolute inset-0 rounded-full border-4 border-green-500/30 animate-ping opacity-75"></div>
                <IndianRupee className="h-16 w-16 text-green-600 scale-110" />
              </div>
              <h2 className="text-3xl font-bold text-white drop-shadow-md animate-in slide-in-from-bottom-4 fade-in duration-500 delay-150 ease-out tracking-wide">
                Payment Successful!
              </h2>
            </div>
          ) : (
            <>
              <DialogHeader className="p-6 pb-2 border-b border-blue-100 bg-blue-50/30">
                <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent flex items-center gap-2">
                  <span className="bg-blue-100 p-1.5 rounded-md">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                  </span>
                  Process Payment
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
                      Enter payment details for{" "}
                      <span className="font-semibold text-slate-700">
                        {selectedItem?.beneficiaryName}
                      </span>
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>

              {(selectedItem || isBulk) && (
                <div className="grid gap-6 p-6">
                  {/* BENEFICIARY DETAILS CARD - Hide in Bulk */}
                  {!isBulk && selectedItem && (
                    <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/50 to-cyan-50/30 p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-blue-100/50">
                        <span className="bg-white p-1 rounded shadow-sm">
                          <CheckCircle2 className="h-4 w-4 text-blue-500" />
                        </span>
                        <h4 className="font-semibold text-blue-900">
                          Beneficiary Summary
                        </h4>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
                        <div>
                          <span className="text-xs font-medium text-blue-600/70 uppercase tracking-wider block mb-1">
                            Serial No
                          </span>
                          <p className="font-semibold text-slate-700">
                            {selectedItem.serialNo}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-blue-600/70 uppercase tracking-wider block mb-1">
                            Name
                          </span>
                          <p className="font-semibold text-slate-700">
                            {selectedItem.beneficiaryName}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-blue-600/70 uppercase tracking-wider block mb-1">
                            District
                          </span>
                          <p className="font-semibold text-slate-700">
                            {selectedItem.district}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-blue-600/70 uppercase tracking-wider block mb-1">
                            Pump Type
                          </span>
                          <p className="font-medium text-slate-700">
                            {selectedItem.pumpType}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-blue-600/70 uppercase tracking-wider block mb-1">
                            Company
                          </span>
                          <p className="font-medium text-slate-700">
                            {selectedItem.company}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PAYMENT INPUT FORM */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-medium">
                        IP JCR (CSR) PAYMENT
                      </Label>
                      <Input
                        type="number"
                        value={formData.ipJcrCsrPayment}
                        onChange={(e) =>
                          setFormData({ ...formData, ipJcrCsrPayment: e.target.value })
                        }
                        placeholder="Enter Amount"
                        className="border-slate-200 focus:border-cyan-400 focus-visible:ring-cyan-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-medium">
                        INSTALLATION PAYMENT TO IP
                      </Label>
                      <select
                        value={formData.installationPaymentToIp}
                        onChange={(e) =>
                          setFormData({ ...formData, installationPaymentToIp: e.target.value })
                        }
                        className="w-full h-10 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-white"
                      >
                        <option value="Done">Done</option>
                        <option value="Pending">Pending</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-medium">
                        IP PAYMENT PER INSTALLATION
                      </Label>
                      <Input
                        type="number"
                        value={formData.ipPaymentPerInstallation}
                        onChange={(e) =>
                          setFormData({ ...formData, ipPaymentPerInstallation: e.target.value })
                        }
                        placeholder="Enter Amount"
                        className="border-slate-200 focus:border-cyan-400 focus-visible:ring-cyan-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-medium">GST %</Label>
                      <Input
                        type="number"
                        value={formData.gst18Percent}
                        onChange={(e) =>
                          setFormData({ ...formData, gst18Percent: e.target.value })
                        }
                        placeholder="Enter GST %"
                        className="border-slate-200 focus:border-cyan-400 focus-visible:ring-cyan-100 bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-medium">TOTAL AMOUNT PAYMENT TO IP</Label>
                      <Input
                        type="number"
                        value={formData.totalAmount}
                        readOnly
                        className="border-slate-200 bg-slate-50 focus:border-cyan-400 focus-visible:ring-cyan-100 font-bold text-green-700"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-1">
                      <Label className="text-slate-700 font-medium">
                        BILL SEND DATE
                      </Label>
                      <Input
                        type="date"
                        value={formData.billSendDate}
                        onChange={(e) =>
                          setFormData({ ...formData, billSendDate: e.target.value })
                        }
                        className="border-slate-200 focus:border-cyan-400 focus-visible:ring-cyan-100"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-4 mt-4 pt-4 border-t border-slate-100 pb-6 pr-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      disabled={isSubmitting}
                      className="px-6 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/20 px-8"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Submit Payment"
                      )}
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
