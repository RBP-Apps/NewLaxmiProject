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
    Cpu,
    CheckCircle2,
    Pencil,
    Loader2,
    Search,
    Edit,
    FileCheck,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function SystemInfoPage() {
    const [activeTab, setActiveTab] = useState("pending");
    const [isSuccess, setIsSuccess] = useState(false);
    const [pendingItems, setPendingItems] = useState([]);
    const [historyItems, setHistoryItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
        imei_no: "",
        motor_serial_no: "",
        pump_serial_no: "",
        controller_serial_no: "",
        rid_number: "",
        panel_no_1: "",
        panel_no_2: "",
        panel_no_3: "",
        panel_no_4: "",
        panel_no_5: "",
        panel_no_6: "",
    });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch both portal and system_info tables
            const [
                { data: portalData, error: portalError },
                { data: systemInfoData, error: systemInfoError }
            ] = await Promise.all([
                supabase.from("portal").select("*"),
                supabase.from("system_info").select("*")
            ]);

            if (portalError) throw portalError;
            if (systemInfoError) throw systemInfoError;

            if (!portalData || !systemInfoData) {
                setPendingItems([]);
                setHistoryItems([]);
                return;
            }

            // Create a map of portal data for quick lookup by reg_id
            const portalMap = {};
            portalData.forEach(p => {
                if (p.reg_id) portalMap[p.reg_id] = p;
            });

            const pending = [];
            const history = [];

            systemInfoData.forEach((row) => {
                const portal = portalMap[row.reg_id] || {};

                const item = {
                    ...row, // Include all fields from system_info
                    regId: row.reg_id,
                    serialNo: row.serial_no || portal.serial_no || "-",
                    beneficiaryName: portal.beneficiary_name || "-",
                    fatherName: portal.fathers_name || "-",
                    mobileNumber: portal.mobile_number || "-",
                    village: portal.village || "-",
                    block: portal.block || "-",
                    district: portal.district || "-",
                    pincode: portal.pincode || "-",
                    pumpCapacity: portal.pump_capacity || "-",
                    pumpHead: portal.pump_head || "-",
                    ipName: portal.ip_name || portal.company || "-",
                };

                const isPlanned7Filled = row.planned_7 && String(row.planned_7).trim() !== "";
                const isActual7Filled = row.actual_7 && String(row.actual_7).trim() !== "";

                // Logic as requested:
                // Pending: planned_7 NOT NULL and actual_7 NULL
                // History: planned_7 NOT NULL and actual_7 NOT NULL
                if (isPlanned7Filled && !isActual7Filled) {
                    pending.push(item);
                } else if (isPlanned7Filled && isActual7Filled) {
                    history.push(item);
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
            imei_no: item.imei_no || "",
            motor_serial_no: item.motor_serial_no || "",
            pump_serial_no: item.pump_serial_no || "",
            controller_serial_no: item.controller_serial_no || "",
            rid_number: item.rid_number || "",
            panel_no_1: item.panel_no_1 || "",
            panel_no_2: item.panel_no_2 || "",
            panel_no_3: item.panel_no_3 || "",
            panel_no_4: item.panel_no_4 || "",
            panel_no_5: item.panel_no_5 || "",
            panel_no_6: item.panel_no_6 || "",
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
            imei_no: "",
            motor_serial_no: "",
            pump_serial_no: "",
            controller_serial_no: "",
            rid_number: "",
            panel_no_1: "",
            panel_no_2: "",
            panel_no_3: "",
            panel_no_4: "",
            panel_no_5: "",
            panel_no_6: "",
            system_status: "Active",
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!selectedItem && (!isBulk || selectedRows.length === 0)) return;
        setIsSubmitting(true);

        try {
            let itemsToProcess = [];
            const currentItems = activeTab === "history" ? historyItems : pendingItems;
            if (isBulk) {
                itemsToProcess = currentItems.filter((item) =>
                    selectedRows.includes(item.regId)
                );
            } else {
                itemsToProcess = [selectedItem];
            }

            const updatePromises = itemsToProcess.map(async (item) => {
                const updatePayload = {
                    imei_no: formData.imei_no,
                    motor_serial_no: formData.motor_serial_no,
                    pump_serial_no: formData.pump_serial_no,
                    controller_serial_no: formData.controller_serial_no,
                    rid_number: formData.rid_number,
                    panel_no_1: formData.panel_no_1,
                    panel_no_2: formData.panel_no_2,
                    panel_no_3: formData.panel_no_3,
                    panel_no_4: formData.panel_no_4,
                    panel_no_5: formData.panel_no_5,
                    panel_no_6: formData.panel_no_6,
                    updated_at: new Date().toISOString(),
                };

                if (!item.actual_7) {
                    const now = new Date();
                    const pad = (n) => String(n).padStart(2, "0");
                    updatePayload.actual_7 = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
                }

                const { error } = await supabase
                    .from("system_info")
                    .update(updatePayload)
                    .eq("reg_id", item.regId);

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
                        Pending Actions
                    </TabsTrigger>
                    <TabsTrigger
                        value="history"
                        className="z-10 h-full data-[state=active]:bg-transparent data-[state=active]:text-blue-700 data-[state=active]:shadow-none transition-colors duration-200 text-base font-medium text-slate-500"
                    >
                        History & Records
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
                                        <Cpu className="h-4 w-4 text-blue-600" />
                                    </div>
                                    Pending System Info
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
                                            <Edit className="h-4 w-4 mr-2" />
                                            Update Selected ({selectedRows.length})
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
                                            <TableHead className="h-14 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap w-14">S.No</TableHead>
                                            {/* Common Columns */}
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
                                            <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Status</TableHead>
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
                                                <TableCell colSpan={15} className="h-48 text-center text-slate-500 bg-slate-50/30">
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                                                            <Cpu className="h-6 w-6 text-slate-400" />
                                                        </div>
                                                        <p>No pending system info records found matching your search</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredPendingItems.map((item, index) => (
                                                <TableRow key={item.regId} className="hover:bg-blue-50/30 transition-colors">
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
                                                            className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 shadow-xs text-xs font-semibold h-8 px-4 rounded-full flex items-center gap-2 transition-all duration-300 mx-auto"
                                                        >
                                                            <Edit className="h-3.5 w-3.5" />
                                                            Update
                                                        </Button>
                                                    </TableCell>
                                                    <TableCell className="text-center font-medium text-slate-500 text-xs">{index + 1}</TableCell>
                                                    <TableCell className="whitespace-nowrap font-mono text-xs text-slate-500">{item.regId}</TableCell>
                                                    <TableCell className="whitespace-nowrap font-medium text-slate-800">{item.beneficiaryName}</TableCell>
                                                    <TableCell className="whitespace-nowrap text-slate-600">{item.fatherName}</TableCell>
                                                    <TableCell className="whitespace-nowrap text-slate-600">{item.mobileNumber}</TableCell>
                                                    <TableCell className="whitespace-nowrap text-slate-600">{item.village}</TableCell>
                                                    <TableCell className="whitespace-nowrap text-slate-600">{item.block}</TableCell>
                                                    <TableCell className="whitespace-nowrap text-slate-600">{item.district}</TableCell>
                                                    <TableCell className="whitespace-nowrap text-slate-600">{item.pincode}</TableCell>
                                                    <TableCell className="whitespace-nowrap text-slate-600">{item.pumpCapacity}</TableCell>
                                                    <TableCell className="whitespace-nowrap text-slate-600">{item.pumpHead}</TableCell>
                                                    <TableCell className="whitespace-nowrap text-slate-600">{item.ipName}</TableCell>
                                                    <TableCell className="whitespace-nowrap text-slate-600">{item.system_status}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ====================== HISTORY TAB ====================== */}
                <TabsContent value="history" className="mt-6 focus-visible:ring-0 focus-visible:outline-none animate-in fade-in-0 slide-in-from-right-4 duration-500 ease-out">
                    <Card className="border border-blue-100 shadow-xl shadow-blue-100/20 bg-white/80 backdrop-blur-sm overflow-hidden">
                        <CardHeader className="border-b border-blue-50 bg-blue-50/30 px-6 py-3 flex flex-col md:flex-row items-center gap-4 md:gap-0 justify-between h-auto min-h-[3.5rem]">
                            <CardTitle className="text-lg font-semibold text-blue-900">System Info History</CardTitle>
                            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                                {selectedRows.length >= 2 && (
                                    <Button
                                        onClick={handleBulkClick}
                                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 transition-all duration-300 animate-in fade-in slide-in-from-right-4 h-9"
                                        size="sm"
                                    >
                                        <Edit className="h-4 w-4 mr-2" />
                                        Update Selected ({selectedRows.length})
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table className="[&_th]:text-center [&_td]:text-center">
                                    <TableHeader className="bg-gradient-to-r from-blue-50/50 to-cyan-50/50">
                                        <TableRow>
                                            <TableHead className="h-14 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap w-12">
                                                <div className="flex justify-center">
                                                    <Checkbox
                                                        checked={filteredHistoryItems.length > 0 && selectedRows.length === filteredHistoryItems.length}
                                                        onCheckedChange={handleSelectAll}
                                                        className="checkbox-3d border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 h-5 w-5 shadow-sm transition-all duration-300 ease-out"
                                                    />
                                                </div>
                                            </TableHead>
                                            <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Action</TableHead>
                                            <TableHead className="h-14 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap w-14">S.No</TableHead>
                                            <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Reg ID</TableHead>
                                            <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Beneficiary Name</TableHead>
                                            <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Village</TableHead>
                                            <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">IMEI No</TableHead>
                                            <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">RID Number</TableHead>

                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredHistoryItems.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="h-48 text-center text-slate-500">No history records.</TableCell>
                                            </TableRow>
                                        ) : (
                                        filteredHistoryItems.map((item, index) => (
                                            <TableRow key={item.regId} className="hover:bg-blue-50/30 transition-colors">
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
                                                        <Pencil className="h-3.5 w-3.5" />
                                                        Edit
                                                    </Button>
                                                </TableCell>
                                                <TableCell className="text-center font-medium text-slate-500 text-xs">{index + 1}</TableCell>
                                                <TableCell className="whitespace-nowrap font-mono text-xs text-slate-500">{item.regId}</TableCell>
                                                <TableCell className="whitespace-nowrap font-medium text-slate-800">{item.beneficiaryName}</TableCell>
                                                <TableCell className="whitespace-nowrap text-slate-600">{item.village}</TableCell>
                                                <TableCell className="whitespace-nowrap text-slate-600">{item.imei_no || "-"}</TableCell>
                                                <TableCell className="whitespace-nowrap text-slate-600">{item.rid_number || "-"}</TableCell>

                                            </TableRow>
                                        )))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* DIALOG */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
                    {isSuccess ? (
                        <div className="flex flex-col items-center justify-center w-full p-8 text-center space-y-6">
                            <CheckCircle2 className="h-16 w-16 text-green-600" />
                            <h2 className="text-3xl font-bold text-slate-800">Submitted Successfully!</h2>
                        </div>
                    ) : (
                        <>
                            <DialogHeader>
                                <DialogTitle>Update System Information</DialogTitle>
                                <DialogDescription>
                                    Enter system details for {selectedItem?.beneficiaryName}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-6 p-6">
                                {/* Beneficiary Details Card */}
                                <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-4">
                                    <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                        <FileCheck className="h-4 w-4 text-blue-600" />
                                        Beneficiary Details
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8 text-sm">
                                        <div>
                                            <span className="text-slate-500 text-xs block mb-1">Serial No</span>
                                            <p className="font-medium text-slate-800">{isBulk ? "Multiple" : selectedItem?.serialNo}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 text-xs block mb-1">Reg ID</span>
                                            <p className="font-medium text-slate-800 font-mono break-all">{isBulk ? "Multiple" : selectedItem?.regId}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 text-xs block mb-1">Beneficiary Name</span>
                                            <p className="font-medium text-slate-800">{isBulk ? "Multiple" : selectedItem?.beneficiaryName}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 text-xs block mb-1">Father's Name</span>
                                            <p className="font-medium text-slate-800">{isBulk ? "Multiple" : selectedItem?.fatherName}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 text-xs block mb-1">Village/Block</span>
                                            <p className="font-medium text-slate-800">{isBulk ? "Multiple" : `${selectedItem?.village}, ${selectedItem?.block}`}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 text-xs block mb-1">Pump Type</span>
                                            <p className="font-medium text-blue-700 bg-blue-50 inline-block px-2 py-0.5 rounded text-xs border border-blue-100">{isBulk ? "Multiple" : selectedItem?.pumpCapacity}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {/* General System Info */}
                                    <div className="space-y-4 col-span-full">
                                        <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">General System Info</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label>IMEI No</Label>
                                                <Input
                                                    placeholder="Enter IMEI No"
                                                    value={formData.imei_no}
                                                    onChange={(e) => setFormData({ ...formData, imei_no: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>RID Number</Label>
                                                <Input
                                                    placeholder="Enter RID Number"
                                                    value={formData.rid_number}
                                                    onChange={(e) => setFormData({ ...formData, rid_number: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Component Serials */}
                                    <div className="space-y-4 col-span-full">
                                        <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">Component Serials</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label>Motor Serial No</Label>
                                                <Input
                                                    placeholder="Motor S.No"
                                                    value={formData.motor_serial_no}
                                                    onChange={(e) => setFormData({ ...formData, motor_serial_no: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Pump Serial No</Label>
                                                <Input
                                                    placeholder="Pump S.No"
                                                    value={formData.pump_serial_no}
                                                    onChange={(e) => setFormData({ ...formData, pump_serial_no: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Controller Serial No</Label>
                                                <Input
                                                    placeholder="Controller S.No"
                                                    value={formData.controller_serial_no}
                                                    onChange={(e) => setFormData({ ...formData, controller_serial_no: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Solar Panel Serials */}
                                    <div className="space-y-4 col-span-full">
                                        <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">Solar Panel Serials</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                            {[1, 2, 3, 4, 5, 6].map((num) => (
                                                <div key={num} className="space-y-2">
                                                    <Label>Panel No {num}</Label>
                                                    <Input
                                                        placeholder={`Panel ${num}`}
                                                        value={formData[`panel_no_${num}`]}
                                                        onChange={(e) => setFormData({ ...formData, [`panel_no_${num}`]: e.target.value })}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t">
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsDialogOpen(false)}
                                        className="h-10 px-6 border-slate-200 text-slate-600 hover:bg-slate-50"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className="h-10 px-8 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 transition-all font-semibold"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : "Save System Information"}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}