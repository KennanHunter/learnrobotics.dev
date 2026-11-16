import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { TopBar } from "./TopBar";
import {
  anonymousSession,
  signedInSession,
  withSession,
} from "../../../.storybook/decorators";

const meta = {
  component: TopBar,
} satisfies Meta<typeof TopBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SignedIn: Story = {
  decorators: [withSession(signedInSession)],
};

export const SignedOut: Story = {
  decorators: [withSession(anonymousSession)],
};
