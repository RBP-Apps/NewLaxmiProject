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
    FileCheck,
    CheckCircle2,
    Users,
    Loader2,
    ClipboardCheck,
    Search,
    Pencil,
    FileText,
    Upload,
    ExternalLink,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PortalUpdatePage() {
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

    const [formData, setFormData] = useState({
        photo_link: "",
        photo_link_file: null,
        photo_rms_data_pending: "",
        photo_rms_data_pending_file: null,
        longitude: "",
        latitude: "",
        supply_aapurti_date: "",
        scadalot_creation: "",
        lot_ref_no: "",
        lot_name: "",
        asset_mapping_by_ea: "",
        days_7_verification: "",
        rms_data_mail_to_rotommag: "",
        reg_id: "",
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

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const { data: updateData, error: updateError } = await supabase
                .from("portal_update")
                .select("*")
                .not("planned_5", "is", null);

            if (updateError) throw updateError;

            if (!updateData || updateData.length === 0) {
                setPendingItems([]);
                setHistoryItems([]);
                return;
            }

            const regIds = [...new Set(updateData.map(d => d.reg_id))];
            let portalData = [];

            if (regIds.length > 0) {
                const { data: pData, error: pError } = await supabase
                    .from("portal")
                    .select("*")
                    .in("Reg ID", regIds);

                if (pError) {
                    const { data: pRetry, error: pRetryError } = await supabase
                        .from("portal")
                        .select("*")
                        .in("reg_id", regIds);
                    if (pRetryError) throw pRetryError;
                    portalData = pRetry;
                } else {
                    portalData = pData;
                }
            }

            const portalMap = new Map();
            portalData.forEach(p => portalMap.set(String(p["Reg ID"] || p.reg_id), p));

            const combined = updateData.map(upd => {
                const portal = portalMap.get(String(upd.reg_id));
                if (!portal) return null;

                return {
                    ...upd,
                    id: upd.id,
                    regId: upd.reg_id,
                    serialNo: upd.serial_no || "-",
                    beneficiaryName: portal["Beneficiary Name"] || portal.beneficiary_name || "-",
                    fatherName: portal["Father's Name"] || portal.fathers_name || portal.father_husband_name || portal.father_name || "-",
                    mobileNumber: portal["Mobile Number"] || portal.mobile_number || "-",
                    village: portal["Village"] || portal.village || "-",
                    block: portal["Block"] || portal.block || "-",
                    district: portal["District"] || portal.district || "-",
                    pincode: portal["Pincode"] || portal.pincode || "-",
                    pumpCapacity: portal["Pump Capacity"] || portal.pump_type || portal.pump_capacity || "-",
                    pumpHead: portal["Pump Head"] || portal.pump_head || "-",
                    ipName: portal["IP Name"] || portal.ip_name || portal.installer_name || "-",
                    amount: portal["Amount"] || portal.amount || "-",
                };
            }).filter(Boolean);

            setPendingItems(combined.filter(item => !item.supply_aapurti_date));
            setHistoryItems(combined.filter(item => item.supply_aapurti_date));
        } catch (e) {
            console.error("Fetch Data Error:", e);
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
        setIsBulk(false);
        setSelectedItem(item);
        setIsSuccess(false);
        setFormData({
            photo_link: item.photo_link || "",
            photo_link_file: null,
            photo_rms_data_pending: item.photo_rms_data_pending || "",
            photo_rms_data_pending_file: null,
            longitude: item.longitude || "",
            latitude: item.latitude || "",
            supply_aapurti_date: item.supply_aapurti_date || new Date().toISOString().split('T')[0],
            scadalot_creation: item.scadalot_creation || "Done",
            lot_ref_no: item.lot_ref_no || "",
            lot_name: item.lot_name || "",
            asset_mapping_by_ea: item.asset_mapping_by_ea || "Done",
            days_7_verification: item.days_7_verification || "Done",
            rms_data_mail_to_rotommag: item.rms_data_mail_to_rotommag || "Done",
            reg_id: item.reg_id || item.regId || "",
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
            photo_link: "",
            photo_link_file: null,
            photo_rms_data_pending: "",
            photo_rms_data_pending_file: null,
            longitude: "",
            latitude: "",
            supply_aapurti_date: new Date().toISOString().split('T')[0],
            scadalot_creation: "Done",
            lot_ref_no: "",
            lot_name: "",
            asset_mapping_by_ea: "Done",
            days_7_verification: "Done",
            rms_data_mail_to_rotommag: "Done",
            reg_id: "",
        });
        setIsDialogOpen(true);
    };

    const handleFileUpload = (e, field) => {
        if (e.target.files && e.target.files[0]) {
            setFormData({
                ...formData,
                [`${field}_file`]: e.target.files[0],
            });
        }
    };

    const uploadFile = async (file) => {
        const filePath = `portal-updates/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
            .from("Image_bucket")
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
            .from("Image_bucket")
            .getPublicUrl(filePath);

        return urlData?.publicUrl || "";
    };

    const handleSubmit = async () => {
        if (!selectedItem && (!isBulk || selectedRows.length === 0)) return;
        setIsSubmitting(true);

        try {
            let photoLinkUrl = formData.photo_link;
            let rmsDataUrl = formData.photo_rms_data_pending;

            if (formData.photo_link_file) {
                photoLinkUrl = await uploadFile(formData.photo_link_file);
            }
            if (formData.photo_rms_data_pending_file) {
                rmsDataUrl = await uploadFile(formData.photo_rms_data_pending_file);
            }

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
                const rowUpdate = {
                    photo_link: photoLinkUrl,
                    photo_rms_data_pending: rmsDataUrl,
                    longitude: formData.longitude ? parseFloat(formData.longitude) : null,
                    latitude: formData.latitude ? parseFloat(formData.latitude) : null,
                    supply_aapurti_date: formData.supply_aapurti_date || null,
                    scadalot_creation: formData.scadalot_creation,
                    lot_ref_no: formData.lot_ref_no,
                    lot_name: formData.lot_name,
                    asset_mapping_by_ea: formData.asset_mapping_by_ea,
                    days_7_verification: formData.days_7_verification,
                    rms_data_mail_to_rotommag: formData.rms_data_mail_to_rotommag,
                    updated_at: new Date().toISOString(),
                };

                const { error } = await supabase
                    .from("portal_update")
                    .update(rowUpdate)
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

    const Dropdown = ({ label, value, onChange }) => (
        <div className="space-y-1.5">
            <Label className="text-xs text-slate-700 font-medium">{label}</Label>
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex h-9 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                >
                    <option value="Done">Done</option>
                    <option value="Pending">Pending</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                    <svg width="12" height="12" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.13523 6.15803C3.3241 5.95657 3.64052 5.94637 3.84197 6.13523L7.5 9.56464L11.158 6.13523C11.3595 5.94637 11.6759 5.95657 11.8648 6.15803C12.0536 6.35949 12.0434 6.67591 11.842 6.86477L7.84197 10.6148C7.64964 10.7951 7.35036 10.7951 7.15803 10.6148L3.15803 6.86477C2.95657 6.67591 2.94637 6.35949 3.13523 6.15803Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                </div>
            </div>
        </div>
    );

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
                                        <FileText className="h-4 w-4 text-blue-600" />
                                    </div>
                                    Pending Portal Update
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
                            <Button variant="outline" size="sm" onClick={() => setFilters({ regId: "", village: "", block: "", district: "", pumpCapacity: "", ipName: "" })} className="mt-3 text-xs">
                                Clear All Filters
                            </Button>
                        </div>

                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table className="[&_th]:text-center [&_td]:text-center">
                                    <TableHeader className="bg-gradient-to-r from-blue-50/50 to-cyan-50/50">
                                        <TableRow className="border-b border-blue-100 hover:bg-transparent">
                                            <TableHead className="h-14 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap w-12">
                                                <div className="flex justify-center"><Checkbox checked={filteredPendingItems.length > 0 && selectedRows.length === filteredPendingItems.length} onCheckedChange={handleSelectAll} /></div>
                                            </TableHead>
                                            <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap min-w-[150px]">Action</TableHead>
                                            <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Reg ID</TableHead>
                                            <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Beneficiary Name</TableHead>
                                            <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">District</TableHead>
                                            <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">IP Name</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? Array.from({ length: 5 }).map((_, i) => <TableRow key={i} className="animate-pulse"><TableCell colSpan={6}><div className="h-8 bg-slate-200 rounded" /></TableCell></TableRow>) :
                                            filteredPendingItems.length === 0 ? <TableRow><TableCell colSpan={6} className="h-48 text-center text-slate-500">No pending records.</TableCell></TableRow> :
                                                filteredPendingItems.map((item) => (
                                                    <TableRow key={item.regId} className="hover:bg-blue-50/30">
                                                        <TableCell><div className="flex justify-center"><Checkbox checked={selectedRows.includes(item.regId)} onCheckedChange={(c) => handleSelectRow(item.regId, c)} /></div></TableCell>
                                                        <TableCell><Button variant="ghost" size="sm" onClick={() => handleActionClick(item)} className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200">Process</Button></TableCell>
                                                        <TableCell>{item.regId}</TableCell>
                                                        <TableCell>{item.beneficiaryName}</TableCell>
                                                        <TableCell>{item.district}</TableCell>
                                                        <TableCell>{item.ipName}</TableCell>
                                                    </TableRow>
                                                ))}
                                    </TableBody>
                                </Table>
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
                            <CardTitle className="text-lg font-semibold text-blue-900">History & Records</CardTitle>
                            <div className="relative w-full md:w-100">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 bg-white" />
                            </div>
                            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                                {selectedRows.length >= 2 && (
                                    <Button
                                        onClick={handleBulkClick}
                                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 transition-all duration-300 animate-in fade-in slide-in-from-right-4 h-9"
                                        size="sm"
                                    >
                                        <ClipboardCheck className="h-4 w-4 mr-2" />
                                        Update Selected ({selectedRows.length})
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table className="[&_th]:text-center [&_td]:text-center">
                                    <TableHeader className="bg-gradient-to-r from-blue-50/50 to-cyan-50/50">
                                        <TableRow className="border-b border-blue-100 hover:bg-transparent">
                                            <TableHead className="h-14 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap w-12">
                                                <div className="flex justify-center"><Checkbox checked={filteredHistoryItems.length > 0 && selectedRows.length === filteredHistoryItems.length} onCheckedChange={handleSelectAll} /></div>
                                            </TableHead>
                                            <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase">Action</TableHead>
                                            <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase">Reg ID</TableHead>
                                            <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase">Name</TableHead>
                                            <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase">District</TableHead>
                                            <TableHead className="h-14 px-6 text-xs font-bold text-slate-600 uppercase">Supply Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredHistoryItems.length === 0 ? <TableRow><TableCell colSpan={6} className="h-48 text-center text-slate-500">No history records.</TableCell></TableRow> :
                                            filteredHistoryItems.map((item) => (
                                                <TableRow key={item.regId} className="hover:bg-blue-50/30">
                                                    <TableCell><div className="flex justify-center"><Checkbox checked={selectedRows.includes(item.regId)} onCheckedChange={(c) => handleSelectRow(item.regId, c)} /></div></TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleActionClick(item)}
                                                            className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 shadow-xs text-xs font-semibold h-8 px-4 rounded-full flex items-center gap-2 transition-all duration-300 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                                            disabled={selectedRows.length >= 2}
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                            Edit
                                                        </Button>
                                                    </TableCell>
                                                    <TableCell>{item.regId}</TableCell>
                                                    <TableCell>{item.beneficiaryName}</TableCell>
                                                    <TableCell>{item.district}</TableCell>
                                                    <TableCell>{item.supply_aapurti_date}</TableCell>

                                                </TableRow>
                                            ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent showCloseButton={!isSuccess} className={`max-w-4xl max-h-[90vh] overflow-y-auto p-0 ${isSuccess ? "bg-transparent shadow-none border-none" : "bg-white"}`}>
                    {isSuccess ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center space-y-6">
                            <CheckCircle2 className="h-16 w-16 text-green-600" />
                            <h2 className="text-3xl font-bold text-white">Submitted Successfully!</h2>
                        </div>
                    ) : (
                        <>
                            <DialogHeader className="p-6 border-b border-blue-100 bg-blue-50/30">
                                <DialogTitle className="text-xl font-bold text-blue-900">Update Portal Record</DialogTitle>
                                <DialogDescription>{isBulk ? `Updating ${selectedRows.length} items` : `Update details for ${selectedItem?.beneficiaryName}`}</DialogDescription>
                            </DialogHeader>

                            {(selectedItem || isBulk) && (
                                <div className="grid gap-6 p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-700 font-medium">Photo Link (Upload)</Label>
                                            <div className="flex gap-2 items-center">
                                                <Input type="file" onChange={(e) => handleFileUpload(e, 'photo_link')} className="file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 h-9" />
                                                {formData.photo_link && typeof formData.photo_link === 'string' && (
                                                    <a href={formData.photo_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline"><ExternalLink className="h-4 w-4" /></a>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-700 font-medium">RMS Data Pending (Upload)</Label>
                                            <div className="flex gap-2 items-center">
                                                <Input type="file" onChange={(e) => handleFileUpload(e, 'photo_rms_data_pending')} className="file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 h-9" />
                                                {formData.photo_rms_data_pending && typeof formData.photo_rms_data_pending === 'string' && (
                                                    <a href={formData.photo_rms_data_pending} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline"><ExternalLink className="h-4 w-4" /></a>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-700 font-medium">Longitude</Label>
                                            <Input value={formData.longitude} onChange={(e) => setFormData({ ...formData, longitude: e.target.value })} placeholder="0.000000" />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-700 font-medium">Latitude</Label>
                                            <Input value={formData.latitude} onChange={(e) => setFormData({ ...formData, latitude: e.target.value })} placeholder="0.000000" />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-700 font-medium">Supply (Aapurti) Date</Label>
                                            <Input type="date" value={formData.supply_aapurti_date} onChange={(e) => setFormData({ ...formData, supply_aapurti_date: e.target.value })} />
                                        </div>

                                        <Dropdown label="SCADA Lot Creation" value={formData.scadalot_creation} onChange={(val) => setFormData({ ...formData, scadalot_creation: val })} />

                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-700 font-medium">Lot Ref No</Label>
                                            <Input value={formData.lot_ref_no} onChange={(e) => setFormData({ ...formData, lot_ref_no: e.target.value })} />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-700 font-medium">Lot Name</Label>
                                            <Input value={formData.lot_name} onChange={(e) => setFormData({ ...formData, lot_name: e.target.value })} />
                                        </div>

                                        <Dropdown label="Asset Mapping by EA" value={formData.asset_mapping_by_ea} onChange={(val) => setFormData({ ...formData, asset_mapping_by_ea: val })} />
                                        <Dropdown label="7 Days Verification" value={formData.days_7_verification} onChange={(val) => setFormData({ ...formData, days_7_verification: val })} />
                                        <Dropdown label="RMS Data Mail to Rotomag" value={formData.rms_data_mail_to_rotommag} onChange={(val) => setFormData({ ...formData, rms_data_mail_to_rotommag: val })} />
                                    </div>

                                    <div className="flex justify-end gap-4 mt-4 pt-4 border-t border-slate-100 pb-6 pr-6">
                                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting} className="px-6 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200">Cancel</Button>
                                        <Button
                                            onClick={handleSubmit}
                                            disabled={isSubmitting}
                                            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/20 px-8"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Submit
                                                </>
                                            ) : (
                                                "Submit"
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
