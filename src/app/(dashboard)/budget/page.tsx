"use client";

import { useEffect, useState } from "react";
import { Plus, Wallet, TrendingDown, TrendingUp, PiggyBank, Utensils, Bus, Book, Gamepad, Heart, Package, Trash2, Pencil, Sparkles, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import type { Expense } from "@/types";
import type { LucideIcon } from "lucide-react";

const categoryConfig: Record<string, { icon: LucideIcon; dot: string; label: string }> = {
  food: { icon: Utensils, dot: "bg-blue-500", label: "Food" },
  transport: { icon: Bus, dot: "bg-emerald-500", label: "Transport" },
  school: { icon: Book, dot: "bg-amber-500", label: "School" },
  entertainment: { icon: Gamepad, dot: "bg-purple-500", label: "Entertainment" },
  health: { icon: Heart, dot: "bg-rose-500", label: "Health" },
  other: { icon: Package, dot: "bg-muted-foreground", label: "Other" },
};

export default function BudgetPage() {
  const [showForm, setShowForm] = useState(false);
  const [showAllowanceForm, setShowAllowanceForm] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [allowance, setAllowance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<{ title: string; insight: string; impact: string }[]>([]);
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingAllowance, setSavingAllowance] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ amount: "", category: "food", date: "", description: "" });
  const [allowanceInput, setAllowanceInput] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  // Reset expense form when opening/closing or switching edit target
  useEffect(() => {
    if (showForm) {
      if (editingExpense) {
        setExpenseForm({
          amount: String(editingExpense.amount || ""),
          category: editingExpense.category || "food",
          date: editingExpense.date || "",
          description: editingExpense.description || "",
        });
      } else {
        setExpenseForm({ amount: "", category: "food", date: "", description: "" });
      }
    }
  }, [showForm, editingExpense]);

  // Reset allowance input when opening
  useEffect(() => {
    if (showAllowanceForm) setAllowanceInput(String(allowance || ""));
  }, [showAllowanceForm, allowance]);

  const fetchData = async () => {
    try {
      const [expensesRes, profileRes] = await Promise.all([
        api.get<Expense[]>("/expenses"),
        api.get<{ monthly_allowance?: number }>("/profiles"),
      ]);

      const expensesData = expensesRes.data || [];
      setExpenses(expensesData.sort((a: Expense, b: Expense) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setAllowance(profileRes.data?.monthly_allowance || 0);
    } catch (error) {
      console.error("Failed to fetch budget data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAllowance = async () => {
    if (!allowanceInput) { toast.error("Please enter an amount"); return; }
    setSavingAllowance(true);

    const result = await api.put("/profiles", { monthly_allowance: parseFloat(allowanceInput) });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Allowance updated!");
      setAllowance(parseFloat(allowanceInput));
      setShowAllowanceForm(false);
    }
    setSavingAllowance(false);
  };

  const handleSave = async () => {
    if (!expenseForm.amount || !expenseForm.category || !expenseForm.date) {
      toast.error("Please fill in amount, category, and date");
      return;
    }
    setSaving(true);

    if (editingExpense) {
      const result = await api.put(`/expenses/${editingExpense.id}`, {
        amount: parseFloat(expenseForm.amount), category: expenseForm.category,
        description: expenseForm.description, date: expenseForm.date,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Expense updated!");
        setShowForm(false);
        setEditingExpense(null);
        fetchData();
      }
    } else {
      const result = await api.post("/expenses", {
        amount: parseFloat(expenseForm.amount), category: expenseForm.category,
        description: expenseForm.description, date: expenseForm.date,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Expense recorded!");
        setShowForm(false);
        fetchData();
      }
    }
    setSaving(false);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm("Delete this expense?")) return;
    const result = await api.delete(`/expenses/${id}`);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Expense deleted");
      fetchData();
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const handleAiInsights = async () => {
    if (expenses.length === 0) {
      toast.error("No expense data to analyze. Add expenses first.");
      return;
    }
    setAiLoading(true);
    try {
      const categorySummary = categoryTotals
        .map((c) => `${categoryConfig[c.category]?.label} ₱${c.amount}`)
        .join(", ");
      const dailyAvg = monthExpenses.length > 0 ? Math.round(monthTotal / monthExpenses.length) : 0;
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Analyze my spending and provide budget recommendations. Total spent this month: ₱${monthTotal}. Monthly allowance: ₱${allowance}. Categories: ${categorySummary}. Daily average: ₱${dailyAvg}.`,
          type: "budget-advisor",
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const parsed = JSON.parse(data.response);
      if (parsed.recommendations) setAiRecommendations(parsed.recommendations);
      if (parsed.insights) setAiInsights(parsed.insights);
      toast.success("AI insights generated!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate insights.");
    } finally {
      setAiLoading(false);
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  // Filter to current calendar month for allowance comparison
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthExpenses = expenses.filter((e) => new Date(e.date) >= monthStart);
  const monthTotal = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const remaining = allowance - monthTotal;

  const categoryTotals = Object.keys(categoryConfig).map((cat) => ({
    category: cat,
    amount: expenses.filter((e) => e.category === cat).reduce((sum, e) => sum + Number(e.amount), 0),
  })).filter((c) => c.amount > 0);

  const maxCategory = Math.max(...categoryTotals.map((c) => c.amount), 1);

  // Group by week
  const weeklyData = expenses.reduce((acc: { week: string; amount: number }[], e) => {
    const d = new Date(e.date);
    const weekNum = Math.ceil(((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000 + new Date(d.getFullYear(), 0, 1).getDay() + 1) / 7);
    const weekKey = `W${weekNum}`;
    const existing = acc.find((w) => w.week === weekKey);
    if (existing) existing.amount += Number(e.amount);
    else acc.push({ week: weekKey, amount: Number(e.amount) });
    return acc;
  }, []).slice(-4);
  const maxWeekly = Math.max(...weeklyData.map((w) => w.amount), 1);

  // Current week total (Sunday–Saturday containing today)
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const thisWeekTotal = expenses
    .filter((e) => new Date(e.date) >= weekStart)
    .reduce((sum, e) => sum + Number(e.amount), 0);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Allowance & Expense Tracker"
        description="Monitor your spending and manage your budget effectively."
        action={
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="size-4" />
            Record Expense
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div onClick={() => setShowAllowanceForm(!showAllowanceForm)} className="h-full cursor-pointer">
          <StatCard label="Monthly Allowance" value={allowance > 0 ? `₱${allowance.toLocaleString()}` : "Set allowance"} icon={Wallet} />
        </div>
        <StatCard label="Total Expenses" value={`₱${monthTotal.toLocaleString()}`} icon={TrendingDown} trend={{ value: "This month", positive: false }} />
        <StatCard label="Remaining" value={allowance > 0 ? `₱${remaining.toLocaleString()}` : "—"} icon={PiggyBank} trend={allowance > 0 ? { value: `${Math.round((remaining / allowance) * 100)}% left`, positive: remaining > 0 } : undefined} />
        <StatCard label="Daily Avg" value={monthExpenses.length > 0 ? `₱${Math.round(monthTotal / monthExpenses.length).toLocaleString()}` : "₱0"} icon={TrendingUp} />
      </div>

      {/* Allowance Form */}
      <AnimatePresence>
        {showAllowanceForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Set Monthly Allowance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Monthly Allowance (₱)</Label>
                  <Input type="number" placeholder="0.00" value={allowanceInput} onChange={(e) => setAllowanceInput(e.target.value)} className="h-8 text-sm" />
                </div>
                <Button size="sm" onClick={handleSaveAllowance} disabled={savingAllowance}>{savingAllowance ? "Saving..." : "Save"}</Button>
                <Button size="sm" variant="outline" onClick={() => setShowAllowanceForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expense Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">{editingExpense ? "Edit Expense" : "Record New Expense"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Amount (₱)</Label>
                  <Input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} placeholder="0.00" className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Category</Label>
                  <select value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {Object.entries(categoryConfig).map(([key, c]) => (
                      <option key={key} value={key}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Description</Label>
                  <Input value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} placeholder="What was it for?" className="h-8 text-sm" />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editingExpense ? "Update Expense" : "Save Expense"}</Button>
                <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditingExpense(null); }}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Tabs defaultValue="expenses">
        <TabsList>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Expense List */}
        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Recent Expenses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {expenses.length === 0 ? (
                <EmptyState icon={Wallet} title="No expenses yet" description='Click "Record Expense" to add your first one.' />
              ) : (
                expenses.map((e) => {
                  const config = categoryConfig[e.category] || categoryConfig.other;
                  return (
                    <div key={e.id} className="group flex items-center gap-3 rounded-md border border-border p-3 transition-colors hover:bg-muted/30">
                      <div className={`size-2 shrink-0 rounded-full ${config.dot}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{e.description || "No description"}</p>
                        <p className="text-[10px] text-muted-foreground">{e.date ? new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""} · {config.label}</p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">₱{Number(e.amount).toLocaleString()}</span>
                      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button onClick={() => handleEditExpense(e)} className="text-muted-foreground hover:text-primary" title="Edit">
                          <Pencil className="size-3.5" />
                        </button>
                        <button onClick={() => handleDeleteExpense(e.id)} className="text-muted-foreground hover:text-destructive" title="Delete">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Charts */}
        <TabsContent value="charts" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Spending by Category</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {categoryTotals.length === 0 ? (
                  <EmptyState icon={TrendingUp} title="No spending data" description="Record expenses to see category breakdown." className="py-6" />
                ) : (
                  categoryTotals.map((c) => {
                    const config = categoryConfig[c.category];
                    return (
                      <div key={c.category} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1.5">
                            <config.icon className="size-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium">{config.label}</span>
                          </div>
                          <span className="text-xs font-medium tabular-nums">₱{c.amount.toLocaleString()}</span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-muted">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(c.amount / maxCategory) * 100}%` }}
                            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                            className="h-full rounded-full bg-primary"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Weekly Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Weekly Spending</CardTitle>
              </CardHeader>
              <CardContent>
                {weeklyData.length === 0 ? (
                  <EmptyState icon={TrendingDown} title="No spending data" description="Record expenses to see weekly trends." className="py-6" />
                ) : (
                  <div className="flex items-end justify-between gap-4 pt-4" style={{ height: 160 }}>
                    {weeklyData.map((w) => (
                      <div key={w.week} className="flex flex-1 flex-col items-center gap-1.5">
                        <div className="flex w-full flex-1 items-end">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${(w.amount / maxWeekly) * 100}%` }}
                            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                            className="w-full rounded-t-md bg-primary/80 transition-colors hover:bg-primary"
                          />
                        </div>
                        <span className="text-[10px] font-medium">{w.week}</span>
                        <span className="text-[10px] text-muted-foreground">₱{w.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleAiInsights} disabled={aiLoading}>
                <Sparkles className="size-4" />
                {aiLoading ? "Analyzing..." : "Get AI Insights"}
              </Button>
            </div>
          </div>
          {aiRecommendations.length > 0 && (
            <Card className="border-primary/20 mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Sparkles className="size-3.5 text-primary" />
                  AI Budget Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {aiRecommendations.map((r, i) => (
                    <div key={i} className="rounded-md border border-border p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug">{r.title}</p>
                        {r.impact && (
                          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            {r.impact}
                          </span>
                        )}
                      </div>
                      {r.insight && <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{r.insight}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {aiInsights.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Lightbulb className="size-3.5 text-primary" />
                  AI Financial Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {aiInsights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-md border border-border p-3">
                    <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    <p className="text-xs">{insight}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Weekly Report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <span className="text-xs text-muted-foreground">Total this week</span>
                  <span className="text-sm font-semibold">₱{thisWeekTotal.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <span className="text-xs text-muted-foreground">Average per day</span>
                  <span className="text-sm font-semibold">₱{monthExpenses.length > 0 ? Math.round(monthTotal / monthExpenses.length).toLocaleString() : 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <span className="text-xs text-muted-foreground">Highest category</span>
                  <span className="text-sm font-semibold">{categoryTotals[0] ? `${categoryConfig[categoryTotals[0].category]?.label} (₱${categoryTotals[0].amount.toLocaleString()})` : "N/A"}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <span className="text-xs text-muted-foreground">Total this month</span>
                  <span className="text-sm font-semibold">₱{monthTotal.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <span className="text-xs text-muted-foreground">Budget used</span>
                  <span className="text-sm font-semibold">{allowance > 0 ? Math.round((monthTotal / allowance) * 100) : 0}%</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <span className="text-xs text-muted-foreground">Remaining budget</span>
                  <span className="text-sm font-semibold">₱{remaining.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-primary/20 bg-primary/5 p-3">
                  <span className="text-xs text-primary">Estimated savings</span>
                  <span className="text-sm font-semibold text-primary">₱{Math.max(0, remaining).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
