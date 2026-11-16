import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { TopBar } from "./TopBar";
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

export const SignedIn: Story = {
  decorators: [withSession(signedInSession), withEnvironment(undefined)],
};

export const SignedOut: Story = {
  decorators: [withSession(anonymousSession), withEnvironment(undefined)],
};

export const DevelopmentBadge: Story = {
  decorators: [withSession(anonymousSession), withEnvironment("development")],
};

export const PreviewBadge: Story = {
  decorators: [withSession(anonymousSession), withEnvironment("preview")],
};

export const AlphaBadge: Story = {
  decorators: [withSession(signedInSession), withEnvironment("alpha")],
};
