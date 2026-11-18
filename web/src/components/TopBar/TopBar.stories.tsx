import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { createJSXDecorator } from "storybook-solidjs-vite";
import { TopBar } from "./TopBar";
import { ModalProvider } from "~/components/ModalManager/ModalManager";
import type {
  ContentIndex,
  IndexedChapter,
  IndexedLesson,
  IndexedUnit,
  LessonStatus,
} from "~/lib/content";
import {
  anonymousSession,
  signedInSession,
  withEnvironment,
  withSession,
} from "../../../.storybook/decorators";

const meta = {
  component: TopBar,
} satisfies Meta<typeof TopBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Fixed-width wrapper so the breakpoint behavior renders without a viewport addon. */
function phoneFrame(widthPx: number) {
  return createJSXDecorator((Story) => (
    <div
      style={{ width: `${widthPx}px`, "max-width": "100%" }}
      class="border border-background-offset"
    >
      <ModalProvider>
        <Story />
      </ModalProvider>
    </div>
  ));
}

const withModal = createJSXDecorator((Story) => (
  <ModalProvider>
    <Story />
  </ModalProvider>
));

export const SignedIn: Story = {
  decorators: [
    withSession(signedInSession),
    withEnvironment(undefined),
    withModal,
  ],
};

export const SignedOut: Story = {
  decorators: [
    withSession(anonymousSession),
    withEnvironment(undefined),
    withModal,
  ],
};

export const DevelopmentBadge: Story = {
  decorators: [
    withSession(anonymousSession),
    withEnvironment("development"),
    withModal,
  ],
};

export const PreviewBadge: Story = {
  decorators: [
    withSession(anonymousSession),
    withEnvironment("preview"),
    withModal,
  ],
};

export const AlphaBadge: Story = {
  decorators: [
    withSession(signedInSession),
    withEnvironment("alpha"),
    withModal,
  ],
};

// --- Mobile viewport variants -------------------------------------------

export const MobileSignedOut: Story = {
  name: "Mobile · signed out",
  decorators: [
    withSession(anonymousSession),
    withEnvironment(undefined),
    phoneFrame(390),
  ],
};

export const MobileSignedIn: Story = {
  name: "Mobile · signed in",
  decorators: [
    withSession(signedInSession),
    withEnvironment(undefined),
    phoneFrame(390),
  ],
};

// --- With breadcrumbs ---------------------------------------------------

function lesson(
  order: number,
  slug: string,
  title: string,
  status?: LessonStatus,
): IndexedLesson {
  return {
    id: slug,
    order,
    slug,
    title,
    kind: "reading",
    estMinutes: 5,
    difficulty: 1,
    importance: "essential",
    status,
    Body: () => null,
    markdown: "",
  };
}
function chapter(
  order: number,
  slug: string,
  title: string,
  lessons: IndexedLesson[],
): IndexedChapter {
  return { id: slug, order, slug, title, description: title, lessons };
}
function unit(
  order: number,
  slug: string,
  title: string,
  chapters: IndexedChapter[],
): IndexedUnit {
  return { id: slug, order, slug, title, blurb: title, chapters };
}
const unit1 = unit(1, "intro", "Intro", [
  chapter(1, "orientation", "Orientation", [
    lesson(1, "editor-tour", "Editor Tour", "done"),
    lesson(2, "why-java", "Why Java?", "in-progress"),
    lesson(3, "time-management", "Time Management"),
  ]),
]);
const index: ContentIndex = { units: [unit1], starters: {} };
const crumbs = {
  index,
  unit: unit1,
  chapter: unit1.chapters[0]!,
  lesson: unit1.chapters[0]!.lessons[1]!,
};

export const WithBreadcrumbs: Story = {
  args: { crumbs },
  decorators: [
    withSession(signedInSession),
    withEnvironment(undefined),
    withModal,
  ],
};

export const MobileWithBreadcrumbs: Story = {
  name: "Mobile · breadcrumbs on second row",
  args: { crumbs },
  decorators: [
    withSession(signedInSession),
    withEnvironment(undefined),
    phoneFrame(390),
  ],
};

export const NarrowPhoneWithBreadcrumbs: Story = {
  name: "Mobile (narrow) · breadcrumbs on second row",
  args: { crumbs },
  decorators: [
    withSession(anonymousSession),
    withEnvironment(undefined),
    phoneFrame(320),
  ],
};
