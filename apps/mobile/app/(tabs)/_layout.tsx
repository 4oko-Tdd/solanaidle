import { Tabs } from "expo-router";
import { Shield, Search, Wrench, Users, Trophy } from "lucide-react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#111111",
          borderTopColor: "rgba(0,255,135,0.15)",
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: "#00ff87",
        tabBarInactiveTintColor: "rgba(255,255,255,0.35)",
        tabBarLabelStyle: {
          fontSize: 10,
          letterSpacing: 1,
        },
      }}
    >
      <Tabs.Screen
        name="game"
        options={{
          title: "NODE",
          tabBarIcon: ({ color }) => <Shield size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ops"
        options={{
          title: "OPS",
          tabBarIcon: ({ color }) => <Search size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="base"
        options={{
          title: "BASE",
          tabBarIcon: ({ color }) => <Wrench size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="guild"
        options={{
          title: "GUILD",
          tabBarIcon: ({ color }) => <Users size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ranks"
        options={{
          title: "RANKS",
          tabBarIcon: ({ color }) => <Trophy size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}
