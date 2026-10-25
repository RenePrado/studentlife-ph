"use client";

import { useEffect, useState } from "react";
import { Plus, Search, StickyNote, Pin, Trash2, Bold, Italic, List, Code, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import type { Note } from "@/types";

const toolbarButtons = [
  { icon: Bold, label: "Bold", command: "bold" },
  { icon: Italic, label: "Italic", command: "italic" },
  { icon: List, label: "List", command: "insertUnorderedList" },
  { icon: Code, label: "Code", command: "formatBlock" },
  { icon: CheckSquare, label: "Checklist", command: "insertOrderedList" },
];

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [addingTag, setAddingTag] = useState(false);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    const { data, error } = await api.get("/notes");
    if (error) {
      const errorMsg = String(error);
      console.error("Notes error:", errorMsg);
      toast.error(`Failed to load notes: ${errorMsg}`);
    }
    setNotes(data || []);
    if (data && data.length > 0) setSelectedNote(data[0].id);
    setLoading(false);
  };

  const handleNewNote = async () => {
    const { data, error } = await api.post("/notes", {
      title: "Untitled Note",
      content: "",
      tags: [],
    });

    if (error) {
      toast.error("Failed to create note");
    } else {
      setNotes([data, ...notes]);
      setSelectedNote(data.id);
      toast.success("New note created");
    }
  };

  const handleTogglePin = async (noteId: string, currentPinned: boolean) => {
    const { error } = await api.put("/notes/" + noteId, { is_pinned: !currentPinned });
    if (error) {
      toast.error("Failed to update note");
    } else {
      fetchNotes();
    }
  };

  const handleDelete = async (noteId: string) => {
    const { error } = await api.delete("/notes/" + noteId);
    if (error) {
      toast.error("Failed to delete note");
    } else {
      setNotes(notes.filter((n) => n.id !== noteId));
      setSelectedNote(null);
      toast.success("Note deleted");
    }
  };

  const handleUpdateNote = async (noteId: string, field: string, value: string) => {
    const { error } = await api.put("/notes/" + noteId, { [field]: value });
    if (error) {
      const errorMsg = String(error);
      console.error("Note save error:", errorMsg);
      toast.error(`Failed to save note: ${errorMsg}`);
    }
  };

  const handleAddTag = async (noteId: string) => {
    const tag = tagInput.trim();
    if (!tag) { setAddingTag(false); return; }
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;
    const currentTags = note.tags || [];
    if (currentTags.includes(tag)) { toast.error("Tag already exists"); return; }
    const newTags = [...currentTags, tag];
    const { error } = await api.put("/notes/" + noteId, { tags: newTags });
    if (error) {
      const errorMsg = String(error);
      toast.error(`Failed to add tag: ${errorMsg}`);
    } else {
      toast.success("Tag added");
      setAddingTag(false);
      setTagInput("");
      fetchNotes();
    }
  };

  const handleRemoveTag = async (noteId: string, tag: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;
    const newTags = (note.tags || []).filter((t: string) => t !== tag);
    const { error } = await api.put("/notes/" + noteId, { tags: newTags });
    if (error) {
      const errorMsg = String(error);
      toast.error(`Failed to remove tag: ${errorMsg}`);
    } else {
      fetchNotes();
    }
  };

  const handleFormat = (command: string) => {
    const editor = document.getElementById("note-editor");
    if (editor) {
      editor.focus();
      document.execCommand(command, false, undefined);
    }
  };

  const filteredNotes = notes.filter(
    (n) =>
      n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedNotes = filteredNotes.filter((n) => n.is_pinned);
  const otherNotes = filteredNotes.filter((n) => !n.is_pinned);
  const currentNote = notes.find((n) => n.id === selectedNote);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 w-full rounded-lg" />
          <Skeleton className="h-96 w-full rounded-lg lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Notes"
        description="Rich-text note-taking with tags, search, and organization."
        action={
          <Button size="sm" onClick={handleNewNote}>
            <Plus className="size-4" />
            New Note
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Notes List */}
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              className="h-8 pl-9 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Pinned Notes */}
          {pinnedNotes.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                <Pin className="size-3" /> Pinned
              </p>
              {pinnedNotes.map((note) => (
                <Card
                  key={note.id}
                  className={`cursor-pointer transition-colors hover:border-primary/30 ${
                    selectedNote === note.id ? "border-primary" : ""
                  }`}
                >
                  <CardContent className="p-3" onClick={() => setSelectedNote(note.id)}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{note.title}</p>
                      <Pin className="size-3 shrink-0 text-primary" />
                    </div>
                    <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">{note.content}</p>
                    {note.tags && note.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {note.tags.map((tag: string) => (
                          <span key={tag} className="text-[10px] text-muted-foreground">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Other Notes */}
          <div className="space-y-2">
            {pinnedNotes.length > 0 && (
              <p className="text-[10px] font-medium text-muted-foreground">All Notes</p>
            )}
            {otherNotes.length === 0 && pinnedNotes.length === 0 ? (
              <EmptyState icon={StickyNote} title="No notes yet" description='Click "New Note" to create one.' className="p-6" />
            ) : (
              otherNotes.map((note) => (
                <Card
                  key={note.id}
                  className={`cursor-pointer transition-colors hover:border-primary/30 ${
                    selectedNote === note.id ? "border-primary" : ""
                  }`}
                >
                  <CardContent className="p-3" onClick={() => setSelectedNote(note.id)}>
                    <p className="text-sm font-medium">{note.title}</p>
                    <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">{note.content}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {note.tags?.map((tag: string) => (
                          <span key={tag} className="text-[10px] text-muted-foreground">#{tag}</span>
                        ))}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{note.updated_at ? new Date(note.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-2">
          {currentNote ? (
            <Card className="h-full" key={currentNote.id}>
              <CardContent className="flex h-full flex-col p-0">
                {/* Toolbar */}
                <div className="flex items-center gap-1 border-b border-border p-2">
                  {toolbarButtons.map((btn) => (
                    <Button
                      key={btn.label}
                      variant="ghost"
                      size="icon-sm"
                      onMouseDown={(e) => { e.preventDefault(); handleFormat(btn.command); }}
                      title={btn.label}
                    >
                      <btn.icon className="size-4" />
                    </Button>
                  ))}
                  <div className="ml-auto flex gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => handleTogglePin(currentNote.id, currentNote.is_pinned)}>
                      <Pin className={`size-4 ${currentNote.is_pinned ? "text-primary" : ""}`} />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => handleDelete(currentNote.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                {/* Editor Content */}
                <div className="flex-1 space-y-4 p-6">
                  <input
                    type="text"
                    defaultValue={currentNote.title}
                    className="w-full border-none bg-transparent text-xl font-semibold outline-none"
                    onBlur={(e) => handleUpdateNote(currentNote.id, "title", e.target.value)}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {currentNote.tags?.map((tag: string) => (
                      <button key={tag} onClick={() => handleRemoveTag(currentNote.id, tag)} className="text-xs text-muted-foreground hover:text-destructive" title="Remove tag">
                        #{tag}
                      </button>
                    ))}
                    {addingTag ? (
                      <div className="flex items-center gap-1">
                        <Input
                          placeholder="Tag name"
                          className="h-6 w-24 text-xs"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleAddTag(currentNote.id); }}
                          autoFocus
                        />
                        <Button size="xs" onClick={() => handleAddTag(currentNote.id)}>Add</Button>
                        <Button size="xs" variant="outline" onClick={() => { setAddingTag(false); setTagInput(""); }}>Cancel</Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="xs" onClick={() => setAddingTag(true)}>
                        <Plus className="size-3" />
                        Add tag
                      </Button>
                    )}
                  </div>
                  <div
                    id="note-editor"
                    contentEditable
                    suppressContentEditableWarning
                    dangerouslySetInnerHTML={{ __html: currentNote.content || "" }}
                    className="min-h-[400px] w-full resize-none border-none bg-transparent text-sm leading-relaxed outline-none focus:outline-none"
                    data-placeholder="Start writing your note..."
                    onBlur={(e) => handleUpdateNote(currentNote.id, "content", e.currentTarget.innerHTML)}
                  />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-border p-3 text-[10px] text-muted-foreground">
                  <span>Last edited: {currentNote.updated_at ? new Date(currentNote.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""}</span>
                  <span>Auto-saved</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border p-12 text-center">
              <div className="space-y-2">
                <StickyNote className="mx-auto size-8 text-muted-foreground/50" />
                <p className="text-sm font-medium">Select a note to edit</p>
                <p className="text-xs text-muted-foreground">Or create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
