import { createServerFn } from "@tanstack/solid-start";
import * as v from "valibot";
import {
  listUsers,
  readAdminStats,
  readUserDetails,
  removeUser,
  requireAdmin,
} from "@learnrobotics/db/data";
import type {
  AdminUserDetails,
  UsersPage,
  AdminStats,
} from "@learnrobotics/db";
import { logger } from "~/lib/logger";

const log = logger.child({ scope: "admin" });

const ListUsersPageSchema = v.object({
  start: v.pipe(v.number(), v.integer(), v.minValue(0)),
  count: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(200)),
  query: v.optional(v.pipe(v.string(), v.maxLength(200))),
});

export const listUsersPage = createServerFn({ method: "GET" })
  .validator((data: unknown) => v.parse(ListUsersPageSchema, data))
  .handler(async ({ data }): Promise<UsersPage> => {
    await requireAdmin();
    return listUsers(data);
  });

const GetUserDetailsSchema = v.object({
  userId: v.pipe(v.string(), v.minLength(1)),
});

export const getUserDetails = createServerFn({ method: "GET" })
  .validator((data: unknown) => v.parse(GetUserDetailsSchema, data))
  .handler(async ({ data }): Promise<AdminUserDetails> => {
    await requireAdmin();
    return readUserDetails(data.userId);
  });

const DeleteUserSchema = v.object({
  userId: v.pipe(v.string(), v.minLength(1)),
});

export const deleteUser = createServerFn({ method: "POST" })
  .validator((data: unknown) => v.parse(DeleteUserSchema, data))
  .handler(async ({ data }) => {
    const adminUserId = await requireAdmin();
    if (data.userId === adminUserId) {
      log.warn({ userId: data.userId }, "deleteUser: refusing self-delete");
      throw new Error("Cannot delete yourself");
    }
    log.info({ userId: data.userId }, "deleteUser");
    await removeUser(data.userId);
    return { ok: true as const };
  });

export const getAdminStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminStats> => {
    await requireAdmin();
    const stats = await readAdminStats();
    log.debug(stats, "getAdminStats");
    return stats;
  },
);
