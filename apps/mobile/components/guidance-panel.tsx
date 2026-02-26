import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface Props {
  title: string;
  lines: string[];
}

export function GuidancePanel({ title, lines }: Props) {
  return (
    <View
      style={{
        borderRadius: 12,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(26,58,92,0.6)",
      }}
    >
      <LinearGradient
        colors={["rgba(20,241,149,0.10)", "rgba(153,69,255,0.08)", "rgba(10,22,40,0.95)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 12, paddingVertical: 10, gap: 6 }}
      >
        <Text
          style={{
            fontFamily: "Orbitron_700Bold",
            fontSize: 12,
            letterSpacing: 1.2,
            color: "#00d4ff",
          }}
        >
          {title.toUpperCase()}
        </Text>

        {lines.map((line, index) => (
          <View key={`${index}:${line}`} style={{ flexDirection: "row", gap: 8 }}>
            <Text
              style={{
                width: 16,
                fontFamily: "Rajdhani_700Bold",
                fontSize: 12,
                color: "rgba(255,255,255,0.55)",
              }}
            >
              {index + 1}.
            </Text>
            <Text
              style={{
                flex: 1,
                fontFamily: "Rajdhani_600SemiBold",
                fontSize: 13,
                lineHeight: 17,
                color: "rgba(255,255,255,0.75)",
              }}
            >
              {line}
            </Text>
          </View>
        ))}
      </LinearGradient>
    </View>
  );
}
