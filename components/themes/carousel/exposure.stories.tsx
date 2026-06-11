import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ComponentProps } from "react";
import {
  SAMPLE_BRICK,
  SAMPLE_RIDE,
  SAMPLE_TRI,
} from "@/components/app/sample-data";
import {
  type BackgroundArgs,
  backgroundArgTypes,
} from "../../../.storybook/backgrounds";
import { CarouselDeck } from "./deck";
import { carouselArgs } from "./story-support";

// Exposure — no spanning signature: the full-bleed photo is the hero, with a
// magazine masthead and the route + elevation as small detail graphics. Defaults
// to the photo-derived palette, so pick a Background to see it come alive.
const meta = {
  component: CarouselDeck,
  title: "Carousel/Exposure",
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  argTypes: { ...backgroundArgTypes },
  args: { data: SAMPLE_RIDE, ...carouselArgs("exposure") },
} satisfies Meta<ComponentProps<typeof CarouselDeck> & BackgroundArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Triathlon: Story = { args: { data: SAMPLE_TRI } };
export const Brick: Story = { args: { data: SAMPLE_BRICK } };
