import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { ProfileMenu } from "./ProfileMenu";
import {
  anonymousSession,
  signedInSession,
  withSession,
} from "../../../.storybook/decorators";

const meta = {
  component: ProfileMenu,
} satisfies Meta<typeof ProfileMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SignedIn: Story = {
  decorators: [withSession(signedInSession)],
};

export const SignedInNoAvatar: Story = {
  decorators: [withSession({ ...signedInSession!, image: null })],
};

export const Anonymous: Story = {
  decorators: [withSession(anonymousSession)],
};
