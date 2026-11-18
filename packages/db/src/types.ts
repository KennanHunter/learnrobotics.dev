import type {
  user,
  session,
  account,
  userConfig,
  verification,
  project,
} from "./schema";

export type User = typeof user.$inferSelect;
export type UserInsert = typeof user.$inferInsert;

export type Session = typeof session.$inferSelect;
export type SessionInsert = typeof session.$inferInsert;

export type Account = typeof account.$inferSelect;
export type AccountInsert = typeof account.$inferInsert;

export type UserConfig = typeof userConfig.$inferSelect;
export type UserConfigInsert = typeof userConfig.$inferInsert;

export type Verification = typeof verification.$inferSelect;
export type VerificationInsert = typeof verification.$inferInsert;

export type ProjectRow = typeof project.$inferSelect;
export type ProjectRowInsert = typeof project.$inferInsert;

export type { SessionSummary, Theme } from "./data/session";
export type {
  AdminUser,
  AdminUserDetails,
  UsersPage,
  ListUsersParams,
} from "./data/users";
export type { AdminStats } from "./data/stats";
export type {
  ProjectSummary,
  ProjectRecord,
  CreateProjectInput,
  UpdateProjectPatch,
} from "./data/projects";
export type { Db } from "./client";
