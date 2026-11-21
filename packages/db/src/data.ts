export { requireAdmin } from "./data/guards";
export { requireUser } from "./data/session";
export { listUsers, readUserDetails, removeUser } from "./data/users";
export { readAdminStats } from "./data/stats";
export {
  summarizeSession,
  writeTheme,
  writeMonacoTheme,
  writeSystemPrompt,
  writeCodeSystemPrompt,
  writeTabSize,
  writeShowMarkdownCopy,
} from "./data/session";
export {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getOrCreateBoundProject,
  migrateProjectsOwner,
  detachAllBoundProjects,
} from "./data/projects";
export type {
  ProjectSummary,
  ProjectRecord,
  CreateProjectInput,
  UpdateProjectPatch,
} from "./data/projects";
export {
  saveQuizResult,
  listQuizResults,
  masteredQuestionIds,
  deleteAllQuizResults,
} from "./data/quizzes";
export type { StoredQuizResult, QuizResultRecord } from "./data/quizzes";
export {
  recordLessonStarted,
  listLessonsStarted,
  hasStartedLesson,
  disableAllLessonsStarted,
} from "./data/lesson-started";
export type { LessonStartedRecord } from "./data/lesson-started";
export {
  recordLessonFinished,
  listLessonsFinished,
  disableAllLessonsFinished,
} from "./data/lesson-finished";
export type { LessonFinishedRecord } from "./data/lesson-finished";
