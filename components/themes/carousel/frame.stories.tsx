import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ComponentProps } from "react";
import { SAMPLE_BRICK, SAMPLE_RIDE } from "@/components/app/sample-data";
import {
  type BackgroundArgs,
  backgroundArgTypes,
} from "../../../.storybook/backgrounds";
import { CarouselDeck } from "./deck";
import { carouselArgs } from "./story-support";

// Frame — ultra-minimal, type-led: one big datum + its sparkline per slide
// between hairline rules, four beats. No spanning signature and no veil; the
// panels protect their own text with shadows.
const meta = {
  component: CarouselDeck,
  title: "Carousel/Frame",
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  argTypes: { ...backgroundArgTypes },
  args: { data: SAMPLE_RIDE, ...carouselArgs("frame") },
} satisfies Meta<ComponentProps<typeof CarouselDeck> & BackgroundArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Brick: Story = { args: { data: SAMPLE_BRICK } };
