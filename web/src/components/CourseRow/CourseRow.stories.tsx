import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { CourseRow } from "./CourseRow";
import type { MockChapter, MockCourse, MockLesson } from "~/lib/courses-mock";
import { mockCourses } from "~/lib/courses-mock";

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

const lesson = (overrides: Partial<MockLesson> = {}): MockLesson => ({
  id: crypto.randomUUID(),
  title: "A sample lesson",
  kind: "reading",
  estMinutes: 8,
  difficulty: 1,
  importance: "essential",
  ...overrides,
});

const chapter = (overrides: Partial<MockChapter> = {}): MockChapter => ({
  id: crypto.randomUUID(),
  title: "Sample chapter",
  description: "Short description of what this chapter covers.",
  lessons: [
    lesson({ title: "First lesson", kind: "reading", importance: "essential" }),
    lesson({ title: "Second lesson", kind: "java-sim", importance: "useful" }),
    lesson({ title: "Third lesson", kind: "quiz", importance: "niche" }),
  ],
  ...overrides,
});

const course = (overrides: Partial<MockCourse> = {}): MockCourse => ({
  id: crypto.randomUUID(),
  title: "Sample course",
  blurb: "A course used purely to verify layout.",
  chapters: [chapter()],
  ...overrides,
});

// A single chapter should fill the full width — the grid stays at one column
// even on wide viewports.
export const OneChapter: Story = {
  args: {
    course: course({
      title: "Single chapter course",
      chapters: [chapter({ title: "Only chapter" })],
    }),
  },
};

// Two chapters should snap to two columns at the md breakpoint.
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

// Odd chapter count — the trailing chapter should not stretch across both
// columns unless span=2 is set. This is the "stretches wrong" case to watch
// for.
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

// Four chapters — clean 2x2 packing.
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

// A full-width chapter via span=2 inside a multi-chapter course.
export const FullWidthChapter: Story = {
  args: {
    course: course({
      title: "Mixed span layout",
      chapters: [
        chapter({ title: "Normal left" }),
        chapter({ title: "Normal right" }),
        chapter({ title: "Full-width intro", span: 2 }),
        chapter({ title: "Normal left again" }),
        chapter({ title: "Normal right again" }),
      ],
    }),
  },
};

// Long lesson titles — whitespace-nowrap means these can force the column
// to grow. Watch for horizontal overflow or lopsided columns.
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
              title: "SparkMax, TalonFX, and friends (and why there are so many)",
              kind: "reading",
              importance: "useful",
            }),
            lesson({
              title: "Inversion and why your drivetrain goes backwards",
              kind: "java-sim",
            }),
            lesson({
              title: "Grouping motors on one side for a differential drive train",
              kind: "java-sim",
            }),
          ],
        }),
        chapter({
          title: "Driver input",
          lessons: [
            lesson({ title: "Joysticks vs. Xbox controllers", kind: "reading" }),
            lesson({
              title: "Deadzones and why they matter in competition",
              kind: "java-sim",
            }),
          ],
        }),
      ],
    }),
  },
};

// Every real course from the mock data, so visual regressions anywhere in
// the dataset show up in one place.
export const RealCourseIntroJava: Story = {
  args: { course: mockCourses.find((c) => c.id === "intro-to-java")! },
};

export const RealCourseTankDrive: Story = {
  args: { course: mockCourses.find((c) => c.id === "program-a-tank-drive")! },
};

export const RealCourseIntro: Story = {
  args: { course: mockCourses[0]! },
};
