import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Image } from "expo-image";
import {
  Search,
  Briefcase,
  TrendingUp,
  ArrowRightLeft,
  CheckCircle2,
  Zap,
  Clock,
  Gem,
  AlertCircle,
  Coins,
  Info,
  ShieldCheck,
  Users,
  Droplets,
} from "lucide-react-native";
import { useQuests } from "@/hooks/use-quests";
import type {
  TokenResult,
  PortfolioResult,
  PriceWatchResult,
} from "@/hooks/use-quests";
import type { QuestId, ActiveBoost } from "@solanaidle/shared";

// ── Format helpers ──

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n > 0) return `$${n.toFixed(4)}`;
  return "$0";
}

function fmtPrice(n: number): string {
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  if (n > 0) return `$${n.toPrecision(3)}`;
  return "$0";
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

function fmtBal(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n < 0.01 ? n.toFixed(4) : n.toFixed(2);
}

function fmtChange(pct: number): { text: string; cls: string } {
  const sign = pct >= 0 ? "+" : "";
  const text = `${sign}${pct.toFixed(1)}%`;
  const cls =
    pct > 0
      ? "text-neon-green"
      : pct < 0
        ? "text-red-400"
        : "text-white/40";
  return { text, cls };
}

// ── Reward Icons ──

function RewardIcons({
  scrap,
  crystal,
  artifact,
  boost,
}: {
  scrap?: number;
  crystal?: number;
  artifact?: number;
  boost?: { type: string; percentBonus: number };
}) {
  const BOOST_ICON: Record<string, { icon: React.ReactNode; cls: string }> = {
    xp: {
      icon: <Zap size={14} color="#ffb800" />,
      cls: "text-neon-amber",
    },
    speed: {
      icon: <Clock size={14} color="#00d4ff" />,
      cls: "text-neon-cyan",
    },
    loot_chance: {
      icon: <Gem size={14} color="#9945ff" />,
      cls: "text-neon-purple",
    },
  };

  return (
    <View className="flex-row items-center gap-1.5">
      {!!scrap && (
        <View className="flex-row items-center gap-0.5">
          <Image
            source={require("@/assets/icons/scrap.png")}
            style={{ width: 24, height: 24 }}
          />
          <Text className="text-xs font-mono text-white/70">{scrap}</Text>
        </View>
      )}
      {!!crystal && (
        <View className="flex-row items-center gap-0.5">
          <Image
            source={require("@/assets/icons/tokens.png")}
            style={{ width: 24, height: 24 }}
          />
          <Text className="text-xs font-mono text-white/70">{crystal}</Text>
        </View>
      )}
      {!!artifact && (
        <View className="flex-row items-center gap-0.5">
          <Image
            source={require("@/assets/icons/key.png")}
            style={{ width: 24, height: 24 }}
          />
          <Text className="text-xs font-mono text-white/70">{artifact}</Text>
        </View>
      )}
      {boost && (
        <View
          className={`flex-row items-center gap-0.5 ${BOOST_ICON[boost.type]?.cls ?? "text-neon-amber"}`}
        >
          {BOOST_ICON[boost.type]?.icon ?? (
            <Zap size={14} color="#ffb800" />
          )}
          <Text className={`text-xs font-mono opacity-80 ${BOOST_ICON[boost.type]?.cls ?? "text-neon-amber"}`}>
            +{boost.percentBonus}%
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Boost Bar ──

const BOOST_LABEL: Record<
  string,
  { label: string; cls: string; icon: React.ReactNode }
> = {
  xp: {
    label: "XP",
    cls: "text-neon-amber border-neon-amber/20 bg-neon-amber/10",
    icon: <Zap size={14} color="#ffb800" />,
  },
  speed: {
    label: "Speed",
    cls: "text-neon-cyan border-neon-cyan/20 bg-neon-cyan/10",
    icon: <Clock size={14} color="#00d4ff" />,
  },
  loot_chance: {
    label: "Loot",
    cls: "text-neon-purple border-neon-purple/20 bg-neon-purple/10",
    icon: <Gem size={14} color="#9945ff" />,
  },
};

function BoostBar({ boosts }: { boosts: ActiveBoost[] }) {
  if (!boosts.length) return null;
  return (
    <View className="flex-row flex-wrap gap-1.5 mb-1">
      {boosts.map((b) => {
        const c = BOOST_LABEL[b.type] ?? BOOST_LABEL.xp;
        const mins = Math.max(
          0,
          Math.floor((new Date(b.expiresAt).getTime() - Date.now()) / 60000),
        );
        return (
          <View
            key={`${b.type}-${b.source}`}
            className={`flex-row items-center gap-1 px-2 py-0.5 rounded-full border ${c.cls}`}
          >
            {c.icon}
            <Text className={`text-sm font-mono ${c.cls}`}>
              +{b.percentBonus}% {c.label}{" "}
              <Text className="opacity-50">{mins}m</Text>
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Portfolio Strip ──

function PortfolioStrip({ data }: { data: PortfolioResult }) {
  return (
    <View className="mt-1.5 flex-row items-center gap-2 px-2 py-1 rounded bg-white/[0.03] overflow-hidden">
      <Text className="text-sm font-mono text-white/70">
        SOL: {fmtBal(data.solBalance)}
      </Text>
      <Text className="text-sm font-mono text-white/30">
        ({fmtUsd(data.solBalance * data.solUsdPrice)})
      </Text>
      <Text className="text-sm font-mono text-white/20">|</Text>
      <Text className="text-sm font-mono text-neon-green font-semibold">
        Total: {fmtUsd(data.totalUsd)}
      </Text>
    </View>
  );
}

// ── Price Watch Strip ──

function PriceWatchStrip({ data }: { data: PriceWatchResult }) {
  return (
    <View className="mt-1.5 flex-row flex-wrap gap-1">
      {data.priceChanges.slice(0, 5).map((p) => {
        const { text, cls } = fmtChange(p.priceChange24h);
        const mintLabel =
          p.isSOL ? "SOL" : p.mint.slice(0, 4);
        return (
          <View
            key={p.mint}
            className={`flex-row items-center gap-0.5 px-1.5 py-0.5 rounded border ${cls === "text-neon-green" ? "border-neon-green/20 bg-neon-green/10" : cls === "text-red-400" ? "border-red-400/20 bg-red-400/10" : "border-white/10 bg-white/5"}`}
          >
            <Text className={`text-xs font-mono ${cls}`}>
              {mintLabel} {text}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Main Panel ──

export function QuestPanel() {
  const {
    status,
    loading,
    refresh,
    completeTokenScan,
    completePortfolioCheck,
    completePriceWatch,
    completeMicroSwap,
    tokenResults,
    portfolioResults,
    priceWatchResults,
  } = useQuests();

  const [tokenQuery, setTokenQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [swapSig, setSwapSig] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const done = (id: QuestId) =>
    status?.quests.find((q) => q.id === id)?.completed ?? false;

  const dailyCount = (
    ["token_scan", "portfolio_check", "pnl_report"] as QuestId[]
  ).filter(done).length;

  const QUEST_LABELS: Record<string, string> = {
    token_scan: "Recon Scan",
    portfolio: "Vault Audit",
    priceWatch: "Signal Sweep",
    swap: "Supply Run",
  };

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusy(id);
    setError(null);
    try {
      await fn();
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || "Something went wrong";
      setError(msg);
    } finally {
      setBusy(null);
    }
  };

  if (loading && !status) {
    return (
      <View className="gap-2">
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            className="rounded-lg border border-white/[0.04] bg-[#0d1525] p-2.5"
          >
            <View className="flex-row items-center gap-2">
              <View className="w-8 h-8 rounded-md bg-white/5" />
              <View className="flex-1">
                <View className="h-3 w-20 bg-white/5 rounded" />
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View className="gap-1.5">
      {/* Active boosts */}
      {status && <BoostBar boosts={status.activeBoosts} />}

      {/* Error */}
      {error && (
        <View className="flex-row items-center gap-2 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle size={16} color="#f87171" />
          <Text className="text-red-400 text-xs font-mono flex-1">{error}</Text>
          <Pressable onPress={() => setError(null)}>
            <Text className="text-red-400/60">x</Text>
          </Pressable>
        </View>
      )}

      {/* Info block */}
      <View className="rounded-lg border border-white/[0.06] bg-[#0b1220] px-3 py-2.5">
        <Pressable
          onPress={() => setShowInfo(!showInfo)}
          className="flex-row items-center gap-2"
        >
          <Info size={16} color="rgba(0,212,255,0.6)" />
          <Text className="text-sm font-display text-white/60 flex-1">
            Field ops powered by Jupiter. Complete tasks to earn resources &
            boosts.
          </Text>
          <Text className="text-xs text-white/20">{showInfo ? "−" : "+"}</Text>
        </Pressable>
        {showInfo && (
          <View className="mt-1.5 pl-5 gap-1">
            <Text className="text-sm text-white/50 leading-relaxed">
              Daily ops reset every 24h. Weekly ops reset on Monday.
            </Text>
            <Text className="text-sm text-white/50 leading-relaxed">
              Each op rewards Scrap, Tokens, or Keys — plus temporary boosts to
              XP, loot chance, or mission speed.
            </Text>
            <Text className="text-sm text-white/50 leading-relaxed">
              Supply Run performs a real 0.001 SOL swap on Solana via Jupiter.
            </Text>
          </View>
        )}
      </View>

      {/* Daily header */}
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-display font-semibold text-white/70 uppercase tracking-wider">
          Daily Ops
        </Text>
        <View className="flex-row items-center gap-1">
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${i < dailyCount ? "bg-neon-green" : "bg-white/10"}`}
            />
          ))}
          <Text className="text-xs font-mono text-white/40 ml-0.5">
            {dailyCount}/3
          </Text>
        </View>
      </View>

      {/* ── Recon Scan (Token Search) ── */}
      <View className="rounded-lg border border-white/[0.06] bg-[#0d1525] px-3 py-2.5">
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-md items-center justify-center shrink-0 bg-neon-green/10 border border-neon-green/20">
            <Search size={16} color="#00ff87" />
          </View>
          <Text className="text-sm font-display font-semibold text-white flex-1">
            Recon Scan
          </Text>
          <RewardIcons scrap={20} boost={{ type: "xp", percentBonus: 10 }} />
          {done("token_scan") && (
            <CheckCircle2 size={16} color="#00ff87" />
          )}
        </View>
        {!done("token_scan") && (
          <View className="flex-row gap-1 mt-1.5">
            <TextInput
              value={tokenQuery}
              onChangeText={setTokenQuery}
              placeholder="SOL, BONK, JUP..."
              placeholderTextColor="rgba(255,255,255,0.2)"
              className="flex-1 bg-[#0a1120] border border-white/10 rounded px-2 py-1 text-sm text-white"
              onSubmitEditing={() => {
                if (tokenQuery.trim()) {
                  run("token_scan", async () => {
                    await completeTokenScan(tokenQuery.trim());
                  });
                }
              }}
              returnKeyType="search"
            />
            <Pressable
              onPress={() => {
                if (tokenQuery.trim()) {
                  run("token_scan", async () => {
                    await completeTokenScan(tokenQuery.trim());
                  });
                }
              }}
              disabled={!tokenQuery.trim() || busy === "token_scan"}
              className="px-2 py-1 bg-neon-green/15 border border-neon-green/25 rounded items-center justify-center shrink-0 disabled:opacity-30"
            >
              {busy === "token_scan" ? (
                <ActivityIndicator size="small" color="#39ff14" />
              ) : (
                <Search size={16} color="#00ff87" />
              )}
            </Pressable>
          </View>
        )}
        {/* Token results — max 3 */}
        {tokenResults && tokenResults.length > 0 && (
          <View className="mt-1.5 gap-1">
            {tokenResults.slice(0, 3).map((t) => {
              const ch = t.priceChange24h;
              const chSign = ch != null && ch >= 0 ? "+" : "";
              const chCls =
                ch != null
                  ? ch > 0
                    ? "text-neon-green"
                    : ch < 0
                      ? "text-red-400"
                      : "text-white/40"
                  : "";
              return (
                <View
                  key={t.address}
                  className="rounded bg-white/[0.03] px-2 py-1"
                >
                  <View className="flex-row items-center gap-1.5">
                    {t.logoURI ? (
                      <Image
                        source={{ uri: t.logoURI }}
                        style={{ width: 16, height: 16, borderRadius: 8 }}
                      />
                    ) : (
                      <View className="w-4 h-4 rounded-full bg-white/10 items-center justify-center shrink-0">
                        <Coins size={12} color="rgba(255,255,255,0.3)" />
                      </View>
                    )}
                    <Text className="text-xs font-semibold text-white">
                      {t.symbol}
                    </Text>
                    {t.isVerified && (
                      <ShieldCheck size={12} color="rgba(0,255,135,0.5)" />
                    )}
                    <Text className="text-xs text-white/25 flex-1" numberOfLines={1}>
                      {t.name}
                    </Text>
                    {t.price != null && (
                      <Text className="font-mono text-white/70 text-xs">
                        {fmtPrice(t.price)}
                      </Text>
                    )}
                    {ch != null && (
                      <Text className={`font-mono text-xs ${chCls}`}>
                        {chSign}
                        {ch.toFixed(1)}%
                      </Text>
                    )}
                  </View>
                  <View className="flex-row items-center gap-2.5 mt-0.5 pl-[22px]">
                    {t.mcap != null && t.mcap > 0 && (
                      <Text className="text-xs font-mono text-white/50">
                        MCap ${fmtCompact(t.mcap)}
                      </Text>
                    )}
                    {t.liquidity != null && t.liquidity > 0 && (
                      <View className="flex-row items-center gap-0.5">
                        <Droplets size={10} color="rgba(255,255,255,0.5)" />
                        <Text className="text-xs font-mono text-white/50">
                          ${fmtCompact(t.liquidity)}
                        </Text>
                      </View>
                    )}
                    {t.holderCount != null && t.holderCount > 0 && (
                      <View className="flex-row items-center gap-0.5">
                        <Users size={10} color="rgba(255,255,255,0.5)" />
                        <Text className="text-xs font-mono text-white/50">
                          {fmtCompact(t.holderCount)}
                        </Text>
                      </View>
                    )}
                    {t.daily_volume != null && t.daily_volume > 0 && (
                      <Text className="text-xs font-mono text-white/50">
                        Vol ${fmtCompact(t.daily_volume)}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
        {tokenResults && tokenResults.length === 0 && (
          <Text className="text-sm text-white/25 mt-1 text-center">
            No tokens found
          </Text>
        )}
      </View>

      {/* ── Vault Audit (Portfolio) ── */}
      <View className="rounded-lg border border-white/[0.06] bg-[#0d1525] px-3 py-2.5">
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-md items-center justify-center shrink-0 bg-neon-cyan/10 border border-neon-cyan/20">
            <Briefcase size={16} color="#00d4ff" />
          </View>
          <Text className="text-sm font-display font-semibold text-white flex-1">
            Vault Audit
          </Text>
          <RewardIcons scrap={15} boost={{ type: "loot_chance", percentBonus: 10 }} />
          {done("portfolio_check") ? (
            <CheckCircle2 size={16} color="#00ff87" />
          ) : (
            <Pressable
              onPress={() =>
                run("portfolio", async () => {
                  await completePortfolioCheck();
                })
              }
              disabled={busy === "portfolio"}
              className="px-2 py-0.5 bg-white/[0.06] border border-white/[0.08] rounded items-center justify-center shrink-0 disabled:opacity-40"
            >
              {busy === "portfolio" ? (
                <ActivityIndicator size="small" color="rgba(255,255,255,0.9)" />
              ) : (
                <Text className="text-sm font-mono text-white/90 font-semibold">
                  Go
                </Text>
              )}
            </Pressable>
          )}
        </View>
        {portfolioResults && <PortfolioStrip data={portfolioResults} />}
      </View>

      {/* ── Signal Sweep (Price Watch) ── */}
      <View className="rounded-lg border border-white/[0.06] bg-[#0d1525] px-3 py-2.5">
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-md items-center justify-center shrink-0 bg-neon-amber/10 border border-neon-amber/20">
            <TrendingUp size={16} color="#ffb800" />
          </View>
          <Text className="text-sm font-display font-semibold text-white flex-1">
            Signal Sweep
          </Text>
          <RewardIcons crystal={3} boost={{ type: "speed", percentBonus: 10 }} />
          {done("pnl_report") ? (
            <CheckCircle2 size={16} color="#00ff87" />
          ) : (
            <Pressable
              onPress={() =>
                run("priceWatch", async () => {
                  await completePriceWatch();
                })
              }
              disabled={busy === "priceWatch"}
              className="px-2 py-0.5 bg-white/[0.06] border border-white/[0.08] rounded items-center justify-center shrink-0 disabled:opacity-40"
            >
              {busy === "priceWatch" ? (
                <ActivityIndicator size="small" color="rgba(255,255,255,0.9)" />
              ) : (
                <Text className="text-sm font-mono text-white/90 font-semibold">
                  Go
                </Text>
              )}
            </Pressable>
          )}
        </View>
        {priceWatchResults && <PriceWatchStrip data={priceWatchResults} />}
      </View>

      {/* Weekly divider */}
      <View className="flex-row items-center justify-between mt-0.5">
        <Text className="text-sm font-display font-semibold text-white/70 uppercase tracking-wider">
          Weekly Op
        </Text>
        <View className="flex-row items-center gap-1">
          <View
            className={`w-1.5 h-1.5 rounded-full ${done("micro_swap") ? "bg-neon-green" : "bg-white/10"}`}
          />
          <Text className="text-xs font-mono text-white/40 ml-0.5">
            {done("micro_swap") ? 1 : 0}/1
          </Text>
        </View>
      </View>

      {/* ── Supply Run (Micro Swap) ── */}
      <View className="rounded-lg border border-white/[0.06] bg-[#0d1525] px-3 py-2.5">
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-md items-center justify-center shrink-0 bg-neon-purple/10 border border-neon-purple/20">
            <ArrowRightLeft size={16} color="#9945ff" />
          </View>
          <Text className="text-sm font-display font-semibold text-white flex-1">
            Supply Run
          </Text>
          <RewardIcons scrap={50} crystal={10} artifact={1} />
          {done("micro_swap") ? (
            <CheckCircle2 size={16} color="#00ff87" />
          ) : (
            <Pressable
              onPress={() => run("swap", async () => {
                // Swap requires wallet signTransaction — not available in mobile hook;
                // surface a clear message to the user.
                throw new Error("Supply Run requires a desktop wallet with signTransaction.");
              })}
              disabled={busy === "swap"}
              className="px-2 py-0.5 bg-white/[0.06] border border-white/[0.08] rounded items-center justify-center shrink-0 disabled:opacity-40"
            >
              {busy === "swap" ? (
                <ActivityIndicator size="small" color="rgba(255,255,255,0.9)" />
              ) : (
                <Text className="text-sm font-mono text-white/90 font-semibold">
                  0.001 SOL
                </Text>
              )}
            </Pressable>
          )}
        </View>
        {(done("micro_swap") || swapSig) && (
          <View className="mt-1.5 flex-row items-center gap-1.5 px-2 py-1 rounded bg-white/[0.03]">
            <CheckCircle2 size={16} color="#00ff87" />
            <Text className="text-sm font-mono text-neon-green">
              0.001 SOL → USDC
            </Text>
            {swapSig && (
              <Text className="text-sm font-mono text-white/20">
                {swapSig.slice(0, 8)}…
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Jupiter branding */}
      <View className="rounded-lg bg-[#0a1120] border border-white/[0.05] items-center justify-center py-1.5 mt-0.5">
        <Image
          source={require("@/assets/icons/poweredbyjupiter-dark.svg")}
          style={{ height: 20, width: 120 }}
          contentFit="contain"
        />
      </View>
    </View>
  );
}
