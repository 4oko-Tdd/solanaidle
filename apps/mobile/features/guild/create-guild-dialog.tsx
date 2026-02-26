import { useState } from "react";
import { View, Text, TextInput } from "react-native";
import { Button } from "@/components/ui";
import { GlassPanel } from "@/components/glass-panel";

interface Props {
  show: boolean;
  onClose: () => void;
  onCreated: () => void;
  onCreate: (name: string) => Promise<void>;
}

export function CreateGuildDialog({ show, onClose, onCreated, onCreate }: Props) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  if (!show) return null;

  const handleCreate = async () => {
    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    setCreating(true);
    setError("");
    try {
      await onCreate(name.trim());
      setName("");
      onCreated();
      onClose();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err.message || "Failed to create guild");
    } finally {
      setCreating(false);
    }
  };

  return (
    <GlassPanel contentStyle={{ padding: 20, gap: 14 }}>
      <Text className="text-lg font-display text-white" style={{ letterSpacing: 0.5 }}>Create Guild</Text>
      <TextInput
        placeholder="Guild name"
        placeholderTextColor="#4a7a9b"
        value={name}
        onChangeText={setName}
        maxLength={24}
        className="rounded-lg border border-[#1a3a5c]/60 bg-[#0d1f35] px-4 py-3 text-base text-white font-mono"
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
          <Button variant="gradient" size="lg" onPress={handleCreate} disabled={creating}>
            {creating ? "Creating..." : "Create Guild"}
          </Button>
        </View>
      </View>
    </GlassPanel>
  );
}
