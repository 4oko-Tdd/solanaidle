import { useState, useCallback, useEffect } from "react";
import { api } from "@/lib/api";
import type { Guild, GuildMember } from "@solanaidle/shared";

interface GuildState {
  guild: Guild | null;
  members: GuildMember[];
  loading: boolean;
}

export function useGuild(isAuthenticated: boolean) {
  const [state, setState] = useState<GuildState>({
    guild: null,
    members: [],
    loading: true,
  });

  const fetchGuild = useCallback(async () => {
    if (!isAuthenticated) {
      setState({ guild: null, members: [], loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await api<{ guild: Guild | null; members: GuildMember[] }>("/guilds/mine");
      setState({ guild: data.guild, members: data.members, loading: false });
    } catch {
      setState({ guild: null, members: [], loading: false });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchGuild();
  }, [fetchGuild]);

  const createGuild = useCallback(
    async (name: string) => {
      await api("/guilds", { method: "POST", body: JSON.stringify({ name }) });
      await fetchGuild();
    },
    [fetchGuild]
  );

  const joinGuild = useCallback(
    async (inviteCode: string) => {
      await api("/guilds/join", { method: "POST", body: JSON.stringify({ inviteCode }) });
      await fetchGuild();
    },
    [fetchGuild]
  );

  const leaveGuild = useCallback(async () => {
    await api("/guilds/leave", { method: "POST" });
    setState({ guild: null, members: [], loading: false });
  }, []);

  return { ...state, fetchGuild, createGuild, joinGuild, leaveGuild };
}
