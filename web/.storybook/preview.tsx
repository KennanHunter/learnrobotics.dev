import type { Preview } from "storybook-solidjs-vite";
import { withThemeByClassName } from "@storybook/addon-themes";
import "~/styles.css";
import "./preview.css";

const preview: Preview = {
  decorators: [
    withThemeByClassName({
      themes: { light: "light", dark: "dark" },
      defaultTheme: "light",
      parentSelector: "html",
    }),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: "todo",
    },
  },
};

export default preview;
