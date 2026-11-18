export { getDb, type Db } from "./client";
export { getAuth } from "./auth";
export { getDbEnv, type DbBindings } from "./env";

export * as schema from "./schema";
export {
  user,
  session,
  account,
  userConfig,
  verification,
  project,
} from "./schema";

export type {
  User,
  UserInsert,
  Session,
  SessionInsert,
  Account,
  AccountInsert,
  UserConfig,
  UserConfigInsert,
  Verification,
  VerificationInsert,
  SessionSummary,
  Theme,
  AdminUser,
  AdminUserDetails,
  UsersPage,
  ListUsersParams,
  AdminStats,
  ProjectRow,
  ProjectRowInsert,
  ProjectSummary,
  ProjectRecord,
  CreateProjectInput,
  UpdateProjectPatch,
} from "./types";
