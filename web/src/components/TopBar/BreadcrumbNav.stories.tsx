import type { Meta, StoryObj } from "storybook-solidjs-vite";
import {
  BreadcrumbNav,
  BreadcrumbPanel,
  type BreadcrumbCrumbs,
} from "./BreadcrumbNav";
import { ModalProvider } from "~/components/ModalManager/ModalManager";
import type {
  ContentIndex,
  IndexedChapter,
  IndexedLesson,
  IndexedUnit,
  LessonStatus,
} from "~/lib/content";
import {
  withEnvironment,
  withSession,
  anonymousSession,
} from "../../../.storybook/decorators";

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
  return {
    id: slug,
    order,
    slug,
    title,
    description: `${title} chapter`,
    lessons,
  };
}

function unit(
  order: number,
  slug: string,
  title: string,
  chapters: IndexedChapter[],
): IndexedUnit {
  return {
    id: slug,
    order,
    slug,
    title,
    blurb: `${title} unit`,
    chapters,
  };
}

const unit1 = unit(1, "intro-to-learnrobotics", "Intro", [
  chapter(1, "orientation", "Orientation", [
    lesson(1, "editor-tour", "Editor Tour", "done"),
    lesson(2, "why-java", "Why Java?", "done"),
    lesson(3, "time-management", "Time Management", "in-progress"),
    lesson(4, "why-no-robot", "Why no robot?"),
    lesson(5, "why-by-hand", "Why by hand?"),
  ]),
]);

const unit2 = unit(2, "intro-to-java", "Intro to Java", [
  chapter(1, "hello-java", "Hello Java", [
    lesson(1, "java-history", "Java History", "done"),
    lesson(2, "syntax", "Syntax"),
    lesson(3, "printing", "Printing"),
    lesson(4, "comments", "Comments"),
    lesson(5, "naming", "Naming"),
    lesson(6, "hello-java-quiz", "Quiz"),
  ]),
  chapter(2, "variables", "Variables", [
    lesson(1, "variables", "Variables"),
    lesson(2, "constants", "Constants"),
    lesson(3, "casting", "Casting"),
    lesson(4, "variables-quiz", "Quiz"),
  ]),
  chapter(3, "math", "Math", [
    lesson(1, "math", "Math"),
    lesson(2, "operators", "Operators"),
  ]),
]);

const unit3 = unit(
  3,
  "control-flow",
  "Control Flow",
  Array.from({ length: 4 }, (_, i) =>
    chapter(i + 1, `ch${i + 1}`, `Chapter ${i + 1}`, [
      lesson(1, `l1-${i}`, "Intro"),
      lesson(2, `l2-${i}`, "Example"),
      lesson(3, `l3-${i}`, "Quiz"),
    ]),
  ),
);

const index: ContentIndex = {
  units: [unit1, unit2, unit3],
  starters: {},
};

const crumbs: BreadcrumbCrumbs = {
  index,
  unit: unit1,
  chapter: unit1.chapters[0]!,
  lesson: unit1.chapters[0]!.lessons[2]!,
};

const meta = {
  title: "Components/BreadcrumbNav",
  component: BreadcrumbNav,
  parameters: { layout: "fullscreen" },
  decorators: [withSession(anonymousSession), withEnvironment(undefined)],
} satisfies Meta<typeof BreadcrumbNav>;

export default meta;
type Story = StoryObj<typeof meta>;

function Shell(props: { children: any }) {
  return (
    <ModalProvider>
      <div
        class="flex items-center justify-end border-b border-background-offset bg-background px-4 py-3"
        style={{ height: "3.5rem" }}
      >
        {props.children}
      </div>
      <div class="p-6 text-sm text-foreground-muted">
        Lesson content here. Click the breadcrumb to open the mega-menu — it
        lands over this region, not the top bar.
      </div>
    </ModalProvider>
  );
}

export const Default: Story = {
  render: () => (
    <Shell>
      <BreadcrumbNav crumbs={crumbs} />
    </Shell>
  ),
};

export const DeepUnit: Story = {
  render: () => (
    <Shell>
      <BreadcrumbNav
        crumbs={{
          index,
          unit: unit2,
          chapter: unit2.chapters[2]!,
          lesson: unit2.chapters[2]!.lessons[1]!,
        }}
      />
    </Shell>
  ),
};

export const LongTitles: Story = {
  render: () => {
    const longUnit = unit(
      4,
      "long",
      "A particularly long unit title that will probably wrap",
      [
        chapter(
          1,
          "ch",
          "This chapter title is also quite long for layout testing",
          [
            lesson(
              1,
              "lesson",
              "And the lesson title is comically long so you can see what happens",
            ),
          ],
        ),
      ],
    );
    const longIndex: ContentIndex = { units: [longUnit], starters: {} };
    return (
      <Shell>
        <BreadcrumbNav
          crumbs={{
            index: longIndex,
            unit: longUnit,
            chapter: longUnit.chapters[0]!,
            lesson: longUnit.chapters[0]!.lessons[0]!,
          }}
        />
      </Shell>
    );
  },
};

/** The panel rendered inline (not via the modal) for layout work. */
export const PanelInline: StoryObj = {
  render: () => (
    <div class="h-[32rem] rounded border border-background-offset/60 bg-background">
      <BreadcrumbPanel crumbs={crumbs} onNavigate={() => {}} />
    </div>
  ),
};

export const MobileInline: Story = {
  name: "Mobile · panel inline (narrow)",
  render: () => (
    <div
      style={{ width: "390px", "max-width": "100%" }}
      class="border border-background-offset"
    >
      <div class="h-[28rem]">
        <BreadcrumbPanel crumbs={crumbs} onNavigate={() => {}} />
      </div>
    </div>
  ),
};

export const MobileHost: Story = {
  name: "Mobile · opened over host",
  render: () => (
    <div
      style={{ width: "390px", "max-width": "100%" }}
      class="border border-background-offset"
    >
      <ModalProvider>
        <div
          class="flex items-center justify-end border-b border-background-offset bg-background px-4 py-3"
          style={{ height: "3.5rem" }}
        >
          <BreadcrumbNav crumbs={crumbs} />
        </div>
        <div class="p-4 text-xs text-foreground-muted">
          Tap the breadcrumb to open the mega-menu. On narrow widths the panel
          stacks Unit → Chapter → Lesson in a single column.
        </div>
      </ModalProvider>
    </div>
  ),
};

/** All lessons marked done — verifies progress bars max out. */
export const AllDone: Story = {
  render: () => {
    const allDone = (u: IndexedUnit): IndexedUnit => ({
      ...u,
      chapters: u.chapters.map((c) => ({
        ...c,
        lessons: c.lessons.map((l) => ({ ...l, status: "done" as const })),
      })),
    });
    const doneIndex: ContentIndex = {
      units: [allDone(unit1), allDone(unit2)],
      starters: {},
    };
    return (
      <Shell>
        <BreadcrumbNav
          crumbs={{
            index: doneIndex,
            unit: doneIndex.units[0]!,
            chapter: doneIndex.units[0]!.chapters[0]!,
            lesson: doneIndex.units[0]!.chapters[0]!.lessons[0]!,
          }}
        />
      </Shell>
    );
  },
};
