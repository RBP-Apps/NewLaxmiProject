import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Check, ChevronsUpDown, Loader2, ShieldAlert, KeyRound, Search, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Hardcoded page options from sidebar menu
const PAGE_OPTIONS = [
    "Dashboard",
    "Portal",
    "Work order",
    "Survey",
    "Dispatch & Receiving",
    "Installation",
    "Portal Update",
    "Invoicing",
    "Benificiary Share",
    "JCR Status",
    "System Info",
    "Insurance",
    "IP payment",
    "Settings",
];

export default function SettingPage() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingUser, setEditingUser] = useState(null); // null = Add mode, object = Edit mode
    const [formData, setFormData] = useState({
        userName: "",
        userId: "",
        password: "",
        role: "User",
        pageAccess: [],
    });

    const [searchTerm, setSearchTerm] = useState("");

    const filteredUsers = users.filter((user) =>
        Object.values(user).some((value) =>
            String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("users")
                .select("*")
                .order("id", { ascending: true });

            if (error) throw error;

            const loadedUsers = (data || []).map((row) => ({
                id: row.id,
                userName: row.user_name || "",
                userId: row.user_id || "",
                password: row.pass || "",
                role: row.role || "User",
                pageAccess: row.page_access
                    ? String(row.page_access).split(",").map((s) => s.trim()).filter(Boolean)
                    : [],
                status: row.status || "Active",
            }));

            setUsers(loadedUsers);
        } catch (e) {
            console.error("Fetch Data Error:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handlePageAccessToggle = (page) => {
        setFormData((prev) => {
            const current = prev.pageAccess;
            if (current.includes(page)) {
                return { ...prev, pageAccess: current.filter((p) => p !== page) };
            } else {
                return { ...prev, pageAccess: [...current, page] };
            }
        });
    };

    const openAddDialog = () => {
        setEditingUser(null);
        setFormData({
            userName: "",
            userId: "",
            password: "",
            role: "User",
            pageAccess: [],
        });
        setIsDialogOpen(true);
    };

    const openEditDialog = (user) => {
        setEditingUser(user);
        setFormData({
            userName: user.userName,
            userId: user.userId,
            password: user.password,
            role: user.role,
            pageAccess: user.pageAccess || [],
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const payload = {
                user_name: formData.userName,
                user_id: formData.userId,
                pass: formData.password,
                role: formData.role,
                page_access: formData.pageAccess.join(", "),
                status: "Active",
            };

            if (editingUser) {
                // --- UPDATE existing user ---
                const { error } = await supabase
                    .from("users")
                    .update(payload)
                    .eq("id", editingUser.id);

                if (error) throw error;
            } else {
                // --- INSERT new user ---
                const { error } = await supabase
                    .from("users")
                    .insert([payload]);

                if (error) throw error;
            }

            setIsDialogOpen(false);
            setEditingUser(null);
            setFormData({
                userName: "",
                userId: "",
                password: "",
                role: "User",
                pageAccess: [],
            });
            fetchData(); // Refresh
        } catch (e) {
            console.error("Submit Error:", e);
            alert("Error saving user: " + e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (user) => {
        if (!window.confirm(`Are you sure you want to delete user "${user.userName}"?`)) return;

        try {
            const { error } = await supabase
                .from("users")
                .delete()
                .eq("id", user.id);

            if (error) throw error;
            fetchData(); // Refresh
        } catch (e) {
            console.error("Delete Error:", e);
            alert("Error deleting user: " + e.message);
        }
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10 animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">User Management</h1>
                    <p className="text-slate-500 mt-1">Manage system users, roles, and access permissions.</p>
                </div>
                <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-md hover:shadow-lg transition-all"
                    onClick={openAddDialog}
                >
                    <UserPlus className="h-4 w-4" />
                    Add New User
                </Button>
            </div>

            <Card className="border border-blue-100 shadow-xl shadow-blue-100/20 bg-white/80 backdrop-blur-sm overflow-hidden">
                <CardHeader className="border-b border-blue-50 bg-blue-50/30 px-6 py-1 flex flex-col md:flex-row items-center justify-between gap-4 h-auto min-h-[3.5rem]">
                    <CardTitle className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-600" />
                        Registered Users
                    </CardTitle>
                    <div className="relative w-full md:w-100">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 bg-white border-black focus-visible:ring-blue-200 h-9 transition-all hover:border-blue-200"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table className="[&_th]:text-center [&_td]:text-center">
                            <TableHeader className="bg-gradient-to-r from-blue-50/50 to-cyan-50/50">
                                <TableRow className="border-b border-blue-100 hover:bg-transparent">
                                    <TableHead className="h-12 font-bold text-slate-600 w-[150px]">User Name</TableHead>
                                    <TableHead className="h-12 font-bold text-slate-600 w-[120px]">User ID</TableHead>
                                    <TableHead className="h-12 font-bold text-slate-600 w-[120px]">Password</TableHead>
                                    <TableHead className="h-12 font-bold text-slate-600 w-[100px]">Role</TableHead>
                                    <TableHead className="h-12 font-bold text-slate-600 w-[250px]">Page Access</TableHead>
                                    <TableHead className="h-12 font-bold text-slate-600 w-[120px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i} className="animate-pulse">
                                            {Array.from({ length: 6 }).map((__, j) => (
                                                <TableCell key={j}><div className="h-4 bg-slate-100 rounded w-2/3 mx-auto"></div></TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : filteredUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                                            {users.length === 0 ? "No users found." : "No users found matching your search."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUsers.map((user, index) => (
                                        <TableRow key={user.id || index} className="hover:bg-blue-50/30 transition-colors">
                                            <TableCell className="font-medium text-slate-800">{user.userName}</TableCell>
                                            <TableCell className="font-mono text-xs text-slate-500">{user.userId}</TableCell>
                                            <TableCell className="font-mono text-xs text-slate-500 tracking-wider">
                                                {user.password}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={cn(
                                                    "uppercase text-[10px] tracking-wider",
                                                    user.role?.toLowerCase() === 'admin'
                                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                                        : "bg-slate-50 text-slate-700 border-slate-200"
                                                )}>
                                                    {user.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="max-w-[250px] mx-auto text-xs text-slate-600 font-medium whitespace-normal break-words text-center">
                                                    {user.pageAccess && user.pageAccess.length > 0 ? (
                                                        user.pageAccess.join(", ")
                                                    ) : (
                                                        <span className="text-slate-400 italic">No Access</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                                        onClick={() => openEditDialog(user)}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
                                                        onClick={() => handleDelete(user)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-blue-800">
                            {editingUser ? <Pencil className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                            {editingUser ? "Edit User" : "Add New User"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingUser ? "Update user details and permissions." : "Create a new user and assign permissions."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="userName">User Name</Label>
                            <Input
                                id="userName"
                                placeholder="e.g. John Doe"
                                value={formData.userName}
                                onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                                className="focus-visible:ring-blue-500"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="userId">User ID</Label>
                                <Input
                                    id="userId"
                                    placeholder="e.g. user123"
                                    value={formData.userId}
                                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                                    className="focus-visible:ring-blue-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    placeholder="Secret key"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="focus-visible:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Role</Label>
                            <Select
                                value={formData.role}
                                onValueChange={(val) => setFormData({ ...formData, role: val })}
                            >
                                <SelectTrigger className="focus:ring-blue-500 hover:bg-transparent hover:text-slate-900 border-slate-200 hover:border-blue-300 transition-colors">
                                    <SelectValue placeholder="Select Role" />
                                </SelectTrigger>
                                <SelectContent className="border-blue-50">
                                    <SelectItem value="Admin" className="focus:bg-blue-50 focus:text-slate-900 cursor-pointer">Admin</SelectItem>
                                    <SelectItem value="User" className="focus:bg-blue-50 focus:text-slate-900 cursor-pointer">User</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Page Access</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-between text-left font-normal bg-white border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 active:scale-100 hover:border-blue-300 hover:bg-slate-50 hover:text-slate-900 transition-all"
                                    >
                                        <span className={cn("truncate", formData.pageAccess.length === 0 && "text-muted-foreground")}>
                                            {formData.pageAccess.length > 0
                                                ? `${formData.pageAccess.length} Selected`
                                                : "Select Pages"}
                                        </span>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-slate-500" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0 shadow-lg border-blue-50" align="start">
                                    <div className="h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-transparent">
                                        <div className="p-2 grid gap-1">
                                            {PAGE_OPTIONS.map((page) => (
                                                <div
                                                    key={page}
                                                    className="
                                                flex items-center space-x-2 p-2
                                                hover:bg-blue-50
                                                rounded-md cursor-pointer
                                                transition-colors
                                            "
                                                    onClick={() => handlePageAccessToggle(page)}
                                                >
                                                    <Checkbox
                                                        id={`page-${page}`}
                                                        checked={formData.pageAccess.includes(page)}
                                                        onCheckedChange={() => handlePageAccessToggle(page)}
                                                        className="
                                                    border-slate-300
                                                    data-[state=checked]:bg-blue-600
                                                    data-[state=checked]:border-blue-600
                                                    focus-visible:ring-2
                                                    focus-visible:ring-blue-500
                                                    focus-visible:ring-offset-2
                                                    hover:border-blue-400
                                                "
                                                    />
                                                    <label
                                                        htmlFor={`page-${page}`}
                                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                                                    >
                                                        {page}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                            {formData.pageAccess.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {formData.pageAccess.map(p => (
                                        <Badge key={p} variant="secondary" className="text-[10px] bg-blue-50 text-blue-600 hover:bg-blue-100">
                                            {p}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-50 mt-4">
                        <Button
                            variant="outline"
                            className="border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            onClick={() => { setIsDialogOpen(false); setEditingUser(null); }}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !formData.userName || !formData.userId}
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {editingUser ? "Update User" : "Save User"}
                        </Button>
                    </div>

                </DialogContent>
            </Dialog>
        </div>
    );
}
