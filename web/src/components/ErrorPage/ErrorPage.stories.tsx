import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { ErrorPage } from "./ErrorPage";

const meta = {
  component: ErrorPage,
} satisfies Meta<typeof ErrorPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotFound: Story = {
  args: {
    code: "404",
    title: "Page not found",
    message: "The page you were looking for doesn't exist.",
  },
};

export const ServerError: Story = {
  args: {
    code: "500",
    title: "Something went wrong",
    message: "An unexpected error occurred. Please try again later.",
    detail: "Error: ECONNREFUSED at /api/v1/robots",
  },
};
