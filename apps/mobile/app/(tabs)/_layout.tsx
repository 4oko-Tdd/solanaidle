import { Tabs } from "expo-router";
import { Shield, Search, Wrench, Users, Trophy } from "lucide-react-native";
import { Colors } from "@/lib/theme";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: "rgba(0,255,135,0.15)",
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 56,
        },
        tabBarActiveTintColor: Colors.neonGreen,
        tabBarInactiveTintColor: "#4a7a9b",
        tabBarLabelStyle: {
          fontSize: 12,
          letterSpacing: 1,
          fontFamily: "Rajdhani_600SemiBold",
        },
      }}
    >
      <Tabs.Screen
        name="game"
        options={{
          title: "NODE",
          tabBarIcon: ({ color }) => <Shield size={20} color={color} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="ops"
        options={{
          title: "OPS",
          tabBarIcon: ({ color }) => <Search size={20} color={color} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="base"
        options={{
          title: "BASE",
          tabBarIcon: ({ color }) => <Wrench size={20} color={color} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="guild"
        options={{
          title: "GUILD",
          tabBarIcon: ({ color }) => <Users size={20} color={color} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="ranks"
        options={{
          title: "RANKS",
          tabBarIcon: ({ color }) => <Trophy size={20} color={color} strokeWidth={1.5} />,
        }}
      />
    </Tabs>
  );
}
