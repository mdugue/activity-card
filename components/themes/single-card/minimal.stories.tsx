import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ComponentProps } from "react";
import {
  SAMPLE_RIDE,
  SAMPLE_RUN,
  SAMPLE_TRI,
} from "@/components/app/sample-data";
import {
  type BackgroundArgs,
  backgroundArgTypes,
} from "../../../.storybook/backgrounds";
import { ThemeMinimal } from "./minimal";

const meta = {
  component: ThemeMinimal,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  argTypes: { ...backgroundArgTypes },
} satisfies Meta<ComponentProps<typeof ThemeMinimal> & BackgroundArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

// Minimal renders no text — pure route + elevation over the gradient fallback
// when no photo is supplied. The render itself is the assertion (it throws on a
// bad profile / route), so no play is needed.
export const NoPhoto: Story = { args: { data: SAMPLE_RUN } };
export const RideProfile: Story = { args: { data: SAMPLE_RIDE } };
export const Triathlon: Story = { args: { data: SAMPLE_TRI } };
