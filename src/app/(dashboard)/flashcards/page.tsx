"use client";

import { useEffect, useState } from "react";
import { Plus, Layers, Shuffle, Star, ChevronLeft, ChevronRight, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import type { Flashcard } from "@/types";

export default function FlashcardsPage() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [shuffled, setShuffled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiForm, setShowAiForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fcForm, setFcForm] = useState({ category: "", question: "", answer: "" });
  const [aiForm, setAiForm] = useState({ category: "", notes: "" });

  useEffect(() => {
    fetchFlashcards();
  }, []);

  // Reset forms when closing
  useEffect(() => {
    if (!showForm) setFcForm({ category: "", question: "", answer: "" });
  }, [showForm]);
  useEffect(() => {
    if (!showAiForm) setAiForm({ category: "", notes: "" });
  }, [showAiForm]);

  const fetchFlashcards = async () => {
    const { data, error } = await api.get<Flashcard[]>("/flashcards");
    if (error) {
      const errorMsg = String(error);
      console.error("Flashcards error:", errorMsg);
      toast.error(`Failed to load flashcards: ${errorMsg}`);
    }
    setFlashcards(data || []);
    // Initialize favorites from backend is_favorite flags
    const favIds = new Set<string>();
    (data || []).forEach((c) => { if (c.is_favorite) favIds.add(c.id); });
    setFavorites(favIds);
    setLoading(false);
  };

  const handleCreateSet = async () => {
    if (!fcForm.category || !fcForm.question || !fcForm.answer) { toast.error("Please fill in category, question, and answer"); return; }
    setSaving(true);

    const { error } = await api.post("/flashcards", {
      category: fcForm.category,
      question: fcForm.question,
      answer: fcForm.answer,
    });

    if (error) {
      const errorMsg = String(error);
      console.error("Flashcard save error:", errorMsg);
      toast.error(`Failed to save flashcard: ${errorMsg}`);
    } else {
      toast.success("Flashcard created!");
      setShowForm(false);
      fetchFlashcards();
    }
    setSaving(false);
  };

  const handleDeleteCard = async (id: string) => {
    if (!window.confirm("Delete this flashcard?")) return;
    const { error } = await api.delete("/flashcards/" + id);
    if (error) {
      const errorMsg = String(error);
      toast.error(`Failed to delete: ${errorMsg}`);
    } else {
      toast.success("Card deleted");
      fetchFlashcards();
    }
  };

  const handleDeleteSet = async (category: string) => {
    if (!window.confirm(`Delete the entire "${category}" set?`)) return;
    // Fetch all cards in the category and delete them in parallel
    const { data: cards } = await api.get<Flashcard[]>("/flashcards");
    const categoryCards = (cards || []).filter((c: Flashcard) => c.category === category);
    await Promise.all(categoryCards.map((card) => api.delete("/flashcards/" + card.id)));
    toast.success("Set deleted");
    fetchFlashcards();
  };

  const handleAiGenerate = async () => {
    if (!aiForm.notes || !aiForm.category) { toast.error("Please provide notes and a category name"); return; }

    setAiLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Create flashcards from these notes. Return a JSON array of objects with "question" and "answer" keys. Make 5-10 flashcards. Notes: ${aiForm.notes}`,
          type: "general",
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      let cards: { question?: string; q?: string; answer?: string; a?: string }[] = [];
      try {
        const parsed = JSON.parse(data.response);
        if (Array.isArray(parsed)) cards = parsed;
      } catch {
        const match = data.response.match(/\[[\s\S]*\]/);
        if (match) cards = JSON.parse(match[0]);
      }

      if (cards.length === 0) { toast.error("Could not parse AI response. Try again."); return; }

      const inserts = cards.map((c) => ({
        category: aiForm.category,
        question: c.question || c.q || "",
        answer: c.answer || c.a || "",
      })).filter((c) => c.question && c.answer);

      // Insert all cards in parallel
      await Promise.all(inserts.map((card) => api.post("/flashcards", card)));

      toast.success(`Generated ${inserts.length} flashcards!`);
      setShowAiForm(false);
      fetchFlashcards();
    } catch (err: unknown) {
      toast.error(`Failed to generate flashcards: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setAiLoading(false);
    }
  };

  const categories = Array.from(new Set(flashcards.map((f) => f.category).filter((c): c is string => Boolean(c))));

  const cards = selectedCategory
    ? flashcards.filter((f) => f.category === selectedCategory)
    : flashcards;

  // Clamp currentCard when the card set changes (delete, category switch, etc.)
  useEffect(() => {
    if (currentCard >= cards.length) setCurrentCard(0);
  }, [cards.length, currentCard]);

  const card = cards[currentCard];

  const toggleFavorite = () => {
    if (!card) return;
    const newFavs = new Set(favorites);
    if (newFavs.has(card.id)) newFavs.delete(card.id);
    else newFavs.add(card.id);
    setFavorites(newFavs);
    // Persist favorite toggle to backend
    api.put("/flashcards/" + card.id, { is_favorite: !favorites.has(card.id) });
  };

  const next = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentCard((c) => (c + 1) % Math.max(cards.length, 1)), 150);
  };

  const prev = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentCard((c) => (c - 1 + cards.length) % Math.max(cards.length, 1)), 150);
  };

  const shuffle = () => {
    setShuffled(!shuffled);
    setIsFlipped(false);
    setCurrentCard(Math.floor(Math.random() * Math.max(cards.length, 1)));
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (selectedCategory === null) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Flashcards"
          description="Review your study materials with interactive flashcards."
          action={
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              <Plus className="size-4" />
              Create Set
            </Button>
          }
        />

        {/* Create Flashcard Form */}
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
                <CardTitle className="text-sm font-medium text-muted-foreground">Create New Flashcard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Category / Set Name</Label>
                    <Input value={fcForm.category} onChange={(e) => setFcForm({ ...fcForm, category: e.target.value })} placeholder="e.g. Data Structures" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Question (Front)</Label>
                    <textarea value={fcForm.question} onChange={(e) => setFcForm({ ...fcForm, question: e.target.value })} placeholder="Enter the question" className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Answer (Back)</Label>
                    <textarea value={fcForm.answer} onChange={(e) => setFcForm({ ...fcForm, answer: e.target.value })} placeholder="Enter the answer" className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" onClick={handleCreateSet} disabled={saving}>{saving ? "Saving..." : "Create Flashcard"}</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Generate Form */}
        <AnimatePresence>
          {showAiForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Sparkles className="size-3.5 text-primary" />
                  Generate Flashcards with AI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Category / Set Name</Label>
                    <Input value={aiForm.category} onChange={(e) => setAiForm({ ...aiForm, category: e.target.value })} placeholder="e.g. Data Structures" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Paste your notes here</Label>
                    <textarea value={aiForm.notes} onChange={(e) => setAiForm({ ...aiForm, notes: e.target.value })} placeholder="Paste notes, lecture summaries, or study material..." className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" onClick={handleAiGenerate} disabled={aiLoading}>
                    {aiLoading ? "Generating..." : "Generate Flashcards"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAiForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {categories.length === 0 ? (
          <EmptyState icon={Layers} title="No flashcards yet" description='Click "Create Set" to add flashcards.' />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat, i) => {
              const catCards = flashcards.filter((f) => f.category === cat);
              return (
                <motion.div
                  key={cat}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <Card
                    className="group cursor-pointer transition-colors hover:border-primary/30"
                  >
                    <CardContent
                      className="space-y-3 p-5"
                      onClick={() => { setSelectedCategory(cat); setCurrentCard(0); }}
                    >
                      <div className="flex items-start justify-between">
                        <Layers className="size-4 text-primary" />
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteSet(cat); }} className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive" title="Delete set">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{cat}</p>
                        <p className="text-xs text-muted-foreground">{catCards.length} cards</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: categories.length * 0.05 }}
            >
              <Card className="flex cursor-pointer items-center justify-center border-dashed transition-colors hover:border-primary/30" onClick={() => setShowAiForm(!showAiForm)}>
                <CardContent className="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
                  <Sparkles className="size-5 text-primary" />
                  <p className="text-xs font-medium">Generate with AI</p>
                  <p className="text-[10px]">Create flashcards from your notes</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={selectedCategory}
        description={`Card ${currentCard + 1} of ${cards.length}`}
        action={
          <Button variant="outline" size="sm" onClick={() => { setSelectedCategory(null); setCurrentCard(0); }}>
            Back to Sets
          </Button>
        }
      />

      {cards.length === 0 ? (
        <EmptyState icon={Layers} title="No flashcards in this set" />
      ) : card ? (
        <>
          {/* Flashcard */}
          <div className="flex flex-col items-center gap-6">
            <div
              className="relative w-full max-w-2xl cursor-pointer"
              style={{ perspective: "1000px" }}
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <div
                className="relative w-full transition-transform duration-500"
                style={{
                  transformStyle: "preserve-3d",
                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  minHeight: "280px",
                }}
              >
                {/* Front */}
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-lg border border-border bg-card p-8 text-center"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <div className="space-y-3">
                    <span className="text-[10px] font-medium text-primary">Question</span>
                    <p className="text-lg font-medium">{card.question}</p>
                    <p className="text-[10px] text-muted-foreground">Click to flip</p>
                  </div>
                </div>
                {/* Back */}
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-lg border border-primary/20 bg-primary/5 p-8 text-center"
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  <div className="space-y-3">
                    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Answer</span>
                    <p className="text-base leading-relaxed">{card.answer}</p>
                    <p className="text-[10px] text-muted-foreground">Click to flip back</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={prev}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={toggleFavorite}
                className={favorites.has(card.id) ? "text-amber-500" : ""}
              >
                <Star className={`size-4 ${favorites.has(card.id) ? "fill-current" : ""}`} />
              </Button>
              <Button variant="outline" size="icon" onClick={shuffle}>
                <Shuffle className={`size-4 ${shuffled ? "text-primary" : ""}`} />
              </Button>
              <Button variant="outline" size="icon" onClick={() => { setIsFlipped(false); setCurrentCard(0); }}>
                <RotateCcw className="size-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => handleDeleteCard(card.id)} className="text-muted-foreground hover:text-destructive" title="Delete card">
                <Trash2 className="size-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={next}>
                <ChevronRight className="size-4" />
              </Button>
            </div>

            {/* Progress dots */}
            <div className="flex gap-1">
              {cards.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentCard ? "w-5 bg-primary" : "size-1.5 bg-muted"
                  }`}
                />
              ))}
            </div>

            {/* Review Stats */}
            <div className="grid w-full max-w-2xl grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-xl font-semibold text-primary">{favorites.size}</p>
                  <p className="text-[10px] text-muted-foreground">Favorites</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-xl font-semibold text-primary">{cards.length}</p>
                  <p className="text-[10px] text-muted-foreground">Total Cards</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-xl font-semibold text-primary">{Math.round(((currentCard + 1) / cards.length) * 100)}%</p>
                  <p className="text-[10px] text-muted-foreground">Progress</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      ) : (
        <EmptyState icon={Layers} title="No flashcard selected" />
      )}
    </div>
  );
}
