import { View, Text, Pressable, ImageBackground } from "react-native";
import { Tabs } from "expo-router";
import { Swords, Search, Wrench, Users, Trophy } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/providers/auth-context";
import { useInventory } from "@/hooks/use-inventory";
import { CurrencyBar } from "@/components/currency-bar";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // Respect tabBarStyle: { display: 'none' } from active screen options
  const currentRoute = state.routes[state.index];
  const currentOpts = descriptors[currentRoute.key].options;
  if ((currentOpts.tabBarStyle as { display?: string } | undefined)?.display === "none") {
    return null;
  }

  const bottomPad = Math.max(insets.bottom, 4);

  return (
    <View
      style={{
        overflow: "hidden",
        borderTopWidth: 1,
        borderTopColor: "rgba(26,58,92,0.8)",
      }}
    >
      <BlurView intensity={28} tint="dark" style={{ width: "100%" }}>
        <View
          style={{
            flexDirection: "row",
            backgroundColor: "rgba(10,22,40,0.90)",
            height: 52 + bottomPad,
            paddingBottom: bottomPad,
          }}
        >
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;

            const icon = options.tabBarIcon?.({
              focused: isFocused,
              color: isFocused ? "#14F195" : "#4a7a9b",
              size: 20,
            });

            const label = ((options.title ?? route.name) as string).toUpperCase();

            return (
              <Pressable
                key={route.key}
                onPress={() => {
                  const event = navigation.emit({
                    type: "tabPress",
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!isFocused && !event.defaultPrevented) {
                    navigation.navigate(route.name as never);
                  }
                }}
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingTop: 6,
                  gap: 2,
                  position: "relative",
                }}
              >
                {/* Icon — scale up + brighter when active */}
                <View
                  style={
                    isFocused
                      ? { transform: [{ scale: 1.12 }] }
                      : { opacity: 0.75 }
                  }
                >
                  {icon}
                </View>

                {/* Label */}
                <Text
                  style={{
                    fontFamily: "Rajdhani_600SemiBold",
                    fontSize: 10,
                    letterSpacing: 1.5,
                    color: isFocused ? "#14F195" : "#4a7a9b",
                  }}
                >
                  {label}
                </Text>

                {/* Gradient indicator line — purple→green, sits at bottom edge */}
                {isFocused && (
                  <LinearGradient
                    colors={["#9945FF", "#14F195"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: "15%",
                      right: "15%",
                      height: 2,
                      borderTopLeftRadius: 1,
                      borderTopRightRadius: 1,
                    }}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

export default function TabLayout() {
  const { isAuthenticated } = useAuth();
  const inventory = useInventory(isAuthenticated);

  return (
    <ImageBackground
      source={require("@/assets/bgcity.png")}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <View style={{ flex: 1 }}>
        {isAuthenticated && inventory && <CurrencyBar inventory={inventory} />}
        <Tabs
          tabBar={(props) => <CustomTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            sceneStyle: { backgroundColor: "transparent" },
          }}
        >
          <Tabs.Screen
            name="game"
            options={{
              title: "NODE",
              tabBarIcon: ({ color }) => (
                <Swords size={20} color={color} strokeWidth={1.5} />
              ),
            }}
          />
          <Tabs.Screen
            name="ops"
            options={{
              title: "OPS",
              tabBarIcon: ({ color }) => (
                <Search size={20} color={color} strokeWidth={1.5} />
              ),
            }}
          />
          <Tabs.Screen
            name="base"
            options={{
              title: "BASE",
              tabBarIcon: ({ color }) => (
                <Wrench size={20} color={color} strokeWidth={1.5} />
              ),
            }}
          />
          <Tabs.Screen
            name="guild"
            options={{
              title: "GUILD",
              tabBarIcon: ({ color }) => (
                <Users size={20} color={color} strokeWidth={1.5} />
              ),
            }}
          />
          <Tabs.Screen
            name="ranks"
            options={{
              title: "RANKS",
              tabBarIcon: ({ color }) => (
                <Trophy size={20} color={color} strokeWidth={1.5} />
              ),
            }}
          />
        </Tabs>
      </View>
    </ImageBackground>
  );
}
