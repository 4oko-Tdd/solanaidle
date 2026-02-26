import { useState } from "react";
import { View, Text, TextInput } from "react-native";
import { Button } from "@/components/ui";
import { GlassPanel } from "@/components/glass-panel";

interface Props {
  show: boolean;
  onClose: () => void;
  onJoined: () => void;
  onJoin: (inviteCode: string) => Promise<void>;
}

export function JoinGuildDialog({ show, onClose, onJoined, onJoin }: Props) {
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  if (!show) return null;

  const handleJoin = async () => {
    if (!code.trim()) {
      setError("Enter an invite code");
      return;
    }
    setJoining(true);
    setError("");
    try {
      await onJoin(code.trim());
      setCode("");
      onJoined();
      onClose();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err.message || "Failed to join guild");
    } finally {
      setJoining(false);
    }
  };

  return (
    <GlassPanel contentStyle={{ padding: 20, gap: 14 }}>
      <Text className="text-lg font-display text-white" style={{ letterSpacing: 0.5 }}>Join Guild</Text>
      <TextInput
        placeholder="Invite code"
        placeholderTextColor="#4a7a9b"
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
        maxLength={8}
        autoCapitalize="characters"
        className="rounded-lg border border-[#1a3a5c]/60 bg-[#0d1f35] px-4 py-3 text-base text-white font-mono tracking-widest"
      />
      {!!error && (
        <Text className="text-sm text-neon-red">{error}</Text>
      )}
      <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
        <View style={{ flex: 1 }}>
          <Button variant="outline" size="lg" onPress={onClose}>
            Cancel
          </Button>
        </View>
        <View style={{ flex: 1 }}>
          <Button variant="gradient" size="lg" onPress={handleJoin} disabled={joining}>
            {joining ? "Joining..." : "Join Guild"}
          </Button>
        </View>
      </View>
    </GlassPanel>
  );
}
