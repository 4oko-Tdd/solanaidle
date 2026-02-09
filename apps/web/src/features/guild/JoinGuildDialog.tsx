import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface Props {
  onJoined: () => void;
}

export function JoinGuildDialog({ onJoined }: Props) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async () => {
    if (!code.trim()) {
      setError("Enter an invite code");
      return;
    }
    setJoining(true);
    setError("");
    try {
      await api("/guilds/join", {
        method: "POST",
        body: JSON.stringify({ inviteCode: code.trim() }),
      });
      setOpen(false);
      setCode("");
      onJoined();
    } catch (e: any) {
      setError(e.message || "Failed to join guild");
    } finally {
      setJoining(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex-1">
          Join
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join Guild</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Invite code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full rounded-md border px-3 py-2 text-sm font-mono bg-background"
            maxLength={8}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            className="w-full"
            onClick={handleJoin}
            disabled={joining}
          >
            {joining ? "Joining..." : "Join Guild"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
