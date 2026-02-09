import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { getUnlockedSkills, getAvailableSkills, unlockSkill } from "../services/skill-service.js";
import { getActiveRun } from "../services/run-service.js";
import { getSkillsForClass } from "../services/game-config.js";

type Env = { Variables: { wallet: string } };

const skills = new Hono<Env>();
skills.use("*", authMiddleware);

// Get skill tree for current class + which are unlocked
skills.get("/", (c) => {
  const wallet = c.get("wallet");
  const run = getActiveRun(wallet);
  if (!run) {
    return c.json({ error: "NO_ACTIVE_RUN", message: "No active run" }, 400);
  }
  const allSkills = getSkillsForClass(run.classId);
  const unlocked = getUnlockedSkills(run.id);
  const available = getAvailableSkills(run.id, run.classId);
  return c.json({
    classId: run.classId,
    skillPoints: run.skillPoints,
    skills: allSkills,
    unlocked,
    available: available.map((s) => s.id),
  });
});

// Unlock a skill
skills.post("/unlock", async (c) => {
  const wallet = c.get("wallet");
  const run = getActiveRun(wallet);
  if (!run) {
    return c.json({ error: "NO_ACTIVE_RUN", message: "No active run" }, 400);
  }
  const body = await c.req.json<{ skillId: string }>();
  try {
    unlockSkill(run.id, run.classId, body.skillId);
    // Return updated skill state
    const allSkills = getSkillsForClass(run.classId);
    const unlocked = getUnlockedSkills(run.id);
    const available = getAvailableSkills(run.id, run.classId);
    const updatedRun = getActiveRun(wallet);
    return c.json({
      classId: run.classId,
      skillPoints: updatedRun?.skillPoints ?? 0,
      skills: allSkills,
      unlocked,
      available: available.map((s) => s.id),
    });
  } catch (e: any) {
    const errorMap: Record<string, [number, string]> = {
      "SKILL_ALREADY_UNLOCKED": [409, "Skill already unlocked"],
      "SKILL_PREREQUISITE": [400, "Must unlock previous tier first"],
      "INSUFFICIENT_SKILL_POINTS": [400, "Not enough skill points"],
      "SKILL_NOT_FOUND": [404, "Invalid skill"],
    };
    const mapped = errorMap[e.message];
    if (mapped) return c.json({ error: e.message, message: mapped[1] }, mapped[0] as any);
    throw e;
  }
});

export default skills;
