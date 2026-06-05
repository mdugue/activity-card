import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SAMPLE_RIDE, SAMPLE_RUN } from "@/components/app/sample-data";
import { ThemeMinimal } from "./minimal";

const meta = {
  component: ThemeMinimal,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ThemeMinimal>;

export default meta;
type Story = StoryObj<typeof meta>;

// Minimal renders no text — pure route + elevation over the gradient fallback
// when no photo is supplied. The render itself is the assertion (it throws on a
// bad profile / route), so no play is needed.
export const NoPhoto: Story = { args: { data: SAMPLE_RUN } };
export const RideProfile: Story = { args: { data: SAMPLE_RIDE } };
