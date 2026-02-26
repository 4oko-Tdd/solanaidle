import { useEffect } from "react";
import { View, Text, Pressable, ImageBackground } from "react-native";
import { Tabs } from "expo-router";
import { Swords, Wrench, Users, Trophy } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/providers/auth-context";
import { useInventory } from "@/hooks/use-inventory";
import { usePerks } from "@/hooks/use-perks";
import { CurrencyBar } from "@/components/currency-bar";
import { useToast } from "@/components/toast-provider";
import { registerNodeTabTap } from "@/providers/dev-tools";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

function getDeepestRouteName(route: any): string | undefined {
  if (!route?.state || !route.state.routes || route.state.index == null) {
    return route?.name;
  }
  const child = route.state.routes[route.state.index];
  return getDeepestRouteName(child);
}

function CustomTabBar({
  state,
  descriptors,
  navigation,
  baseBadgeCount = 0,
  onTabPressSync,
}: BottomTabBarProps & { baseBadgeCount?: number; onTabPressSync?: () => void }) {
  const insets = useSafeAreaInsets();
  const { toast } = useToast();

  // Respect tabBarStyle: { display: 'none' } from active screen options
  const currentRoute = state.routes[state.index];
  const currentOpts = descriptors[currentRoute.key].options;
  if ((currentOpts.tabBarStyle as { display?: string } | undefined)?.display === "none") {
    return null;
  }
  const activeNestedRoute = getDeepestRouteName(currentRoute);
  if (activeNestedRoute === "class-picker") {
    return null;
  }

  const bottomPad = Math.max(insets.bottom, 4);

  return (
    <View
      style={{
        overflow: "hidden",
        borderTopWidth: 1,
        borderTopColor: "rgba(26,58,92,0.8)",
        backgroundColor: "#0a1628",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          backgroundColor: "#0a1628",
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
              size: 24,
            });

            const label = ((options.title ?? route.name) as string).toUpperCase();

            return (
              <Pressable
                key={route.key}
                onPress={() => {
                  onTabPressSync?.();
                  if (route.name === "game" && isFocused) {
                    const toggled = registerNodeTabTap();
                    if (toggled) {
                      toast("Developer tools toggled", "info");
                    }
                  }
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
                {/* Icon — scale up + glow when active */}
                <View
                  style={
                    isFocused
                      ? {
                          transform: [{ scale: 1.12 }],
                          shadowColor: "#14F195",
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.4,
                          shadowRadius: 6,
                        }
                      : { opacity: 0.75 }
                  }
                >
                  {icon}
                </View>
                {route.name === "base" && baseBadgeCount > 0 ? (
                  <View
                    style={{
                      position: "absolute",
                      top: 2,
                      right: "26%",
                      minWidth: 16,
                      height: 16,
                      borderRadius: 8,
                      paddingHorizontal: 4,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#FF3366",
                      borderWidth: 1,
                      borderColor: "rgba(10,22,40,0.95)",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Orbitron_700Bold",
                        fontSize: 9,
                        color: "#ffffff",
                        lineHeight: 11,
                      }}
                    >
                      {baseBadgeCount > 9 ? "9+" : String(baseBadgeCount)}
                    </Text>
                  </View>
                ) : null}

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
    </View>
  );
}

export default function TabLayout() {
  const { isAuthenticated } = useAuth();
  const inventory = useInventory(isAuthenticated);
  const perks = usePerks(isAuthenticated);
  const insets = useSafeAreaInsets();
  const showCurrencyBar = isAuthenticated && !!inventory;
  const baseBadgeCount =
    isAuthenticated && perks.hasPending ? 1 : 0;

  useEffect(() => {
    if (!isAuthenticated) return;
    void perks.refresh();
    const id = setInterval(() => {
      void perks.refresh();
    }, 30000);
    return () => clearInterval(id);
  }, [isAuthenticated, perks.refresh]);

  return (
    <ImageBackground
      source={require("@/assets/bgcity.png")}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <View style={{ flex: 1, paddingTop: showCurrencyBar ? 0 : insets.top }}>
        {showCurrencyBar && <CurrencyBar inventory={inventory} topInset={insets.top} />}
        <Tabs
          tabBar={(props) => (
            <CustomTabBar
              {...props}
              baseBadgeCount={baseBadgeCount}
              onTabPressSync={() => {
                if (isAuthenticated) void perks.refresh();
              }}
            />
          )}
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
                <Swords size={24} color={color} strokeWidth={1.5} />
              ),
            }}
          />
          <Tabs.Screen
            name="base"
            options={{
              title: "BASE",
              tabBarIcon: ({ color }) => (
                <Wrench size={24} color={color} strokeWidth={1.5} />
              ),
            }}
          />
          <Tabs.Screen
            name="guild"
            options={{
              title: "GUILD",
              tabBarIcon: ({ color }) => (
                <Users size={24} color={color} strokeWidth={1.5} />
              ),
            }}
          />
          <Tabs.Screen
            name="ranks"
            options={{
              title: "RANKS",
              tabBarIcon: ({ color }) => (
                <Trophy size={24} color={color} strokeWidth={1.5} />
              ),
            }}
          />
        </Tabs>
      </View>
    </ImageBackground>
  );
}
