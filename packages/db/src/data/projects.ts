import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../client";
import { logger } from "../log";
import { project } from "../schema";

const log = logger.child({ scope: "projects" });

export type ProjectSummary = {
  id: string;
  title: string;
  starterId: string | null;
  activeFile: string;
  createdAt: number;
  updatedAt: number;
};

export type ProjectRecord = ProjectSummary & {
  files: Record<string, string>;
};

export type CreateProjectInput = {
  title: string;
  starterId?: string | null;
  activeFile: string;
  files: Record<string, string>;
};

export type UpdateProjectPatch = {
  title?: string;
  activeFile?: string;
  files?: Record<string, string>;
};

function toMs(d: Date | number): number {
  if (d instanceof Date) return d.getTime();
  const n = Number(d);
  return n < 1e12 ? n * 1000 : n;
}

function toSummary(row: {
  id: string;
  title: string;
  starterId: string | null;
  activeFile: string;
  createdAt: Date | number;
  updatedAt: Date | number;
}): ProjectSummary {
  return {
    id: row.id,
    title: row.title,
    starterId: row.starterId ?? null,
    activeFile: row.activeFile,
    createdAt: toMs(row.createdAt),
    updatedAt: toMs(row.updatedAt),
  };
}

function toRecord(row: {
  id: string;
  title: string;
  starterId: string | null;
  activeFile: string;
  files: Record<string, string>;
  createdAt: Date | number;
  updatedAt: Date | number;
}): ProjectRecord {
  return {
    ...toSummary(row),
    files: row.files,
  };
}

export async function listProjects(userId: string): Promise<ProjectSummary[]> {
  const rows = await getDb()
    .select({
      id: project.id,
      title: project.title,
      starterId: project.starterId,
      activeFile: project.activeFile,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    })
    .from(project)
    .where(eq(project.userId, userId))
    .orderBy(desc(project.updatedAt));
  return rows.map(toSummary);
}

export async function getProject(
  userId: string,
  projectId: string,
): Promise<ProjectRecord | null> {
  const rows = await getDb()
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.userId, userId)))
    .limit(1);
  const row = rows[0];
  return row ? toRecord(row) : null;
}

export async function createProject(
  userId: string,
  input: CreateProjectInput,
): Promise<ProjectRecord> {
  const id = crypto.randomUUID();
  const now = new Date();
  const inserted = await getDb()
    .insert(project)
    .values({
      id,
      userId,
      title: input.title,
      starterId: input.starterId ?? null,
      activeFile: input.activeFile,
      files: input.files,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  const row = inserted[0];
  if (!row) throw new Error("createProject: insert returned no row");
  log.info({ userId, projectId: id }, "createProject");
  return toRecord(row);
}

export async function updateProject(
  userId: string,
  projectId: string,
  patch: UpdateProjectPatch,
): Promise<ProjectRecord | null> {
  const db = getDb();
  const now = new Date();
  const set: Record<string, unknown> = { updatedAt: now };
  if (patch.title !== undefined) set.title = patch.title;
  if (patch.activeFile !== undefined) set.activeFile = patch.activeFile;
  if (patch.files !== undefined) set.files = patch.files;
  const updated = await db
    .update(project)
    .set(set)
    .where(and(eq(project.id, projectId), eq(project.userId, userId)))
    .returning();
  const row = updated[0];
  if (!row) return null;
  log.debug({ userId, projectId }, "updateProject");
  return toRecord(row);
}

export async function deleteProject(
  userId: string,
  projectId: string,
): Promise<boolean> {
  const deleted = await getDb()
    .delete(project)
    .where(and(eq(project.id, projectId), eq(project.userId, userId)))
    .returning({ id: project.id });
  const ok = deleted.length > 0;
  if (ok) log.info({ userId, projectId }, "deleteProject");
  return ok;
}

export async function migrateProjectsOwner(
  fromUserId: string,
  toUserId: string,
): Promise<number> {
  if (fromUserId === toUserId) return 0;
  const result = await getDb()
    .update(project)
    .set({ userId: toUserId })
    .where(eq(project.userId, fromUserId))
    .returning({ id: project.id });
  return result.length;
}
