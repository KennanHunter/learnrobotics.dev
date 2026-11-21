import { createServerFn } from "@tanstack/solid-start";
import * as v from "valibot";
import {
  createProject,
  deleteProject,
  getOrCreateBoundProject,
  getProject,
  listProjects,
  requireUser,
  updateProject,
} from "@learnrobotics/db/data";
import type { ProjectRecord, ProjectSummary } from "@learnrobotics/db";
import { logger } from "~/lib/logger";

const log = logger.child({ scope: "projects" });

const MAX_FILES_BYTES = 512 * 1024;

const FilesSchema = v.pipe(
  v.record(v.pipe(v.string(), v.minLength(1), v.maxLength(500)), v.string()),
  v.check((files) => {
    try {
      return JSON.stringify(files).length <= MAX_FILES_BYTES;
    } catch {
      return false;
    }
  }, "files exceed 512 KB"),
);

const TitleSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(200));
const ActiveFileSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(500));
const StarterIdSchema = v.pipe(v.string(), v.maxLength(200));
const IdSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(64));

const GetProjectSchema = v.object({ id: IdSchema });

const BindingKeySchema = v.pipe(v.string(), v.minLength(1), v.maxLength(200));

const CreateProjectSchema = v.object({
  title: TitleSchema,
  starterId: v.optional(v.nullable(StarterIdSchema)),
  bindingKey: v.optional(v.nullable(BindingKeySchema)),
  activeFile: ActiveFileSchema,
  files: FilesSchema,
});

const EnsureBoundProjectSchema = v.object({
  bindingKey: BindingKeySchema,
  seed: v.object({
    title: TitleSchema,
    starterId: v.optional(v.nullable(StarterIdSchema)),
    activeFile: ActiveFileSchema,
    files: FilesSchema,
  }),
});

const UpdateProjectSchema = v.object({
  id: IdSchema,
  patch: v.object({
    title: v.optional(TitleSchema),
    activeFile: v.optional(ActiveFileSchema),
    files: v.optional(FilesSchema),
  }),
});

const DeleteProjectSchema = v.object({ id: IdSchema });

export const listUserProjects = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProjectSummary[]> => {
    const user = await requireUser();
    return listProjects(user.id);
  },
);

export const getUserProject = createServerFn({ method: "GET" })
  .validator((data: unknown) => v.parse(GetProjectSchema, data))
  .handler(async ({ data }): Promise<ProjectRecord | null> => {
    const user = await requireUser();
    return getProject(user.id, data.id);
  });

export const createUserProject = createServerFn({ method: "POST" })
  .validator((data: unknown) => v.parse(CreateProjectSchema, data))
  .handler(async ({ data }): Promise<ProjectRecord> => {
    const user = await requireUser();
    log.info(
      { userId: user.id, starterId: data.starterId ?? null },
      "createUserProject",
    );
    return createProject(user.id, {
      title: data.title,
      starterId: data.starterId ?? null,
      bindingKey: data.bindingKey ?? null,
      activeFile: data.activeFile,
      files: data.files,
    });
  });

export const ensureUserBoundProject = createServerFn({ method: "POST" })
  .validator((data: unknown) => v.parse(EnsureBoundProjectSchema, data))
  .handler(async ({ data }): Promise<ProjectRecord> => {
    const user = await requireUser();
    return getOrCreateBoundProject(user.id, data.bindingKey, {
      title: data.seed.title,
      starterId: data.seed.starterId ?? null,
      activeFile: data.seed.activeFile,
      files: data.seed.files,
    });
  });

export const updateUserProject = createServerFn({ method: "POST" })
  .validator((data: unknown) => v.parse(UpdateProjectSchema, data))
  .handler(async ({ data }): Promise<ProjectRecord> => {
    const user = await requireUser();
    const updated = await updateProject(user.id, data.id, data.patch);
    if (!updated) {
      log.warn(
        { userId: user.id, projectId: data.id },
        "updateUserProject: not found",
      );
      throw new Error("Project not found");
    }
    return updated;
  });

export const deleteUserProject = createServerFn({ method: "POST" })
  .validator((data: unknown) => v.parse(DeleteProjectSchema, data))
  .handler(async ({ data }) => {
    const user = await requireUser();
    const ok = await deleteProject(user.id, data.id);
    if (!ok) {
      log.warn(
        { userId: user.id, projectId: data.id },
        "deleteUserProject: not found",
      );
      throw new Error("Project not found");
    }
    return { ok: true as const };
  });
