import { useState } from "react";
import { View, Text, TextInput, Modal } from "react-native";
import { Button } from "@/components/ui";

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
    <Modal
      visible={show}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: "center", padding: 20, backgroundColor: "rgba(3,5,10,0.96)" }}>
        <View style={{ width: "100%", maxWidth: 440, alignSelf: "center" }}>
          <View
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "rgba(26,58,92,0.6)",
              backgroundColor: "#0a1628",
              padding: 20,
              gap: 14,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                letterSpacing: 0.5,
                color: "#ffffff",
                fontFamily: "Orbitron_700Bold",
              }}
            >
              Join Guild
            </Text>
            <TextInput
              placeholder="Invite code"
              placeholderTextColor="#4a7a9b"
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              maxLength={8}
              autoCapitalize="characters"
              style={{
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "rgba(26,58,92,0.6)",
                backgroundColor: "#0d1f35",
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
                color: "#ffffff",
                fontFamily: "Rajdhani_700Bold",
                letterSpacing: 1.5,
              }}
            />
            {!!error && (
              <Text style={{ fontSize: 14, color: "#FF3366" }}>{error}</Text>
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
          </View>
        </View>
      </View>
    </Modal>
  );
}
