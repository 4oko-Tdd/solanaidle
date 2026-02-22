import { useState } from "react";
import { View, Text, TextInput } from "react-native";
import { Button } from "@/components/ui";

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
    <View className="mt-4 rounded-xl border border-[#1a3a5c]/60 bg-[#0a1628]/95 p-4 gap-3">
      <Text className="text-sm font-sans-bold text-white">Create Guild</Text>
      <TextInput
        placeholder="Guild name"
        placeholderTextColor="#4a7a9b"
        value={name}
        onChangeText={setName}
        maxLength={24}
        className="rounded border border-[#1a3a5c]/60 bg-[#0d1f35] px-3 py-2 text-sm text-white font-mono"
      />
      {!!error && (
        <Text className="text-xs text-neon-red">{error}</Text>
      )}
      <View className="flex-row gap-2">
        <Button variant="ghost" size="sm" onPress={onClose} className="flex-1">
          Cancel
        </Button>
        <Button size="sm" onPress={handleCreate} disabled={creating} className="flex-1">
          <Text className="text-xs font-mono text-neon-green">
            {creating ? "Creating..." : "Create Guild"}
          </Text>
        </Button>
      </View>
    </View>
  );
}
