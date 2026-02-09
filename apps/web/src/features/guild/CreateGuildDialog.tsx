import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface Props {
  onCreated: () => void;
}

export function CreateGuildDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    setCreating(true);
    setError("");
    try {
      await api("/guilds", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });
      setOpen(false);
      setName("");
      onCreated();
    } catch (e: any) {
      setError(e.message || "Failed to create guild");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="flex-1">
          Create
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Guild</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Guild name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm bg-background"
            maxLength={24}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? "Creating..." : "Create Guild"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
