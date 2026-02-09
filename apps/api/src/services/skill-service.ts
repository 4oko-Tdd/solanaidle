import db from "../db/database.js";
import crypto from "crypto";
import type { UnlockedSkill, SkillNode } from "@solanaidle/shared";
import { SKILL_TREES, getSkillsForClass } from "./game-config.js";
import { deductSkillPoints } from "./run-service.js";
import { insertEvent } from "./event-service.js";

// Get all skills unlocked in a run
export function getUnlockedSkills(runId: string): UnlockedSkill[] {
  const rows = db.prepare(
    "SELECT skill_id, unlocked_at FROM unlocked_skills WHERE run_id = ?"
  ).all(runId) as any[];
  return rows.map((r) => ({ skillId: r.skill_id, unlockedAt: r.unlocked_at }));
}

// Check if a specific skill is unlocked
export function hasSkill(runId: string, skillId: string): boolean {
  const row = db.prepare(
    "SELECT 1 FROM unlocked_skills WHERE run_id = ? AND skill_id = ?"
  ).get(runId, skillId);
  return !!row;
}

// Get available skills the player can unlock
export function getAvailableSkills(runId: string, classId: string): SkillNode[] {
  const classSkills = getSkillsForClass(classId);
  const unlocked = getUnlockedSkills(runId).map((u) => u.skillId);

  return classSkills.filter((skill) => {
    // Already unlocked
    if (unlocked.includes(skill.id)) return false;
    // Check prerequisite: must have all lower-tier skills of same class
    if (skill.tier > 1) {
      const prerequisite = classSkills.find(
        (s) => s.classId === skill.classId && s.tier === skill.tier - 1
      );
      if (prerequisite && !unlocked.includes(prerequisite.id)) return false;
    }
    return true;
  });
}

// Unlock a skill — validates cost, prerequisites, deducts points
export function unlockSkill(runId: string, classId: string, skillId: string): void {
  const skill = SKILL_TREES.find((s) => s.id === skillId);
  if (!skill) throw new Error("SKILL_NOT_FOUND");
  if (skill.classId !== classId) throw new Error("SKILL_NOT_FOUND");

  // Check already unlocked
  if (hasSkill(runId, skillId)) throw new Error("SKILL_ALREADY_UNLOCKED");

  // Check prerequisite tier
  if (skill.tier > 1) {
    const classSkills = getSkillsForClass(classId);
    const prerequisite = classSkills.find(
      (s) => s.classId === classId && s.tier === skill.tier - 1
    );
    if (prerequisite && !hasSkill(runId, prerequisite.id)) {
      throw new Error("SKILL_PREREQUISITE");
    }
  }

  // Check skill points
  const run = db.prepare("SELECT skill_points FROM weekly_runs WHERE id = ?").get(runId) as any;
  if (!run || run.skill_points < skill.cost) {
    throw new Error("INSUFFICIENT_SKILL_POINTS");
  }

  // Deduct points and insert skill
  deductSkillPoints(runId, skill.cost);
  db.prepare(
    "INSERT INTO unlocked_skills (id, run_id, skill_id) VALUES (?, ?, ?)"
  ).run(crypto.randomUUID(), runId, skillId);
  insertEvent(runId, "skill_unlock", { skillId, skillName: skill.name });
}
