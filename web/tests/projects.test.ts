import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { getAuth, getDb, project, user } from "@learnrobotics/db/server";
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  migrateProjectsOwner,
  updateProject,
} from "@learnrobotics/db/data/projects";

async function anonUserId(): Promise<string> {
  const result = await getAuth().api.signInAnonymous({
    headers: new Headers(),
  });
  const id = result?.user.id;
  if (!id) throw new Error("failed to create anonymous user");
  return id;
}

describe("projects data layer", () => {
  it("createProject inserts a row and returns the full record", async () => {
    const userId = await anonUserId();
    const record = await createProject(userId, {
      title: "Hello",
      starterId: "intro-java",
      activeFile: "Main.java",
      files: { "Main.java": "class Main {}" },
    });
    expect(record.id).toBeTruthy();
    expect(record.title).toBe("Hello");
    expect(record.starterId).toBe("intro-java");
    expect(record.files).toEqual({ "Main.java": "class Main {}" });
    expect(record.createdAt).toBeGreaterThan(0);
    expect(record.updatedAt).toBe(record.createdAt);

    const persisted = await getDb().query.project.findFirst({
      where: eq(project.id, record.id),
    });
    expect(persisted).toBeDefined();
    expect(persisted?.files).toEqual({ "Main.java": "class Main {}" });
  });

  it("listProjects returns summaries newest-first, without files", async () => {
    const userId = await anonUserId();
    const first = await createProject(userId, {
      title: "A",
      activeFile: "a.java",
      files: { "a.java": "// a" },
    });
    // Timestamps are stored at seconds precision; sleep past the second
    // boundary so the two rows have distinct updatedAt values.
    await new Promise((r) => setTimeout(r, 1100));
    const second = await createProject(userId, {
      title: "B",
      activeFile: "b.java",
      files: { "b.java": "// b" },
    });

    const rows = await listProjects(userId);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.id).toBe(second.id);
    expect(rows[1]!.id).toBe(first.id);
    expect(rows[0]).not.toHaveProperty("files");
  });

  it("getProject enforces ownership (returns null for other users' projects)", async () => {
    const ownerId = await anonUserId();
    const otherId = await anonUserId();
    const record = await createProject(ownerId, {
      title: "Private",
      activeFile: "x.java",
      files: { "x.java": "" },
    });

    expect(await getProject(ownerId, record.id)).not.toBeNull();
    expect(await getProject(otherId, record.id)).toBeNull();
    expect(await getProject(ownerId, "does-not-exist")).toBeNull();
  });

  it("updateProject by a non-owner is a no-op (returns null)", async () => {
    const ownerId = await anonUserId();
    const otherId = await anonUserId();
    const record = await createProject(ownerId, {
      title: "original",
      activeFile: "x.java",
      files: { "x.java": "v1" },
    });

    const noop = await updateProject(otherId, record.id, { title: "stolen" });
    expect(noop).toBeNull();

    const after = await getProject(ownerId, record.id);
    expect(after?.title).toBe("original");
    expect(after?.files["x.java"]).toBe("v1");
  });

  it("updateProject by owner applies partial patches and bumps updatedAt", async () => {
    const userId = await anonUserId();
    const record = await createProject(userId, {
      title: "t",
      activeFile: "a.java",
      files: { "a.java": "v1", "b.java": "bb" },
    });
    // Timestamps are stored at seconds precision; sleep past the second
    // boundary so the updatedAt bump is observable.
    await new Promise((r) => setTimeout(r, 1100));

    const updated = await updateProject(userId, record.id, {
      files: { "a.java": "v2", "b.java": "bb" },
    });
    expect(updated).not.toBeNull();
    expect(updated!.files["a.java"]).toBe("v2");
    expect(updated!.title).toBe("t");
    expect(updated!.updatedAt).toBeGreaterThan(record.updatedAt);
  });

  it("deleteProject by owner removes the row; by non-owner is a no-op", async () => {
    const ownerId = await anonUserId();
    const otherId = await anonUserId();
    const record = await createProject(ownerId, {
      title: "doomed",
      activeFile: "x.java",
      files: { "x.java": "" },
    });

    expect(await deleteProject(otherId, record.id)).toBe(false);
    expect(await getProject(ownerId, record.id)).not.toBeNull();

    expect(await deleteProject(ownerId, record.id)).toBe(true);
    expect(await getProject(ownerId, record.id)).toBeNull();
  });

  it("migrateProjectsOwner reassigns rows and is idempotent", async () => {
    const fromId = await anonUserId();
    const toId = await anonUserId();
    await createProject(fromId, {
      title: "p1",
      activeFile: "a.java",
      files: { "a.java": "" },
    });
    await createProject(fromId, {
      title: "p2",
      activeFile: "b.java",
      files: { "b.java": "" },
    });

    const moved = await migrateProjectsOwner(fromId, toId);
    expect(moved).toBe(2);
    expect(await listProjects(fromId)).toHaveLength(0);
    expect(await listProjects(toId)).toHaveLength(2);

    // Second run has nothing left to move.
    expect(await migrateProjectsOwner(fromId, toId)).toBe(0);
  });

  it("deleting a user cascades to their projects", async () => {
    const userId = await anonUserId();
    await createProject(userId, {
      title: "ephemeral",
      activeFile: "x.java",
      files: { "x.java": "" },
    });
    expect(await listProjects(userId)).toHaveLength(1);

    await getDb().delete(user).where(eq(user.id, userId));

    const remaining = await getDb()
      .select()
      .from(project)
      .where(eq(project.userId, userId));
    expect(remaining).toHaveLength(0);
  });
});
