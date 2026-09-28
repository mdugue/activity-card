import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  addons: [
    "@chromatic-com/storybook",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-mcp",
  ],
  framework: "@storybook/nextjs-vite",
  staticDirs: ["../public"],
  stories: [
    "../components/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    "../theme/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],
};
export default config;
