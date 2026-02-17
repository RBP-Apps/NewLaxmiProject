import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, Users, MapPin, Home } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
export default function PortalPage() {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    regId: "",
    village: "",
    block: "",
    district: "",
    pumpCapacity: "",
    ipName: "",
  });

  const getUniqueValues = (field) => {
    const values = history
      .map((item) => item[field])
      .filter((v) => v && v !== "-");
    return [...new Set(values)].sort();
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.from("portal").select("*");
      console.log("data", data);
      if (error) {
        throw error;
      }

      if (data) {
        // Map Supabase columns to component state structure if necessary
        // Assuming Supabase columns match or are similar to expected keys.
        // If column names in Supabase are snake_case, we maps them to camelCase here.
        // If they are already camelCase or match, we can use them directly.
        // For now, I'll map common snake_case patterns to the expected camelCase keys just in case.
        const mappedData = data.map((item) => ({
          serialNo: item.serial_no || "-",
          regId: item.reg_id || "-",
          beneficiaryName: item.beneficiary_name || "-",
          fatherName: item.fathers_name || "-",
          mobileNumber: item.mobile_number || "-",
          village: item.village || "-",
          block: item.block || "-",
          district: item.district || "-",
          pincode: item.pincode || "-",
          pumpCapacity: item.pump_capacity || "-",
          pumpHead: item.pump_head || "-",
          ipName: item.ip_name || "-",
          amount: item.amount || "-",
        }));

        setHistory(mappedData);
        setIsLoaded(true);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // (Removed localStorage save logic as we are now syncing from Sheet)

  const [searchTerm, setSearchTerm] = useState("");

  // const filteredHistory = history.filter((item) =>
  //   Object.values(item).some((value) =>
  //     value.toString().toLowerCase().includes(searchTerm.toLowerCase())
  //   )
  // );

  const filteredHistory = history.filter((item) => {
    // Search term filter
    const matchesSearch = Object.values(item).some((value) =>
      value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Dropdown filters
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
    regId: "",
    beneficiaryName: "",
    fatherName: "",
    village: "",
    block: "",
    district: "",
    category: "",
    pumpSource: "",
    pumpType: "",
    company: "",
  });
  const generateSerialNo = () => {
    // Simple auto-increment based on history length + timestamp for uniqueness
    const timestamp = Date.now().toString().slice(-6);
    const count = history.length + 1;
    return `SR${count.toString().padStart(4, "0")}-${timestamp}`;
  };
  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };
  const handleSubmit = () => {
    const newEntry = {
      ...formData,
      serialNo: generateSerialNo(),
    };
    setHistory([newEntry, ...history]); // Add to top
    setOpen(false);
    // Reset form
    setFormData({
      regId: "",
      beneficiaryName: "",
      fatherName: "",
      village: "",
      block: "",
      district: "",
      category: "",
      pumpSource: "",
      pumpType: "",
      company: "",
    });
  };
  // Calculate quick stats
  const stats = {
    total: history.length,
    districts: new Set(history.map((i) => i.district).filter((d) => d !== "-"))
      .size,
    villages: new Set(history.map((i) => i.village).filter((v) => v !== "-"))
      .size,
  };

  return (
    <div className="space-y-6 px-4 pt-2 pb-4 md:px-8 md:pt-4 md:pb-8 max-w-[1600px] mx-auto animate-fade-in-up min-h-screen bg-slate-50/50">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
            Registration Portal
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Centralized beneficiary registry and project data.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search beneficiaries, IDs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white border-slate-200 focus-visible:ring-blue-500 transition-all hover:border-blue-300"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/80 backdrop-blur border-blue-100 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">
                Total Beneficiaries
              </p>
              <h3 className="text-2xl font-bold text-slate-800">
                {stats.total}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/80 backdrop-blur border-purple-100 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">
                Districts Covered
              </p>
              <h3 className="text-2xl font-bold text-slate-800">
                {stats.districts}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
              <MapPin className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/80 backdrop-blur border-emerald-100 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">
                Villages Reach
              </p>
              <h3 className="text-2xl font-bold text-slate-800">
                {stats.villages}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Home className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Dropdowns */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="p-4">
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
                  {getUniqueValues(key).map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Clear Filters Button */}
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
        </CardContent>
      </Card>

      {/* Search and Add Button Removed as per request, Form preserved below */}
      <Dialog open={open} onOpenChange={setOpen}>
        {/* Trigger removed */}
        <DialogContent className="max-w-2xl max-h-[75vh] md:max-h-[80vh] flex flex-col p-6 overflow-visible">
          <DialogHeader className="shrink-0">
            <DialogTitle className="bg-linear-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent pb-1">
              Beneficiary Registration
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 py-4">
              <div className="space-y-2">
                <Label
                  htmlFor="regId"
                  className="text-sm font-medium text-slate-700"
                >
                  Reg ID
                </Label>
                <Input
                  id="regId"
                  name="regId"
                  value={formData.regId}
                  onChange={handleInputChange}
                  className="h-10 text-sm focus-visible:ring-blue-100"
                  placeholder="Enter Reg ID"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="category"
                  className="text-sm font-medium text-slate-700"
                >
                  Category
                </Label>
                <Input
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="h-10 text-sm focus-visible:ring-blue-100"
                  placeholder="Enter Category"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label
                  htmlFor="beneficiaryName"
                  className="text-sm font-medium text-slate-700"
                >
                  Beneficiary Name
                </Label>
                <Input
                  id="beneficiaryName"
                  name="beneficiaryName"
                  value={formData.beneficiaryName}
                  onChange={handleInputChange}
                  className="h-10 text-sm focus-visible:ring-blue-100"
                  placeholder="Enter Beneficiary Name"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label
                  htmlFor="fatherName"
                  className="text-sm font-medium text-slate-700"
                >
                  Father's Name
                </Label>
                <Input
                  id="fatherName"
                  name="fatherName"
                  value={formData.fatherName}
                  onChange={handleInputChange}
                  className="h-10 text-sm focus-visible:ring-blue-100"
                  placeholder="Enter Father's Name"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="village"
                  className="text-sm font-medium text-slate-700"
                >
                  Village
                </Label>
                <Input
                  id="village"
                  name="village"
                  value={formData.village}
                  onChange={handleInputChange}
                  className="h-10 text-sm focus-visible:ring-blue-100"
                  placeholder="Village Name"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="block"
                  className="text-sm font-medium text-slate-700"
                >
                  Block
                </Label>
                <Input
                  id="block"
                  name="block"
                  value={formData.block}
                  onChange={handleInputChange}
                  className="h-10 text-sm focus-visible:ring-blue-100"
                  placeholder="Block Name"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label
                  htmlFor="district"
                  className="text-sm font-medium text-slate-700"
                >
                  District
                </Label>
                <Input
                  id="district"
                  name="district"
                  value={formData.district}
                  onChange={handleInputChange}
                  className="h-10 text-sm focus-visible:ring-blue-100"
                  placeholder="District Name"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="pumpSource"
                  className="text-sm font-medium text-slate-700"
                >
                  Pump Source
                </Label>
                <Input
                  id="pumpSource"
                  name="pumpSource"
                  value={formData.pumpSource}
                  onChange={handleInputChange}
                  className="h-10 text-sm focus-visible:ring-blue-100"
                  placeholder="Source"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="pumpType"
                  className="text-sm font-medium text-slate-700"
                >
                  Pump Type
                </Label>
                <Input
                  id="pumpType"
                  name="pumpType"
                  value={formData.pumpType}
                  onChange={handleInputChange}
                  className="h-10 text-sm focus-visible:ring-blue-100"
                  placeholder="Type"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label
                  htmlFor="company"
                  className="text-sm font-medium text-slate-700"
                >
                  Company
                </Label>
                <Input
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  className="h-10 text-sm focus-visible:ring-blue-100"
                  placeholder="Company Name"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end items-center gap-3 mt-4 pt-4 border-t shrink-0 bg-slate-50/50 -mx-6 px-6 -mb-4 pb-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="h-10 min-w-[100px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 h-10 min-w-[100px] shadow-sm"
            >
              Submit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="border border-blue-100 shadow-lg shadow-blue-50/50 overflow-hidden bg-white">
        <CardContent className="!p-0">
          {/* Desktop Table View */}
          <div className="overflow-x-auto min-h-[300px] max-h-[70vh] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <Table className="w-full text-sm text-left">
              <TableHeader className="bg-slate-50 sticky top-0 z-20 shadow-sm">
                <TableRow className="border-b border-blue-100 hover:bg-transparent">
                  <TableHead className="h-12 px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-center w-[120px] bg-slate-50/95 backdrop-blur">
                    Serial No
                  </TableHead>
                  <TableHead className="h-12 px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-center bg-slate-50/95 backdrop-blur">
                    Reg ID
                  </TableHead>
                  <TableHead className="h-12 px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-center min-w-[180px] bg-slate-50/95 backdrop-blur">
                    Beneficiary Name
                  </TableHead>
                  <TableHead className="h-12 px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-center min-w-[150px] bg-slate-50/95 backdrop-blur">
                    Father's Name
                  </TableHead>
                  <TableHead className="h-12 px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-center bg-slate-50/95 backdrop-blur">
                    Mobile Number
                  </TableHead>
                  <TableHead className="h-12 px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-center bg-slate-50/95 backdrop-blur">
                    Village
                  </TableHead>
                  <TableHead className="h-12 px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-center bg-slate-50/95 backdrop-blur">
                    Block
                  </TableHead>
                  <TableHead className="h-12 px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-center bg-slate-50/95 backdrop-blur">
                    District
                  </TableHead>
                  <TableHead className="h-12 px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-center bg-slate-50/95 backdrop-blur">
                    Pincode
                  </TableHead>
                  <TableHead className="h-12 px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-center bg-slate-50/95 backdrop-blur">
                    Pump Capacity
                  </TableHead>
                  <TableHead className="h-12 px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-center bg-slate-50/95 backdrop-blur">
                    Pump Head
                  </TableHead>
                  <TableHead className="h-12 px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-center bg-slate-50/95 backdrop-blur">
                    IP Name
                  </TableHead>
                  {/* <TableHead className="h-12 px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-center bg-slate-50/95 backdrop-blur">
                    Amount
                  </TableHead> */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, index) => (
                    <TableRow
                      key={`skeleton-${index}`}
                      className="animate-pulse"
                    >
                      {Array.from({ length: 13 }).map((__, i) => (
                        <TableCell key={i}>
                          <div className="h-4 w-full bg-slate-200 rounded mx-auto"></div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={13}
                      className="h-32 text-center text-muted-foreground bg-slate-50/50"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Search className="h-8 w-8 text-slate-300 mb-2" />
                        <p>No matching records found.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHistory.map((item) => (
                    <TableRow
                      key={item.regId}
                      className="hover:bg-blue-50/50 transition-all duration-200 border-b border-slate-50 last:border-0 hover:shadow-sm"
                    >
                      <TableCell className="font-mono text-center text-xs text-slate-500 bg-slate-50/30">
                        {item.serialNo}
                      </TableCell>
                      <TableCell className="text-center text-xs font-medium text-slate-700">
                        {item.regId}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-slate-800 text-sm">
                        {item.beneficiaryName}
                      </TableCell>
                      <TableCell className="text-center text-slate-600 text-sm">
                        {item.fatherName}
                      </TableCell>
                      <TableCell className="text-center text-slate-600 text-sm font-mono">
                        {item.mobileNumber}
                      </TableCell>
                      <TableCell className="text-center text-slate-600 text-sm">
                        {item.village}
                      </TableCell>
                      <TableCell className="text-center text-slate-600 text-sm">
                        {item.block}
                      </TableCell>
                      <TableCell className="text-center text-slate-600 text-sm">
                        {item.district}
                      </TableCell>
                      <TableCell className="text-center text-slate-600 text-sm font-mono">
                        {item.pincode}
                      </TableCell>
                      <TableCell className="text-center text-slate-600 text-sm">
                        {item.pumpCapacity}
                      </TableCell>
                      <TableCell className="text-center text-slate-600 text-sm">
                        {item.pumpHead}
                      </TableCell>
                      <TableCell className="text-center text-slate-600 text-sm font-medium">
                        {item.ipName}
                      </TableCell>
                      {/* <TableCell className="text-center text-slate-700 text-sm font-medium">
                        {item.amount !== "-" ? `₹${item.amount}` : "-"}
                      </TableCell> */}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
