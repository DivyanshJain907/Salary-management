"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Download,
  Ellipsis,
  FileText,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Plus,
  ReceiptIndianRupee,
  Search,
  Settings,
  ShieldCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Employee = {
  _id?: string;
  name: string;
  role: string;
  phone?: string;
  whatsappOptIn?: boolean;
  salary?: number;
  joiningDate?: string;
  totalLeaveAllowance?: number;
  leaveDays?: number;
  unpaidLeaveDays?: number;
  leaveDeduction?: number;
  adjustedSalary?: number;
  amount: string;
  status: string;
  initials: string;
  color: string;
};
const navGroups = [
  { label: "MAIN", items: [{ label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "PEOPLE",
    items: [
      { label: "All employees", icon: Users },
      { label: "Attendance & leave", icon: CalendarDays },
    ],
  },
  {
    label: "PAYROLL",
    items: [
      { label: "Salary management", icon: ReceiptIndianRupee },
      { label: "Advances", icon: WalletCards },
      { label: "Payments", icon: CreditCard },
      { label: "Employee ledger", icon: FileText },
    ],
  },
  {
    label: "FINANCIALS",
    items: [
      { label: "Staff expenses", icon: CircleDollarSign },
      { label: "Reports & analytics", icon: BarChart },
    ],
  },
];

function StatCard({ title, value, change, icon: Icon, tone, onMore }: { title: string; value: string; change: string; icon: typeof Users; tone: string; onMore?: () => void }) {
  const positive = !change.startsWith("-");
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm shadow-slate-100">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}><Icon size={20} /></div>
        <button onClick={onMore} className="text-slate-400 hover:text-slate-700" aria-label={`More options for ${title}`}><MoreHorizontal size={18} /></button>
      </div>
      <p className="mt-4 text-sm text-slate-500">{title}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
        <span className={`mb-1 flex items-center gap-0.5 text-xs font-medium ${positive ? "text-emerald-600" : "text-rose-600"}`}>
          {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{change}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-400">vs. previous month</p>
    </div>
  );
}

export default function Home() {
  const [authLoading, setAuthLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [active, setActive] = useState("Dashboard");
  const [period, setPeriod] = useState("This month");
  const [query, setQuery] = useState("");
  const [showPayroll, setShowPayroll] = useState(false);
  const [payrollPaymentMethod, setPayrollPaymentMethod] = useState("Bank transfer");
  const [savingPayroll, setSavingPayroll] = useState(false);
  const [panel, setPanel] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [storedEmployees, setStoredEmployees] = useState<Employee[]>([]);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeForm, setEmployeeForm] = useState({ name: "", role: "", phone: "", salary: "", joiningDate: "", totalLeaveAllowance: "", whatsappOptIn: false });
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState({ employeeName: "", date: new Date().toISOString().slice(0, 10), status: "Present", note: "" });
  const [attendanceRecords, setAttendanceRecords] = useState<Array<{ _id: string; employeeName: string; date: string; status: string; note?: string }>>([]);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({ employeeName: "", amount: "", date: new Date().toISOString().slice(0, 10), purpose: "", method: "Cash" });
  const [advanceRecords, setAdvanceRecords] = useState<Array<{ _id: string; employeeName: string; amount: number; date: string; purpose: string; method: string; status: string }>>([]);
  const [savingAdvance, setSavingAdvance] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ employeeName: "", amount: "", date: new Date().toISOString().slice(0, 10), method: "Bank transfer", reference: "" });
  const [paymentRecords, setPaymentRecords] = useState<Array<{ _id: string; employeeName: string; amount: number; date: string; method: string; reference?: string; status: string }>>([]);
  const [savingPayment, setSavingPayment] = useState(false);
  const [ledgerRecords, setLedgerRecords] = useState<Array<{ employeeName: string; salary: number; leaveAllowance: number; leaveDays: number; unpaidLeaveDays: number; leaveDeduction: number; netSalary: number; totalAdvances: number; totalPayments: number; remainingSalary: number; transactions: Array<{ type: string; amount: number; date: string; description: string; status: string }> }>>([]);
  const [selectedLedgerEmployee, setSelectedLedgerEmployee] = useState("");
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<{ _id: string; category: string; amount: number; date: string; description: string; status: string } | null>(null);
  const [expenseForm, setExpenseForm] = useState({ category: "Travel", amount: "", date: new Date().toISOString().slice(0, 10), description: "", status: "Pending" });
  const [expenseRecords, setExpenseRecords] = useState<Array<{ _id: string; category: string; amount: number; date: string; description: string; status: string }>>([]);
  const [savingExpense, setSavingExpense] = useState(false);
  const [auditLogs, setAuditLogs] = useState<Array<{ _id: string; action: string; entity: string; details: string; actor: string; createdAt: string }>>([]);
  const [settingsForm, setSettingsForm] = useState({ companyName: "Jain Sales Corporation", adminEmail: "", currency: "INR", payrollDay: "30" });
  const [savingSettings, setSavingSettings] = useState(false);
  const totalAmount = (records: Array<{ amount: number }>) => records.reduce((sum, record) => sum + record.amount, 0);
  const payrollMonth = new Date().toISOString().slice(0, 7);
  const allEmployees = useMemo(() => storedEmployees.map((employee) => {
    const paid = paymentRecords.filter((payment) => payment.employeeName === employee.name).reduce((total, payment) => total + payment.amount, 0);
    const advances = advanceRecords.filter((advance) => advance.employeeName === employee.name).reduce((total, advance) => total + advance.amount, 0);
    const leaveDays = attendanceRecords.filter((record) => record.employeeName === employee.name && record.date.startsWith(payrollMonth) && ["Leave", "Absent"].includes(record.status)).length;
    const unpaidLeaveDays = Math.max(leaveDays - (employee.totalLeaveAllowance || 0), 0);
    const leaveDeduction = unpaidLeaveDays * ((employee.salary || 0) / 26);
    const adjustedSalary = Math.max((employee.salary || 0) - leaveDeduction, 0);
    return {
      ...employee,
      amount: employee.amount || `₹${(employee.salary || 0).toLocaleString("en-IN")}`,
      status: paid + advances >= adjustedSalary && paid + advances > 0 ? "Paid" : paid + advances > 0 ? "Partial" : employee.status,
      leaveDays,
      unpaidLeaveDays,
      leaveDeduction,
      adjustedSalary,
      initials: employee.initials || employee.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
      color: employee.color || "bg-blue-100 text-blue-700",
    };
  }), [advanceRecords, attendanceRecords, payrollMonth, paymentRecords, storedEmployees]);
  const filteredEmployees = useMemo(() => allEmployees.filter((employee) => employee.name.toLowerCase().includes(query.toLowerCase()) || employee.role.toLowerCase().includes(query.toLowerCase())), [allEmployees, query]);
  const openWhatsAppMessage = (employeeName: string, message: string) => {
    const employee = allEmployees.find((item) => item.name === employeeName);
    if (!employee?.phone || !employee.whatsappOptIn) return;
    const digits = employee.phone.replace(/\D/g, "");
    const phone = digits.length === 10 ? `91${digits}` : digits;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };
  const totalSalary = useMemo(() => allEmployees.reduce((total, employee) => total + (employee.salary || 0), 0), [allEmployees]);
  const totalAdjustedSalary = useMemo(() => allEmployees.reduce((total, employee) => total + (employee.adjustedSalary || 0), 0), [allEmployees]);
  const totalPaymentAmount = useMemo(() => totalAmount(paymentRecords), [paymentRecords]);
  const totalAdvanceAmount = useMemo(() => totalAmount(advanceRecords), [advanceRecords]);
  const totalPaid = useMemo(() => totalPaymentAmount + totalAdvanceAmount, [totalAdvanceAmount, totalPaymentAmount]);
  const salaryOverviewData = useMemo(() => [
    { name: "Paid", value: totalPaid },
    { name: "Pending", value: Math.max(totalAdjustedSalary - totalPaid, 0) },
  ], [totalAdjustedSalary, totalPaid]);
  const paymentMethodData = useMemo(() => {
    const totals = paymentRecords.reduce<Record<string, number>>((result, payment) => {
      result[payment.method] = (result[payment.method] || 0) + payment.amount;
      return result;
    }, {});
    return Object.entries(totals).map(([name, value]) => ({ name, value: totalPaymentAmount ? Math.round((value / totalPaymentAmount) * 100) : 0 }));
  }, [paymentRecords, totalPaymentAmount]);
  const openPanel = (name: string) => setPanel(name);
  const logout = async () => {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) {
      showToast("Unable to sign out");
      return;
    }
    setPanel(null);
    setAuthenticated(false);
  };
  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  };
  const refreshLedger = async () => {
    const response = await fetch("/api/ledger");
    if (!response.ok) throw new Error("Unable to load employee ledger");
    const records = await response.json();
    setLedgerRecords(records);
    setSelectedLedgerEmployee((current) => records.some((record: { employeeName: string }) => record.employeeName === current) ? current : records[0]?.employeeName || "");
  };
  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((result) => setAuthenticated(result.authenticated))
      .catch(() => setAuthenticated(false))
      .finally(() => setAuthLoading(false));
  }, []);
  useEffect(() => {
    if (!authenticated) return;
    fetch("/api/employees")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load employees");
        return response.json();
      })
      .then((employees) => {
        setStoredEmployees(employees);
        const employeeName = employees[0]?.name;
        if (!employeeName) return;
        setAttendanceForm((current) => current.employeeName ? current : { ...current, employeeName });
        setAdvanceForm((current) => current.employeeName ? current : { ...current, employeeName });
        setPaymentForm((current) => current.employeeName ? current : { ...current, employeeName });
      })
      .catch(() => showToast("Connect MongoDB to load saved employees"));
    fetch("/api/attendance")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load attendance");
        return response.json();
      })
      .then(setAttendanceRecords)
      .catch(() => showToast("Unable to load saved attendance"));
    fetch("/api/advances")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load advances");
        return response.json();
      })
      .then(setAdvanceRecords)
      .catch(() => showToast("Unable to load saved advances"));
    fetch("/api/payments")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load payments");
        return response.json();
      })
      .then(setPaymentRecords)
      .catch(() => showToast("Unable to load saved payments"));
    fetch("/api/ledger")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load employee ledger");
        return response.json();
      })
      .then((records) => {
        setLedgerRecords(records);
        setSelectedLedgerEmployee(records[0]?.employeeName || "");
      })
      .catch(() => showToast("Unable to load employee ledger"));
    fetch("/api/expenses")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load expenses");
        return response.json();
      })
      .then(setExpenseRecords)
      .catch(() => showToast("Unable to load saved expenses"));
    fetch("/api/audit-logs")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load audit logs");
        return response.json();
      })
      .then(setAuditLogs)
      .catch(() => showToast("Unable to load audit logs"));
    fetch("/api/settings")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load settings");
        return response.json();
      })
      .then((settings) => setSettingsForm({ companyName: settings.companyName, adminEmail: settings.adminEmail, currency: settings.currency, payrollDay: String(settings.payrollDay) }))
      .catch(() => showToast("Unable to load settings"));
  }, [authenticated]);
  const exportEmployees = () => {
    const csv = ["Employee,Role,Net salary,Status", ...allEmployees.map((employee) => `"${employee.name}","${employee.role}","${employee.amount}","${employee.status}"`)].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    link.download = "salary-activity.csv";
    link.click();
    URL.revokeObjectURL(link.href);
    showToast("Salary activity exported");
  };
  const saveEmployee = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingEmployee(true);
    try {
      const response = await fetch(editingEmployee?._id ? `/api/employees?id=${encodeURIComponent(editingEmployee._id)}` : "/api/employees", {
        method: editingEmployee?._id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employeeForm),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save employee");
      setStoredEmployees((current) => editingEmployee?._id
        ? current.map((employee) => employee._id === editingEmployee._id ? result : employee)
        : [result, ...current]);
      await refreshLedger();
      setEmployeeForm({ name: "", role: "", phone: "", salary: "", joiningDate: "", totalLeaveAllowance: "", whatsappOptIn: false });
      setShowEmployeeForm(false);
      setEditingEmployee(null);
      showToast("Employee saved to MongoDB");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save employee");
    } finally {
      setSavingEmployee(false);
    }
  };
  const editEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setEmployeeForm({
      name: employee.name,
      role: employee.role,
      phone: employee.phone || "",
      salary: String(employee.salary || ""),
      joiningDate: employee.joiningDate || "",
      totalLeaveAllowance: String(employee.totalLeaveAllowance || ""),
      whatsappOptIn: employee.whatsappOptIn === true,
    });
    setShowEmployeeForm(true);
  };
  const deleteEmployee = async (employee: Employee) => {
    if (!employee._id || !window.confirm(`Remove ${employee.name}? Their attendance, advances, payments, and ledger records will also be deleted.`)) return;
    try {
      const response = await fetch(`/api/employees?id=${encodeURIComponent(employee._id)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to remove employee");
      setStoredEmployees((current) => current.filter((item) => item._id !== employee._id));
      setAttendanceRecords((current) => current.filter((item) => item.employeeName !== employee.name));
      setAdvanceRecords((current) => current.filter((item) => item.employeeName !== employee.name));
      setPaymentRecords((current) => current.filter((item) => item.employeeName !== employee.name));
      setSelectedEmployee(null);
      await refreshLedger();
      showToast("Employee removed");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to remove employee");
    }
  };
  const saveAttendance = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingAttendance(true);
    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attendanceForm),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to record attendance");
      setAttendanceRecords((current) => [result, ...current]);
      if (result.status === "Leave" || result.status === "Absent") {
        openWhatsAppMessage(result.employeeName, `*Jain Sales Corporation*\n\nDear ${result.employeeName},\n\n*Attendance Notification*\nYour attendance has been recorded as *${result.status}* for ${result.date}.\n\nIf you believe this record needs correction, please contact the administration team.\n\nRegards,\n*Jain Sales Corporation*`);
      }
      setShowAttendanceForm(false);
      setAttendanceForm((current) => ({ ...current, note: "" }));
      showToast("Attendance recorded");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to record attendance");
    } finally {
      setSavingAttendance(false);
    }
  };
  const saveAdvance = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingAdvance(true);
    try {
      const response = await fetch("/api/advances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(advanceForm),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save advance");
      setAdvanceRecords((current) => [result, ...current]);
      openWhatsAppMessage(result.employeeName, `*Jain Sales Corporation*\n\nDear ${result.employeeName},\n\n*Advance Payment Confirmation*\nAn advance payment has been recorded in your name.\n\nAmount: *₹${result.amount.toLocaleString("en-IN")}*\nDate: *${result.date}*\nPurpose: *${result.purpose}*\nPayment method: *${result.method}*\n\nPlease contact the administration team if you have any questions.\n\nRegards,\n*Jain Sales Corporation*`);
      await refreshLedger();
      setShowAdvanceForm(false);
      setAdvanceForm((current) => ({ ...current, amount: "", purpose: "" }));
      showToast("Advance saved");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save advance");
    } finally {
      setSavingAdvance(false);
    }
  };
  const savePayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingPayment(true);
    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentForm),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save payment");
      setPaymentRecords((current) => [result, ...current]);
      openWhatsAppMessage(result.employeeName, `*Jain Sales Corporation*\n\nDear ${result.employeeName},\n\n*Salary Payment Confirmation*\nYour salary payment has been successfully recorded.\n\nAmount: *₹${result.amount.toLocaleString("en-IN")}*\nDate: *${result.date}*\nPayment method: *${result.method}*\n${result.reference ? `Reference: *${result.reference}*\\n` : ""}\nThank you for your continued contribution to Jain Sales Corporation.\n\nRegards,\n*Jain Sales Corporation*`);
      await refreshLedger();
      setShowPaymentForm(false);
      setPaymentForm((current) => ({ ...current, amount: "", reference: "" }));
      showToast("Payment recorded");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save payment");
    } finally {
      setSavingPayment(false);
    }
  };
  const generatePayroll = async () => {
    setSavingPayroll(true);
    try {
      const response = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: payrollMonth, paymentMethod: payrollPaymentMethod }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to create payroll run");
      setPaymentRecords((current) => [...result.payments, ...current]);
      await refreshLedger();
      setShowPayroll(false);
      showToast(`Payroll run created for ${payrollMonth}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to create payroll run");
    } finally {
      setSavingPayroll(false);
    }
  };
  const saveExpense = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingExpense(true);
    try {
      const response = await fetch(editingExpense ? `/api/expenses?id=${encodeURIComponent(editingExpense._id)}` : "/api/expenses", {
        method: editingExpense ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenseForm),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save expense");
      setExpenseRecords((current) => editingExpense ? current.map((expense) => expense._id === editingExpense._id ? result : expense) : [result, ...current]);
      setShowExpenseForm(false);
      setEditingExpense(null);
      setExpenseForm((current) => ({ ...current, amount: "", description: "", status: "Pending" }));
      showToast("Expense saved");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save expense");
    } finally {
      setSavingExpense(false);
    }
  };
  const editExpense = (expense: typeof expenseRecords[number]) => {
    setEditingExpense(expense);
    setExpenseForm({ category: expense.category, amount: String(expense.amount), date: expense.date, description: expense.description, status: expense.status });
    setShowExpenseForm(true);
  };
  const deleteExpense = async (expense: typeof expenseRecords[number]) => {
    if (!window.confirm(`Remove this ${expense.category} expense?`)) return;
    try {
      const response = await fetch(`/api/expenses?id=${encodeURIComponent(expense._id)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to remove expense");
      setExpenseRecords((current) => current.filter((item) => item._id !== expense._id));
      showToast("Expense removed");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to remove expense");
    }
  };
  const generateReport = () => {
    const rows = [
      ["Metric", "Value"],
      ["Employees", allEmployees.length.toString()],
      ["Attendance records", attendanceRecords.length.toString()],
      ["Advances total", totalAmount(advanceRecords).toString()],
      ["Payments total", totalAmount(paymentRecords).toString()],
      ["Expenses total", totalAmount(expenseRecords).toString()],
    ];
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    link.download = `payroll-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast("Report downloaded");
  };
  const saveSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingSettings(true);
    try {
      const response = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settingsForm) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save settings");
      setSettingsForm({ companyName: result.companyName, adminEmail: result.adminEmail, currency: result.currency, payrollDay: String(result.payrollDay) });
      showToast("Settings saved");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save settings");
    } finally {
      setSavingSettings(false);
    }
  };
  const login = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: loginPassword }),
    });
    if (!response.ok) {
      setLoginError("Incorrect password");
      return;
    }
    setLoginPassword("");
    setAuthenticated(true);
  };
  const sectionDetails: Record<string, { description: string; action: string }> = {
  };

  if (authLoading) return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Checking access...</div>;
  if (!authenticated) return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4"><form onSubmit={login} className="w-full max-w-sm rounded-xl border bg-white p-6 shadow-sm"><Image src="/logo.png" alt="Jain Sales Corporation logo" width={64} height={60} className="object-contain" /><h1 className="mt-5 text-xl font-semibold">Jain Sales Corporation</h1><p className="mt-1 text-sm text-slate-500">Sign in to manage payroll.</p><label className="mt-6 block text-sm font-medium text-slate-700">Password<input required type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500" /></label>{loginError && <p className="mt-2 text-sm text-rose-600">{loginError}</p>}<button className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Sign in</button></form></main>;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      {sidebarOpen && <button className="fixed inset-0 z-30 bg-slate-900/20 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-white transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-20 items-center gap-3 border-b px-6">
          <Image src="/logo.png" alt="Jain Sales Corporation logo" width={40} height={38} className="h-10 w-10 object-contain" />
          <div><p className="text-sm font-bold tracking-tight">Jain Sales</p><p className="text-[11px] text-slate-400">CORPORATION</p></div>
          <button className="ml-auto text-slate-400 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {navGroups.map((group) => <div key={group.label} className="mb-6">
            <p className="mb-2 px-3 text-[10px] font-semibold tracking-widest text-slate-400">{group.label}</p>
            {group.items.map(({ label, icon: Icon }) => <button key={label} onClick={() => { setActive(label); setPanel(null); setSidebarOpen(false); }} className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${active === label ? "bg-blue-50 font-medium text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}><Icon size={17} />{label}</button>)}
          </div>)}
          <div className="mb-2 px-3 text-[10px] font-semibold tracking-widest text-slate-400">ADMINISTRATION</div>
          <button onClick={() => { setActive("Audit logs"); setPanel(null); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${active === "Audit logs" ? "bg-blue-50 font-medium text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}><ShieldCheck size={17} />Audit logs</button>
          <button onClick={() => { setActive("Settings"); setPanel(null); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${active === "Settings" ? "bg-blue-50 font-medium text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}><Settings size={17} />Settings</button>
        </nav>
        <div className="m-3 rounded-xl bg-slate-50 p-3"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">DJ</div><div className="min-w-0"><p className="truncate text-sm font-medium">Divyansh Jain</p><p className="truncate text-xs text-slate-400">Super Admin</p></div><ChevronDown size={16} className="ml-auto text-slate-400" /></div></div>
      </aside>

      <main className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b bg-white/95 px-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3"><button className="text-slate-500 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={22} /></button><div><p className="text-xs text-slate-400">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p><h1 className="text-lg font-semibold">{active}</h1></div></div>
          <div className="flex items-center gap-3"><div className="flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2"><Search size={16} className="text-slate-400" /><input value={query} onChange={(event) => { setQuery(event.target.value); setActive("All employees"); }} placeholder="Search employees..." aria-label="Search employees" className="w-44 bg-transparent text-sm outline-none placeholder:text-slate-400" /></div><button onClick={() => openPanel("Notifications")} className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-50" aria-label="Notifications"><Bell size={19} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-blue-600" /></button><div className="hidden h-8 w-px bg-slate-200 sm:block" /><button onClick={() => openPanel("Account")} className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700" aria-label="Open account menu">DJ</button></div>
        </header>
        <div className={`mx-auto max-w-[1500px] p-4 sm:p-8 ${active === "Dashboard" ? "" : "hidden"}`}>
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-1 text-sm text-slate-500">Good morning, Divyansh</p><h2 className="text-2xl font-semibold tracking-tight">Payroll overview</h2><p className="mt-1 text-sm text-slate-500">Here&apos;s what&apos;s happening with your workforce.</p></div><div className="flex gap-2"><select value={period} onChange={(event) => setPeriod(event.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm text-slate-600 outline-none"><option>This month</option><option>Previous month</option><option>Financial year</option></select><button onClick={() => setShowPayroll(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"><Plus size={16} /> Generate payroll</button></div></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard title="Active employees" value={allEmployees.length.toString()} change="—" icon={Users} tone="bg-blue-50 text-blue-600" onMore={() => openPanel("Active employees")} /><StatCard title="Monthly salary expense" value={`₹${totalSalary.toLocaleString("en-IN")}`} change="—" icon={ReceiptIndianRupee} tone="bg-violet-50 text-violet-600" onMore={() => openPanel("Monthly salary expense")} /><StatCard title="Salary paid" value={`₹${totalPaid.toLocaleString("en-IN")}`} change="—" icon={CreditCard} tone="bg-emerald-50 text-emerald-600" onMore={() => openPanel("Salary paid")} /><StatCard title="Pending salary" value={`₹${Math.max(totalAdjustedSalary - totalPaid, 0).toLocaleString("en-IN")}`} change="—" icon={WalletCards} tone="bg-amber-50 text-amber-600" onMore={() => openPanel("Pending salary")} /></div>
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.65fr_1fr]">
            <section className="rounded-xl border bg-white p-5 shadow-sm shadow-slate-100"><div className="mb-5 flex items-center justify-between"><div><h3 className="font-semibold">Salary overview</h3><p className="mt-1 text-xs text-slate-400">Paid vs pending</p></div><button onClick={() => openPanel("Salary report")} className="flex items-center gap-1 text-xs font-medium text-blue-600">View report <ArrowUpRight size={14} /></button></div>{totalSalary || totalPaid ? <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={salaryOverviewData}><CartesianGrid vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(value) => `₹${value.toLocaleString("en-IN")}`} /><Tooltip formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Amount"]} contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} /><Bar dataKey="value" fill="#2563eb" radius={[5, 5, 0, 0]} barSize={48} /></BarChart></ResponsiveContainer></div> : <div className="flex h-64 items-center justify-center text-sm text-slate-400">Add employees and payments to view salary history.</div>}</section>
            <section className="rounded-xl border bg-white p-5 shadow-sm shadow-slate-100"><div className="mb-4 flex items-center justify-between"><div><h3 className="font-semibold">Payment methods</h3><p className="mt-1 text-xs text-slate-400">Recorded payments</p></div><button onClick={() => openPanel("Payment methods")} aria-label="More options" className="text-slate-400"><Ellipsis size={18} /></button></div>{paymentMethodData.length ? <div className="h-52"><ResponsiveContainer width="100%" height="100%"><BarChart data={paymentMethodData} layout="vertical" margin={{ left: 10, right: 20 }}><CartesianGrid horizontal={false} stroke="#f1f5f9" /><XAxis type="number" hide /><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} /><Tooltip cursor={{ fill: "#f8fafc" }} formatter={(value: number) => [`${value}%`, "Share"]} /><Bar dataKey="value" fill="#2563eb" radius={[0, 5, 5, 0]} barSize={18} /></BarChart></ResponsiveContainer></div> : <div className="flex h-52 items-center justify-center text-sm text-slate-400">No payments recorded yet.</div>}<div className="border-t pt-4 text-center text-xs text-slate-500">Total disbursed <strong className="ml-1 text-slate-900">₹{totalPaid.toLocaleString("en-IN")}</strong></div></section>
          </div>
          <section className="mt-6 rounded-xl border bg-white shadow-sm shadow-slate-100"><div className="flex flex-col justify-between gap-3 border-b p-5 sm:flex-row sm:items-center"><div><h3 className="font-semibold">Recent salary activity</h3><p className="mt-1 text-xs text-slate-400">Latest employee payments and payroll records</p></div><button onClick={exportEmployees} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"><Download size={14} /> Export</button></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs font-medium text-slate-500"><tr><th className="px-5 py-3">Employee</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Net salary</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Action</th></tr></thead><tbody className="divide-y">{filteredEmployees.map((employee) => <tr key={employee.name} className="hover:bg-slate-50/70"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${employee.color}`}>{employee.initials}</div><span className="font-medium">{employee.name}</span></div></td><td className="px-5 py-4 text-slate-500">{employee.role}</td><td className="px-5 py-4 font-medium">{employee.amount}</td><td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${employee.status === "Paid" ? "bg-emerald-50 text-emerald-700" : employee.status === "Pending" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{employee.status === "Paid" && <CheckCircle2 size={12} />}{employee.status}</span></td><td className="px-5 py-4"><button type="button" onClick={() => setSelectedEmployee(employee)} className="rounded-lg border px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50" aria-label={`View ${employee.name}`}>View</button></td></tr>)}</tbody></table>{filteredEmployees.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No employees match your search.</p>}</div><div className="flex items-center justify-between border-t px-5 py-3 text-xs text-slate-500"><span>Showing {filteredEmployees.length} of {allEmployees.length} employees</span><button onClick={() => { setActive("All employees"); setQuery(""); }} className="font-medium text-blue-600">View all employees →</button></div></section>
          <div className="mt-6 grid gap-4 sm:grid-cols-3"><div className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">Outstanding advances</p><p className="mt-2 text-xl font-semibold">₹{totalAmount(advanceRecords).toLocaleString("en-IN")}</p><p className="mt-1 text-xs text-amber-600">{advanceRecords.length} active advances</p></div><div className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">Staff expenses</p><p className="mt-2 text-xl font-semibold">₹{totalAmount(expenseRecords).toLocaleString("en-IN")}</p><p className="mt-1 text-xs text-slate-400">{expenseRecords.length} recorded expenses</p></div><div className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">Payroll status</p><p className="mt-2 flex items-center gap-2 text-xl font-semibold"><span className="h-2 w-2 rounded-full bg-slate-400" />No payroll data</p><p className="mt-1 text-xs text-slate-400">Add employees and payments to begin.</p></div></div>
        </div>
        {active === "All employees" && <section className="mx-auto max-w-[1500px] p-4 sm:p-8"><div className="rounded-xl border bg-white shadow-sm shadow-slate-100"><div className="flex flex-col justify-between gap-4 border-b p-6 sm:flex-row sm:items-center"><div><h2 className="text-2xl font-semibold">All employees</h2><p className="mt-1 text-sm text-slate-500">Saved employee records from MongoDB.</p></div><button onClick={() => { setEditingEmployee(null); setShowEmployeeForm(true); }} className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Plus size={16} /> Add employee</button></div><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-slate-50 text-xs font-medium text-slate-500"><tr><th className="px-6 py-3">Employee</th><th className="px-6 py-3">Phone</th><th className="px-6 py-3">Role</th><th className="px-6 py-3">Joining date</th><th className="px-6 py-3">Leave allowance</th><th className="px-6 py-3">Monthly salary</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Actions</th></tr></thead><tbody className="divide-y">{filteredEmployees.map((employee) => <tr key={employee._id || employee.name}><td className="px-6 py-4 font-medium">{employee.name}</td><td className="px-6 py-4 text-slate-500">{employee.phone || "—"}</td><td className="px-6 py-4 text-slate-500">{employee.role}</td><td className="px-6 py-4 text-slate-500">{employee.joiningDate || "—"}</td><td className="px-6 py-4 text-slate-500">{employee.totalLeaveAllowance || 0} days</td><td className="px-6 py-4">{employee.amount}</td><td className="px-6 py-4">{employee.status}</td><td className="px-6 py-4"><div className="flex gap-2"><button type="button" onClick={() => editEmployee(employee)} className="rounded-lg border px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50">Edit</button><button type="button" onClick={() => deleteEmployee(employee)} className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50">Remove</button></div></td></tr>)}</tbody></table></div><div className="border-t p-4"><button onClick={() => setActive("Dashboard")} className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to dashboard</button></div></div></section>}
        {active === "Attendance & leave" && <section className="mx-auto max-w-[1500px] p-4 sm:p-8"><div className="rounded-xl border bg-white shadow-sm shadow-slate-100"><div className="flex flex-col justify-between gap-4 border-b p-6 sm:flex-row sm:items-center"><div><h2 className="text-2xl font-semibold">Attendance & leave</h2><p className="mt-1 text-sm text-slate-500">Record and review daily attendance saved in MongoDB.</p></div><button onClick={() => setShowAttendanceForm(true)} className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Plus size={16} /> Record attendance</button></div><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-slate-50 text-xs font-medium text-slate-500"><tr><th className="px-6 py-3">Employee</th><th className="px-6 py-3">Date</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Note</th></tr></thead><tbody className="divide-y">{attendanceRecords.map((record) => <tr key={record._id}><td className="px-6 py-4 font-medium">{record.employeeName}</td><td className="px-6 py-4 text-slate-500">{record.date}</td><td className="px-6 py-4">{record.status}</td><td className="px-6 py-4 text-slate-500">{record.note || "—"}</td></tr>)}</tbody></table>{attendanceRecords.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No attendance recorded in this session yet.</p>}</div><div className="border-t p-4"><button onClick={() => setActive("Dashboard")} className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to dashboard</button></div></div></section>}
        {active === "Salary management" && <section className="mx-auto max-w-[1500px] p-4 sm:p-8"><div className="rounded-xl border bg-white p-6 shadow-sm shadow-slate-100 sm:p-8"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><ReceiptIndianRupee size={22} /></div><h2 className="mt-5 text-2xl font-semibold">Salary management</h2><p className="mt-2 max-w-xl text-sm text-slate-500">Prepare monthly salaries and review payroll records.</p><div className="mt-8 flex flex-wrap gap-3"><button onClick={() => setShowPayroll(true)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Create salary run</button><button onClick={() => setActive("Dashboard")} className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to dashboard</button></div></div></section>}
        {active === "Advances" && <section className="mx-auto max-w-[1500px] p-4 sm:p-8"><div className="rounded-xl border bg-white shadow-sm shadow-slate-100"><div className="flex flex-col justify-between gap-4 border-b p-6 sm:flex-row sm:items-center"><div><h2 className="text-2xl font-semibold">Advances</h2><p className="mt-1 text-sm text-slate-500">Manage employee advances and repayment schedules.</p></div><button onClick={() => setShowAdvanceForm(true)} className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Plus size={16} /> Add advance</button></div><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-xs font-medium text-slate-500"><tr><th className="px-6 py-3">Employee</th><th className="px-6 py-3">Amount</th><th className="px-6 py-3">Date</th><th className="px-6 py-3">Purpose</th><th className="px-6 py-3">Payment method</th><th className="px-6 py-3">Status</th></tr></thead><tbody className="divide-y">{advanceRecords.map((record) => <tr key={record._id}><td className="px-6 py-4 font-medium">{record.employeeName}</td><td className="px-6 py-4">₹{record.amount.toLocaleString("en-IN")}</td><td className="px-6 py-4 text-slate-500">{record.date}</td><td className="px-6 py-4 text-slate-500">{record.purpose}</td><td className="px-6 py-4 text-slate-500">{record.method || "Cash"}</td><td className="px-6 py-4">{record.status}</td></tr>)}</tbody></table>{advanceRecords.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No advances recorded yet.</p>}</div><div className="border-t p-4"><button onClick={() => setActive("Dashboard")} className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to dashboard</button></div></div></section>}
        {active === "Payments" && <section className="mx-auto max-w-[1500px] p-4 sm:p-8"><div className="rounded-xl border bg-white shadow-sm shadow-slate-100"><div className="flex flex-col justify-between gap-4 border-b p-6 sm:flex-row sm:items-center"><div><h2 className="text-2xl font-semibold">Payments</h2><p className="mt-1 text-sm text-slate-500">Review salary payments and disbursement history.</p></div><button onClick={() => setShowPaymentForm(true)} className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Plus size={16} /> Record payment</button></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs font-medium text-slate-500"><tr><th className="px-6 py-3">Employee</th><th className="px-6 py-3">Amount</th><th className="px-6 py-3">Date</th><th className="px-6 py-3">Method</th><th className="px-6 py-3">Status</th></tr></thead><tbody className="divide-y">{paymentRecords.map((record) => <tr key={record._id}><td className="px-6 py-4 font-medium">{record.employeeName}</td><td className="px-6 py-4">₹{record.amount.toLocaleString("en-IN")}</td><td className="px-6 py-4 text-slate-500">{record.date}</td><td className="px-6 py-4 text-slate-500">{record.method}</td><td className="px-6 py-4">{record.status}</td></tr>)}</tbody></table>{paymentRecords.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No payments recorded yet.</p>}</div><div className="border-t p-4"><button onClick={() => setActive("Dashboard")} className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to dashboard</button></div></div></section>}
        {active === "Employee ledger" && <section className="mx-auto max-w-[1500px] p-4 sm:p-8"><div className="rounded-xl border bg-white shadow-sm shadow-slate-100"><div className="flex flex-col justify-between gap-4 border-b p-6 sm:flex-row sm:items-center"><div><h2 className="text-2xl font-semibold">Employee ledger</h2><p className="mt-1 text-sm text-slate-500">Review an employee-by-employee financial ledger.</p></div><select value={selectedLedgerEmployee} onChange={(event) => setSelectedLedgerEmployee(event.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm outline-none"><option value="">Select employee</option>{ledgerRecords.map((record) => <option key={record.employeeName} value={record.employeeName}>{record.employeeName}</option>)}</select></div>{(() => { const record = ledgerRecords.find((item) => item.employeeName === selectedLedgerEmployee); return record ? <><div className="grid gap-4 border-b p-6 sm:grid-cols-2 lg:grid-cols-6"><div><p className="text-xs text-slate-500">Net salary</p><p className="mt-1 text-xl font-semibold">₹{record.netSalary.toLocaleString("en-IN")}</p></div><div><p className="text-xs text-slate-500">Leave allowance</p><p className="mt-1 text-xl font-semibold">{record.leaveAllowance} days</p></div><div><p className="text-xs text-slate-500">Unpaid leave</p><p className="mt-1 text-xl font-semibold">{record.unpaidLeaveDays} days</p></div><div><p className="text-xs text-slate-500">Leave deduction</p><p className="mt-1 text-xl font-semibold">₹{record.leaveDeduction.toLocaleString("en-IN")}</p></div><div><p className="text-xs text-slate-500">Paid incl. advances</p><p className="mt-1 text-xl font-semibold">₹{(record.totalPayments + record.totalAdvances).toLocaleString("en-IN")}</p></div><div><p className="text-xs text-slate-500">Salary left</p><p className="mt-1 text-xl font-semibold">₹{record.remainingSalary.toLocaleString("en-IN")}</p></div></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs font-medium text-slate-500"><tr><th className="px-6 py-3">Type</th><th className="px-6 py-3">Amount</th><th className="px-6 py-3">Date</th><th className="px-6 py-3">Description</th><th className="px-6 py-3">Status</th></tr></thead><tbody className="divide-y">{record.transactions.map((transaction, index) => <tr key={`${transaction.date}-${transaction.type}-${index}`}><td className="px-6 py-4 font-medium">{transaction.type}</td><td className="px-6 py-4">₹{transaction.amount.toLocaleString("en-IN")}</td><td className="px-6 py-4 text-slate-500">{transaction.date}</td><td className="px-6 py-4 text-slate-500">{transaction.description}</td><td className="px-6 py-4">{transaction.status}</td></tr>)}</tbody></table>{record.transactions.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No transactions recorded for this employee.</p>}</div></> : <p className="p-8 text-center text-sm text-slate-500">Select an employee to open their ledger.</p>; })()}<div className="border-t p-4"><button onClick={() => setActive("Dashboard")} className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to dashboard</button></div></div></section>}
        {active === "Staff expenses" && <section className="mx-auto max-w-[1500px] p-4 sm:p-8"><div className="rounded-xl border bg-white shadow-sm shadow-slate-100"><div className="flex flex-col justify-between gap-4 border-b p-6 sm:flex-row sm:items-center"><div><h2 className="text-2xl font-semibold">Staff expenses</h2><p className="mt-1 text-sm text-slate-500">Track staff expenses against your monthly budget.</p></div><button onClick={() => { setEditingExpense(null); setShowExpenseForm(true); }} className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Plus size={16} /> Add expense</button></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs font-medium text-slate-500"><tr><th className="px-6 py-3">Category</th><th className="px-6 py-3">Amount</th><th className="px-6 py-3">Date</th><th className="px-6 py-3">Description</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Actions</th></tr></thead><tbody className="divide-y">{expenseRecords.map((record) => <tr key={record._id}><td className="px-6 py-4 font-medium">{record.category}</td><td className="px-6 py-4">₹{record.amount.toLocaleString("en-IN")}</td><td className="px-6 py-4 text-slate-500">{record.date}</td><td className="px-6 py-4 text-slate-500">{record.description}</td><td className="px-6 py-4">{record.status}</td><td className="px-6 py-4"><div className="flex gap-2"><button type="button" onClick={() => editExpense(record)} className="rounded-lg border px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50">Edit</button><button type="button" onClick={() => deleteExpense(record)} className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50">Remove</button></div></td></tr>)}</tbody></table>{expenseRecords.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No staff expenses recorded yet.</p>}</div><div className="border-t p-4"><button onClick={() => setActive("Dashboard")} className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to dashboard</button></div></div></section>}
        {active === "Reports & analytics" && <section className="mx-auto max-w-[1500px] p-4 sm:p-8"><div className="rounded-xl border bg-white shadow-sm shadow-slate-100"><div className="flex flex-col justify-between gap-4 border-b p-6 sm:flex-row sm:items-center"><div><h2 className="text-2xl font-semibold">Reports & analytics</h2><p className="mt-1 text-sm text-slate-500">Review payroll trends and download business reports.</p></div><button onClick={generateReport} className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Download size={16} /> Generate report</button></div><div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-lg bg-slate-50 p-4"><p className="text-xs text-slate-500">Employees</p><p className="mt-1 text-xl font-semibold">{allEmployees.length}</p></div><div className="rounded-lg bg-slate-50 p-4"><p className="text-xs text-slate-500">Payments</p><p className="mt-1 text-xl font-semibold">₹{totalAmount(paymentRecords).toLocaleString("en-IN")}</p></div><div className="rounded-lg bg-slate-50 p-4"><p className="text-xs text-slate-500">Advances</p><p className="mt-1 text-xl font-semibold">₹{totalAmount(advanceRecords).toLocaleString("en-IN")}</p></div><div className="rounded-lg bg-slate-50 p-4"><p className="text-xs text-slate-500">Expenses</p><p className="mt-1 text-xl font-semibold">₹{totalAmount(expenseRecords).toLocaleString("en-IN")}</p></div></div><div className="border-t p-4"><button onClick={() => setActive("Dashboard")} className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to dashboard</button></div></div></section>}
        {active === "Audit logs" && <section className="mx-auto max-w-[1500px] p-4 sm:p-8"><div className="rounded-xl border bg-white shadow-sm shadow-slate-100"><div className="border-b p-6"><h2 className="text-2xl font-semibold">Audit logs</h2><p className="mt-1 text-sm text-slate-500">Review recorded activity across the payroll workspace.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs font-medium text-slate-500"><tr><th className="px-6 py-3">Action</th><th className="px-6 py-3">Entity</th><th className="px-6 py-3">Details</th><th className="px-6 py-3">Actor</th><th className="px-6 py-3">Time</th></tr></thead><tbody className="divide-y">{auditLogs.map((log) => <tr key={log._id}><td className="px-6 py-4 font-medium">{log.action}</td><td className="px-6 py-4">{log.entity}</td><td className="px-6 py-4 text-slate-500">{log.details}</td><td className="px-6 py-4 text-slate-500">{log.actor}</td><td className="px-6 py-4 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td></tr>)}</tbody></table>{auditLogs.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No audit activity recorded yet.</p>}</div><div className="border-t p-4"><button onClick={() => setActive("Dashboard")} className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to dashboard</button></div></div></section>}
        {active === "Settings" && <section className="mx-auto max-w-[1500px] p-4 sm:p-8"><form onSubmit={saveSettings} className="max-w-2xl rounded-xl border bg-white shadow-sm shadow-slate-100"><div className="border-b p-6"><h2 className="text-2xl font-semibold">Settings</h2><p className="mt-1 text-sm text-slate-500">Manage company and payroll preferences.</p></div><div className="space-y-5 p-6"><label className="block text-sm font-medium text-slate-700">Company name<input required value={settingsForm.companyName} onChange={(event) => setSettingsForm({ ...settingsForm, companyName: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500" /></label><label className="block text-sm font-medium text-slate-700">Admin email<input required type="email" value={settingsForm.adminEmail} onChange={(event) => setSettingsForm({ ...settingsForm, adminEmail: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500" /></label><div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-medium text-slate-700">Currency<select value={settingsForm.currency} onChange={(event) => setSettingsForm({ ...settingsForm, currency: event.target.value })} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 outline-none focus:border-blue-500"><option>INR</option><option>USD</option><option>EUR</option></select></label><label className="block text-sm font-medium text-slate-700">Payroll day<input required min="1" max="31" type="number" value={settingsForm.payrollDay} onChange={(event) => setSettingsForm({ ...settingsForm, payrollDay: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500" /></label></div></div><div className="flex gap-3 border-t p-6"><button disabled={savingSettings} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{savingSettings ? "Saving..." : "Save settings"}</button><button type="button" onClick={() => setActive("Dashboard")} className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to dashboard</button></div></form></section>}
        {sectionDetails[active] && <section className="mx-auto max-w-[1500px] p-4 sm:p-8"><div className="rounded-xl border bg-white p-6 shadow-sm shadow-slate-100 sm:p-8"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><LayoutDashboard size={22} /></div><h2 className="mt-5 text-2xl font-semibold">{active}</h2><p className="mt-2 max-w-xl text-sm text-slate-500">{sectionDetails[active].description}</p><div className="mt-8 flex flex-wrap gap-3"><button onClick={() => showToast(`${sectionDetails[active].action} opened`)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">{sectionDetails[active].action}</button><button onClick={() => setActive("Dashboard")} className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to dashboard</button></div></div></section>}
      </main>
      {showExpenseForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4" onClick={() => { setShowExpenseForm(false); setEditingExpense(null); }}><form onSubmit={saveExpense} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><h3 className="text-lg font-semibold">{editingExpense ? "Edit expense" : "Add expense"}</h3><p className="mt-1 text-sm text-slate-500">This expense will be saved in MongoDB.</p></div><button type="button" onClick={() => { setShowExpenseForm(false); setEditingExpense(null); }} aria-label="Close expense form" className="text-slate-400"><X size={18} /></button></div><div className="mt-6 space-y-4"><label className="block text-sm font-medium text-slate-700">Category<select required value={expenseForm.category} onChange={(event) => setExpenseForm({ ...expenseForm, category: event.target.value })} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 outline-none focus:border-blue-500"><option>Travel</option><option>Meals</option><option>Office supplies</option><option>Training</option><option>Other</option></select></label><label className="block text-sm font-medium text-slate-700">Amount<input required min="1" type="number" value={expenseForm.amount} onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500" /></label><label className="block text-sm font-medium text-slate-700">Date<input required type="date" value={expenseForm.date} onChange={(event) => setExpenseForm({ ...expenseForm, date: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500" /></label><label className="block text-sm font-medium text-slate-700">Description<input required value={expenseForm.description} onChange={(event) => setExpenseForm({ ...expenseForm, description: event.target.value })} placeholder="Describe the expense" className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500" /></label><label className="block text-sm font-medium text-slate-700">Status<select required value={expenseForm.status} onChange={(event) => setExpenseForm({ ...expenseForm, status: event.target.value })} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 outline-none focus:border-blue-500"><option>Pending</option><option>Approved</option></select></label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => { setShowExpenseForm(false); setEditingExpense(null); }} className="rounded-lg border px-4 py-2 text-sm font-medium">Cancel</button><button disabled={savingExpense} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{savingExpense ? "Saving..." : editingExpense ? "Update expense" : "Save expense"}</button></div></form></div>}
      {showPaymentForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4" onClick={() => setShowPaymentForm(false)}><form onSubmit={savePayment} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><h3 className="text-lg font-semibold">Record payment</h3><p className="mt-1 text-sm text-slate-500">This payment will be saved in MongoDB.</p></div><button type="button" onClick={() => setShowPaymentForm(false)} aria-label="Close payment form" className="text-slate-400"><X size={18} /></button></div><div className="mt-6 space-y-4"><label className="block text-sm font-medium text-slate-700">Employee<select required value={paymentForm.employeeName} onChange={(event) => setPaymentForm({ ...paymentForm, employeeName: event.target.value })} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 outline-none focus:border-blue-500">{allEmployees.map((employee) => <option key={employee.name} value={employee.name}>{employee.name}</option>)}</select></label><label className="block text-sm font-medium text-slate-700">Amount<input required min="1" type="number" value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500" /></label><label className="block text-sm font-medium text-slate-700">Date<input required type="date" value={paymentForm.date} onChange={(event) => setPaymentForm({ ...paymentForm, date: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500" /></label><label className="block text-sm font-medium text-slate-700">Method<select required value={paymentForm.method} onChange={(event) => setPaymentForm({ ...paymentForm, method: event.target.value })} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 outline-none focus:border-blue-500"><option>Bank transfer</option><option>UPI</option><option>Cash</option></select></label><label className="block text-sm font-medium text-slate-700">Reference<input value={paymentForm.reference} onChange={(event) => setPaymentForm({ ...paymentForm, reference: event.target.value })} placeholder="Optional transaction reference" className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500" /></label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setShowPaymentForm(false)} className="rounded-lg border px-4 py-2 text-sm font-medium">Cancel</button><button disabled={savingPayment} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{savingPayment ? "Saving..." : "Save payment"}</button></div></form></div>}
      {showAdvanceForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4" onClick={() => setShowAdvanceForm(false)}><form onSubmit={saveAdvance} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><h3 className="text-lg font-semibold">Add advance</h3><p className="mt-1 text-sm text-slate-500">This advance will be saved in MongoDB.</p></div><button type="button" onClick={() => setShowAdvanceForm(false)} aria-label="Close advance form" className="text-slate-400"><X size={18} /></button></div><div className="mt-6 space-y-4"><label className="block text-sm font-medium text-slate-700">Employee<select required value={advanceForm.employeeName} onChange={(event) => setAdvanceForm({ ...advanceForm, employeeName: event.target.value })} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 outline-none focus:border-blue-500">{allEmployees.map((employee) => <option key={employee.name} value={employee.name}>{employee.name}</option>)}</select></label><label className="block text-sm font-medium text-slate-700">Amount<input required min="1" type="number" value={advanceForm.amount} onChange={(event) => setAdvanceForm({ ...advanceForm, amount: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500" /></label><label className="block text-sm font-medium text-slate-700">Date<input required type="date" value={advanceForm.date} onChange={(event) => setAdvanceForm({ ...advanceForm, date: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500" /></label><label className="block text-sm font-medium text-slate-700">Purpose<input required value={advanceForm.purpose} onChange={(event) => setAdvanceForm({ ...advanceForm, purpose: event.target.value })} placeholder="Travel, emergency, equipment..." className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500" /></label><label className="block text-sm font-medium text-slate-700">Payment method<select required value={advanceForm.method} onChange={(event) => setAdvanceForm({ ...advanceForm, method: event.target.value })} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 outline-none focus:border-blue-500"><option>Cash</option><option>Bank transfer</option><option>UPI</option></select></label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setShowAdvanceForm(false)} className="rounded-lg border px-4 py-2 text-sm font-medium">Cancel</button><button disabled={savingAdvance} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{savingAdvance ? "Saving..." : "Save advance"}</button></div></form></div>}
      {showAttendanceForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4" onClick={() => setShowAttendanceForm(false)}><form onSubmit={saveAttendance} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><h3 className="text-lg font-semibold">Record attendance</h3><p className="mt-1 text-sm text-slate-500">This record will be saved in MongoDB.</p></div><button type="button" onClick={() => setShowAttendanceForm(false)} aria-label="Close attendance form" className="text-slate-400"><X size={18} /></button></div><div className="mt-6 space-y-4"><label className="block text-sm font-medium text-slate-700">Employee<select required value={attendanceForm.employeeName} onChange={(event) => setAttendanceForm({ ...attendanceForm, employeeName: event.target.value })} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 outline-none focus:border-blue-500">{allEmployees.map((employee) => <option key={employee.name} value={employee.name}>{employee.name}</option>)}</select></label><label className="block text-sm font-medium text-slate-700">Date<input required type="date" value={attendanceForm.date} onChange={(event) => setAttendanceForm({ ...attendanceForm, date: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500" /></label><label className="block text-sm font-medium text-slate-700">Status<select required value={attendanceForm.status} onChange={(event) => setAttendanceForm({ ...attendanceForm, status: event.target.value })} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 outline-none focus:border-blue-500"><option>Present</option><option>Absent</option><option>Leave</option></select></label><label className="block text-sm font-medium text-slate-700">Note<input value={attendanceForm.note} onChange={(event) => setAttendanceForm({ ...attendanceForm, note: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500" /></label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setShowAttendanceForm(false)} className="rounded-lg border px-4 py-2 text-sm font-medium">Cancel</button><button disabled={savingAttendance} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{savingAttendance ? "Saving..." : "Save attendance"}</button></div></form></div>}
      {showEmployeeForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4" onClick={() => { setShowEmployeeForm(false); setEditingEmployee(null); }}><form onSubmit={saveEmployee} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><h3 className="text-lg font-semibold">{editingEmployee ? "Edit employee" : "Add employee"}</h3><p className="mt-1 text-sm text-slate-500">This record will be saved in MongoDB.</p></div><button type="button" onClick={() => { setShowEmployeeForm(false); setEditingEmployee(null); }} aria-label="Close employee form" className="text-slate-400"><X size={18} /></button></div><div className="mt-6 space-y-4"><label className="block text-sm font-medium text-slate-700">Name<input required value={employeeForm.name} onChange={(event) => setEmployeeForm({ ...employeeForm, name: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500" /></label><label className="block text-sm font-medium text-slate-700">Phone number<input required pattern="[0-9+()\\s-]{7,20}" value={employeeForm.phone} onChange={(event) => setEmployeeForm({ ...employeeForm, phone: event.target.value })} placeholder="+91 9876543210" className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500" /></label><label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={employeeForm.whatsappOptIn} onChange={(event) => setEmployeeForm({ ...employeeForm, whatsappOptIn: event.target.checked })} /> Employee consented to WhatsApp notifications</label><label className="block text-sm font-medium text-slate-700">Role<input required value={employeeForm.role} onChange={(event) => setEmployeeForm({ ...employeeForm, role: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500" /></label><label className="block text-sm font-medium text-slate-700">Joining date<input required type="date" value={employeeForm.joiningDate} onChange={(event) => setEmployeeForm({ ...employeeForm, joiningDate: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500" /></label><label className="block text-sm font-medium text-slate-700">Total leave allowance (days)<input required min="0" step="1" type="number" value={employeeForm.totalLeaveAllowance} onChange={(event) => setEmployeeForm({ ...employeeForm, totalLeaveAllowance: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500" /></label><label className="block text-sm font-medium text-slate-700">Monthly salary<input required min="0" type="number" value={employeeForm.salary} onChange={(event) => setEmployeeForm({ ...employeeForm, salary: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500" /></label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setShowEmployeeForm(false)} className="rounded-lg border px-4 py-2 text-sm font-medium">Cancel</button><button disabled={savingEmployee} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{savingEmployee ? "Saving..." : "Save employee"}</button></div></form></div>}
      {showPayroll && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4"><div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between"><div><h3 className="text-lg font-semibold">Generate monthly payroll</h3><p className="mt-1 text-sm text-slate-500">Create and save salary payments for this month.</p></div><button onClick={() => setShowPayroll(false)} aria-label="Close dialog" className="text-slate-400"><X size={18} /></button></div><div className="mt-6 rounded-lg border bg-slate-50 p-4"><div className="flex justify-between text-sm"><span className="text-slate-500">Payroll period</span><strong>{payrollMonth}</strong></div><div className="mt-3 flex justify-between text-sm"><span className="text-slate-500">Active employees</span><strong>{allEmployees.length} employees</strong></div><div className="mt-3 flex justify-between text-sm"><span className="text-slate-500">Estimated gross</span><strong>₹{totalSalary.toLocaleString("en-IN")}</strong></div><p className="mt-3 text-xs text-slate-500">Leave deductions and advances already paid will be deducted before payments are created. A second run for this month is blocked.</p></div><label className="mt-5 block text-sm font-medium text-slate-700">Payment method<select value={payrollPaymentMethod} onChange={(event) => setPayrollPaymentMethod(event.target.value)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 outline-none focus:border-blue-500"><option>Bank transfer</option><option>UPI</option><option>Cash</option></select></label><div className="mt-6 flex justify-end gap-3"><button onClick={() => setShowPayroll(false)} disabled={savingPayroll} className="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50">Cancel</button><button onClick={generatePayroll} disabled={savingPayroll || allEmployees.length === 0} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{savingPayroll ? "Creating..." : "Generate records"}</button></div></div></div>}
      {panel && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4" onClick={() => setPanel(null)}><div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><h3 className="text-lg font-semibold">{panel}</h3><p className="mt-1 text-sm text-slate-500">This workspace is ready for {panel.toLowerCase()}.</p></div><button onClick={() => setPanel(null)} aria-label="Close panel" className="text-slate-400"><X size={18} /></button></div><div className="mt-6 rounded-lg border bg-slate-50 p-4 text-sm text-slate-600">{panel === "Notifications" ? "No new notifications." : panel === "Account" ? "Signed in as Divyansh Jain, Super Admin." : "Use the navigation to continue managing this area."}</div><div className="mt-6 flex justify-end gap-3"><button onClick={() => setPanel(null)} className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700">Done</button>{panel === "Account" && <button onClick={logout} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700">Log out</button>}</div></div></div>}
      {selectedEmployee && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4" onClick={() => setSelectedEmployee(null)}><div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><h3 className="text-lg font-semibold">{selectedEmployee.name}</h3><p className="mt-1 text-sm text-slate-500">{selectedEmployee.role}</p></div><button onClick={() => setSelectedEmployee(null)} aria-label="Close employee details" className="text-slate-400"><X size={18} /></button></div><div className="mt-6 grid grid-cols-2 gap-3 rounded-lg border bg-slate-50 p-4 text-sm"><span className="text-slate-500">Phone</span><strong className="text-right">{selectedEmployee.phone || "—"}</strong><span className="text-slate-500">Joining date</span><strong className="text-right">{selectedEmployee.joiningDate || "—"}</strong><span className="text-slate-500">Leave allowance</span><strong className="text-right">{selectedEmployee.totalLeaveAllowance || 0} days</strong><span className="text-slate-500">Unpaid leave</span><strong className="text-right">{selectedEmployee.unpaidLeaveDays || 0} days</strong><span className="text-slate-500">Leave deduction</span><strong className="text-right">₹{(selectedEmployee.leaveDeduction || 0).toLocaleString("en-IN")}</strong><span className="text-slate-500">Net salary</span><strong className="text-right">{selectedEmployee.amount}</strong><span className="text-slate-500">Status</span><strong className="text-right">{selectedEmployee.status}</strong></div><div className="mt-6 flex justify-end"><button onClick={() => setSelectedEmployee(null)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">Close</button></div></div></div>}
      {toast && <div role="status" className="fixed bottom-5 right-5 z-[60] rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
