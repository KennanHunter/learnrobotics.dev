import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { CourseRow } from "./CourseRow";
import type { IndexedChapter, IndexedLesson, IndexedUnit } from "~/lib/content";
import { getContentIndex } from "~/lib/content";
import { baseLocale } from "~/paraglide/runtime";

const contentIndex = getContentIndex(baseLocale);

const meta = {
  component: CourseRow,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <div class="mx-auto max-w-6xl px-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CourseRow>;

export default meta;
type Story = StoryObj<typeof meta>;

const lesson = (overrides: Partial<IndexedLesson> = {}): IndexedLesson =>
  ({
    id: crypto.randomUUID(),
    order: 1,
    slug: "sample",
    title: "A sample lesson",
    kind: "reading",
    estMinutes: 8,
    difficulty: 1,
    importance: "essential",
    ...overrides,
  }) as IndexedLesson;

const chapter = (overrides: Partial<IndexedChapter> = {}): IndexedChapter => ({
  id: crypto.randomUUID(),
  order: 1,
  slug: "sample",
  title: "Sample chapter",
  description: "Short description of what this chapter covers.",
  lessons: [
    lesson({ title: "First lesson", kind: "reading", importance: "essential" }),
    lesson({ title: "Second lesson", kind: "sim", importance: "useful" }),
    lesson({ title: "Third lesson", kind: "quiz", importance: "niche" }),
  ],
  ...overrides,
});

const course = (overrides: Partial<IndexedUnit> = {}): IndexedUnit => ({
  id: crypto.randomUUID(),
  order: 1,
  slug: "sample",
  title: "Sample course",
  blurb: "A course used purely to verify layout.",
  chapters: [chapter()],
  ...overrides,
});

export const OneChapter: Story = {
  args: {
    course: course({
      title: "Single chapter course",
      chapters: [chapter({ title: "Only chapter" })],
    }),
  },
};

export const TwoChapters: Story = {
  args: {
    course: course({
      title: "Two chapters",
      chapters: [
        chapter({ title: "Motors" }),
        chapter({ title: "Driver input" }),
      ],
    }),
  },
};

export const ThreeChapters: Story = {
  args: {
    course: course({
      title: "Three chapters (odd)",
      chapters: [
        chapter({ title: "Chapter one" }),
        chapter({ title: "Chapter two" }),
        chapter({ title: "Chapter three" }),
      ],
    }),
  },
};

export const FourChapters: Story = {
  args: {
    course: course({
      title: "Four chapters",
      chapters: [
        chapter({ title: "Chapter one" }),
        chapter({ title: "Chapter two" }),
        chapter({ title: "Chapter three" }),
        chapter({ title: "Chapter four" }),
      ],
    }),
  },
};

export const LongLessonTitles: Story = {
  args: {
    course: course({
      title: "Long titles stress test",
      chapters: [
        chapter({
          title: "Motors",
          lessons: [
            lesson({ title: "Motor controllers, briefly", kind: "reading" }),
            lesson({
              title:
                "SparkMax, TalonFX, and friends (and why there are so many)",
              kind: "reading",
              importance: "useful",
            }),
            lesson({
              title: "Inversion and why your drivetrain goes backwards",
              kind: "sim",
            }),
            lesson({
              title:
                "Grouping motors on one side for a differential drive train",
              kind: "sim",
            }),
          ],
        }),
        chapter({
          title: "Driver input",
          lessons: [
            lesson({
              title: "Joysticks vs. Xbox controllers",
              kind: "reading",
            }),
            lesson({
              title: "Deadzones and why they matter in competition",
              kind: "sim",
            }),
          ],
        }),
      ],
    }),
  },
};

export const RealCourseIntroJava: Story = {
  args: { course: contentIndex.units.find((c) => c.id === "intro-to-java")! },
};

export const RealCourseIntro: Story = {
  args: { course: contentIndex.units[0]! },
};
