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
    <div className="space-y-6 sm:space-y-8 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto animate-fade-in-up min-h-screen bg-slate-50/50">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
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
            className="pl-9 bg-white border-slate-200 focus-visible:ring-blue-100 transition-all hover:border-slate-300 shadow-sm h-10 rounded-lg"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-sm rounded-xl bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Total Beneficiaries
              </p>
              <h3 className="text-2xl font-bold text-slate-800">
                {stats.total}
              </h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100/50">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm rounded-xl bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Districts Covered
              </p>
              <h3 className="text-2xl font-bold text-slate-800">
                {stats.districts}
              </h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100/50">
              <MapPin className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm rounded-xl bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Villages Reach
              </p>
              <h3 className="text-2xl font-bold text-slate-800">
                {stats.villages}
              </h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100/50">
              <Home className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Dropdowns */}
      <Card className="border border-slate-200 shadow-sm rounded-xl bg-white">
        <CardContent className="p-4 sm:p-6 bg-slate-50/50 rounded-xl">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {[
              { key: "regId", label: "Reg ID" },
              { key: "village", label: "Village" },
              { key: "block", label: "Block" },
              { key: "district", label: "District" },
              { key: "pumpCapacity", label: "Pump Capacity" },
              { key: "ipName", label: "IP Name" },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</Label>
                <select
                  value={filters[key]}
                  onChange={(e) =>
                    setFilters({ ...filters, [key]: e.target.value })
                  }
                  className="w-full h-9 flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
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
            className="mt-4 text-xs h-8 px-3 border-slate-200 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 shadow-sm"
          >
            Clear Filters
          </Button>
        </CardContent>
      </Card>

      {/* Search and Add Button Removed as per request, Form preserved below */}
      <Dialog open={open} onOpenChange={setOpen}>
        {/* Trigger removed */}
        <DialogContent className="max-w-2xl max-h-[75vh] md:max-h-[80vh] flex flex-col p-6 overflow-visible rounded-2xl">
          <DialogHeader className="shrink-0 mb-4 border-b border-slate-100 pb-2">
            <DialogTitle className="text-xl font-bold text-slate-800 pb-1">
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
          <div className="flex justify-end items-center gap-3 mt-4 pt-4 border-t border-slate-100 shrink-0 bg-white -mx-6 px-6 -mb-4 pb-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="h-10 min-w-[100px] border-slate-200 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all duration-300 h-10 min-w-[100px]"
            >
              Submit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
        <CardContent className="!p-0">
          {/* Desktop Table View */}
          <div className="overflow-x-auto min-h-[300px] max-h-[70vh] rounded-b-xl [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <Table className="w-full text-left">
              <TableHeader className="bg-slate-50/80 sticky top-0 z-20 backdrop-blur">
                <TableRow className="border-b border-slate-100 hover:bg-transparent">
                  <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50 w-16">
                    S.No
                  </TableHead>
                  <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50">
                    Reg ID
                  </TableHead>
                  <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50">
                    Beneficiary Name
                  </TableHead>
                  <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50">
                    Father's Name
                  </TableHead>
                  <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50">
                    Mobile Number
                  </TableHead>
                  <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50">
                    Village
                  </TableHead>
                  <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50">
                    Block
                  </TableHead>
                  <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50">
                    District
                  </TableHead>
                  <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50">
                    Pincode
                  </TableHead>
                  <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50">
                    Pump Capacity
                  </TableHead>
                  <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50">
                    Pump Head
                  </TableHead>
                  <TableHead className="h-11 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center align-middle bg-slate-50">
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
                  filteredHistory.map((item, index) => (
                    <TableRow
                      key={item.regId}
                      className="hover:bg-slate-50/80 transition-colors data-[state=selected]:bg-slate-50 border-b border-slate-100 group"
                    >
                      <TableCell className="px-4 py-2 text-center align-middle font-medium text-slate-500 text-[13px]">
                        {item.serialNo}
                      </TableCell>
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