"use client";

import { useEffect, useState } from "react";
import { Plus, ChevronLeft, ChevronRight, CalendarDays, Trash2, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import type { CalendarEvent } from "@/types";

const eventColors: Record<string, string> = {
  class: "bg-primary",
  assignment: "bg-chart-3",
  exam: "bg-destructive",
  personal: "bg-emerald-500",
  event: "bg-chart-4",
  general: "bg-chart-4",
};

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState("month");
  const [weekOffset, setWeekOffset] = useState(0);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: "", date: "", startTime: "", endTime: "", category: "class", description: "",
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  // Reset form when opening/closing or switching edit target
  useEffect(() => {
    if (showForm) {
      if (editingEvent) {
        setEventForm({
          title: editingEvent.title || "",
          date: editingEvent.date || "",
          startTime: editingEvent.start_time || "",
          endTime: editingEvent.end_time || "",
          category: editingEvent.category || "class",
          description: editingEvent.description || "",
        });
      } else {
        setEventForm({ title: "", date: "", startTime: "", endTime: "", category: "class", description: "" });
      }
    }
  }, [showForm, editingEvent]);

  const fetchEvents = async () => {
    const { data, error } = await api.get<CalendarEvent[]>("/events");
    if (error) {
      const errorMsg = String(error);
      console.error("Events error:", errorMsg);
      toast.error(`Failed to load events: ${errorMsg}`);
    }
    setEvents(data || []);
    setLoading(false);
  };

  const handleAddEvent = async () => {
    if (!eventForm.title || !eventForm.date) { toast.error("Please enter event title and date"); return; }
    setSaving(true);

    if (editingEvent) {
      const { error } = await api.put("/events/" + editingEvent.id, {
        title: eventForm.title, date: eventForm.date,
        start_time: eventForm.startTime || null, end_time: eventForm.endTime || null,
        category: eventForm.category, description: eventForm.description || null,
      });
      if (error) {
        const errorMsg = String(error);
        toast.error(`Failed to update event: ${errorMsg}`);
      } else {
        toast.success("Event updated!");
        setShowForm(false);
        setEditingEvent(null);
        fetchEvents();
      }
    } else {
      const { error } = await api.post("/events", {
        title: eventForm.title, date: eventForm.date,
        start_time: eventForm.startTime || null, end_time: eventForm.endTime || null,
        category: eventForm.category, description: eventForm.description || null,
      });
      if (error) {
        const errorMsg = String(error);
        toast.error(`Failed to save event: ${errorMsg}`);
      } else {
        toast.success("Event added!");
        setShowForm(false);
        fetchEvents();
      }
    }
    setSaving(false);
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm("Delete this event?")) return;
    const { error } = await api.delete("/events/" + id);
    if (error) {
      const errorMsg = String(error);
      toast.error(`Failed to delete: ${errorMsg}`);
    } else {
      toast.success("Event deleted");
      fetchEvents();
    }
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setShowForm(true);
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const calendarDays = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDayOfWeek + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });

  // Format a Date as YYYY-MM-DD in local time (avoids toISOString() UTC shift)
  const toLocalDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const selectedDayEvents = selectedDate
    ? events.filter((e) => {
        const eventDateStr = e.date ? toLocalDateStr(new Date(e.date)) : "";
        return eventDateStr === selectedDate;
      })
    : [];

  const todayDate = toLocalDateStr(new Date());

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Calendar"
        description="All your classes, assignments, exams, and events in one view."
        action={
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="size-4" />
            Add Event
          </Button>
        }
      />

      {/* Event Form */}
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
              <CardTitle className="text-sm font-medium text-muted-foreground">{editingEvent ? "Edit Event" : "Add New Event"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Title</Label>
                  <Input value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} placeholder="Event title" className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Category</Label>
                  <select value={eventForm.category} onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })} className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="class">Class</option>
                    <option value="assignment">Assignment</option>
                    <option value="exam">Exam</option>
                    <option value="personal">Personal</option>
                    <option value="event">Event</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Start Time</Label>
                  <Input type="time" value={eventForm.startTime} onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })} className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">End Time</Label>
                  <Input type="time" value={eventForm.endTime} onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })} className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Description</Label>
                  <Input value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} placeholder="Optional description" className="h-8 text-sm" />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={handleAddEvent} disabled={saving}>{saving ? "Saving..." : editingEvent ? "Update Event" : "Add Event"}</Button>
                <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditingEvent(null); }}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Tabs value={viewMode} onValueChange={setViewMode}>
        <TabsList>
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
        </TabsList>
      </Tabs>

      {viewMode === "month" && (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Calendar Grid */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                {months[currentMonth]} {currentYear}
              </CardTitle>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
                    else setCurrentMonth(currentMonth - 1);
                  }}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
                    else setCurrentMonth(currentMonth + 1);
                  }}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day) => (
                <div key={day} className="pb-2 text-center text-[10px] font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
              {/* Calendar days */}
              {calendarDays.map((day, i) => {
                if (!day) return <div key={i} className="border-transparent" />;
                const dateObj = new Date(currentYear, currentMonth, day);
                const dateStr = toLocalDateStr(dateObj);
                const dayEvents = events.filter((e) => {
                  const eDateStr = e.date ? toLocalDateStr(new Date(e.date)) : "";
                  return eDateStr === dateStr;
                });
                const isToday = dateStr === toLocalDateStr(new Date());
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`relative flex min-h-[64px] flex-col items-start rounded-md border p-1.5 text-xs transition-colors ${
                      "border-border hover:bg-muted/30 cursor-pointer"
                    } ${
                      selectedDate === dateStr ? "border-primary bg-primary/5 ring-1 ring-primary" : ""
                    }`}
                  >
                    <span className={`font-medium ${isToday ? "flex size-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground" : ""}`}>
                      {day}
                    </span>
                    <div className="mt-1 flex flex-wrap gap-0.5">
                      {dayEvents.map((e, idx) => (
                        <div
                          key={idx}
                          className={`size-1.5 rounded-full ${eventColors[e.category || "general"] || eventColors.general}`}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Event List for Selected Day */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {selectedDate
                ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                : "Select a day"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedDayEvents.length > 0 ? (
              selectedDayEvents.map((e, i) => (
                <motion.div
                  key={e.id || i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="group flex items-start gap-2.5 rounded-md border border-border p-3"
                >
                  <div className={`mt-1 size-2 shrink-0 rounded-full ${eventColors[e.category || "general"] || eventColors.general}`} />
                  <div className="flex-1 space-y-0.5">
                    <p className="text-sm font-medium">{e.title}</p>
                    {e.start_time && <p className="text-[10px] text-muted-foreground tabular-nums">{e.start_time}{e.end_time ? ` - ${e.end_time}` : ""}</p>}
                    {e.description && <p className="text-[10px] text-muted-foreground">{e.description}</p>}
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={() => handleEditEvent(e)} className="text-muted-foreground hover:text-primary" title="Edit">
                      <Pencil className="size-3.5" />
                    </button>
                    <button onClick={() => handleDeleteEvent(e.id)} className="text-muted-foreground hover:text-destructive" title="Delete">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <EmptyState icon={CalendarDays} title={selectedDate ? "No events on this day" : "Select a date"} description={selectedDate ? undefined : "Click a date to see events"} className="border-none p-0" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      )}

      {viewMode === "week" && (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            {(() => {
              const base = new Date();
              base.setDate(base.getDate() + weekOffset * 7);
              const start = new Date(base);
              start.setDate(base.getDate() - base.getDay());
              const end = new Date(start);
              end.setDate(start.getDate() + 6);
              return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
            })()}
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => setWeekOffset(weekOffset - 1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setWeekOffset(0)}>
              Today
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setWeekOffset(weekOffset + 1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
          {weekDays.map((day, i) => {
            const base = new Date();
            base.setDate(base.getDate() + weekOffset * 7);
            const start = new Date(base);
            start.setDate(base.getDate() - base.getDay() + i);
            const dateStr = toLocalDateStr(start);
            const dayEvents = events.filter((e) => {
              const eDateStr = e.date ? toLocalDateStr(new Date(e.date)) : "";
              return eDateStr === dateStr;
            });
            const isToday = dateStr === todayDate;
            return (
              <Card key={day} className={`min-h-[120px] ${isToday ? "border-primary" : ""}`}>
                <CardHeader className="p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-muted-foreground">{day}</span>
                    <span className={`text-xs font-medium ${isToday ? "flex size-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground" : ""}`}>{start.getDate()}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 p-2 pt-0">
                  {dayEvents.map((e, idx) => (
                    <div key={idx} className="group flex items-start gap-1.5 rounded-md border border-border p-1.5">
                      <div className={`mt-0.5 size-1.5 shrink-0 rounded-full ${eventColors[e.category || "general"] || eventColors.general}`} />
                      <div className="flex-1 space-y-0.5">
                        <p className="text-[10px] font-medium leading-tight">{e.title}</p>
                        {e.start_time && <p className="text-[9px] text-muted-foreground tabular-nums">{e.start_time}</p>}
                      </div>
                      <div className="flex flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button onClick={() => handleEditEvent(e)} className="text-muted-foreground hover:text-primary" title="Edit">
                          <Pencil className="size-2.5" />
                        </button>
                        <button onClick={() => handleDeleteEvent(e.id)} className="text-muted-foreground hover:text-destructive" title="Delete">
                          <Trash2 className="size-2.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}
