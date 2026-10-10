import { supabase } from "@/integrations/supabase/client";
import type { LeaderboardEntry } from "./types";

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function createRoom(hostName: string): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateRoomCode();
    const { error } = await supabase
      .from("game_rooms")
      .insert({ code, host_name: hostName, status: "waiting" });
    if (!error) return code;
    if (error.code !== "23505") {
      throw new Error("Could not create a room. Please try again.");
    }
  }
  throw new Error("Could not create a room. Please try again.");
}

export async function joinRoom(
  code: string,
  guestName: string,
): Promise<{ hostName: string }> {
  const { data, error } = await supabase
    .from("game_rooms")
    .select("code, host_name, guest_name, status")
    .eq("code", code)
    .maybeSingle();

  if (error) throw new Error("Connection problem. Please try again.");
  if (!data) throw new Error("Room not found. Check the Room ID.");
  if (data.guest_name) throw new Error("Room is full (2 players max).");

  const { error: updateError } = await supabase
    .from("game_rooms")
    .update({ guest_name: guestName, status: "playing" })
    .eq("code", code)
    .is("guest_name", null);

  if (updateError) throw new Error("Room is full (2 players max).");

  return { hostName: data.host_name };
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data } = await supabase
    .from("leaderboard_entries")
    .select("name, score, time_remaining, result, created_at")
    .order("score", { ascending: false })
    .limit(20);

  return (data ?? []).map((row) => ({
    name: row.name,
    score: row.score,
    timeRemaining: row.time_remaining,
    date: row.created_at,
    result: row.result === "LOSS" ? "LOSS" : "WIN",
  }));
}

export async function submitEntries(
  entries: { name: string; score: number; timeRemaining: number; result: "WIN" | "LOSS" }[],
): Promise<void> {
  if (entries.length === 0) return;
  await supabase.from("leaderboard_entries").insert(
    entries.map((entry) => ({
      name: entry.name.slice(0, 24),
      score: entry.score,
      time_remaining: entry.timeRemaining,
      result: entry.result,
    })),
  );
}

export async function markRoomFinished(code: string): Promise<void> {
  await supabase.from("game_rooms").update({ status: "finished" }).eq("code", code);
}
