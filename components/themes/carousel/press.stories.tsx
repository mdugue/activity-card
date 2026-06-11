import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ComponentProps } from "react";
import { SAMPLE_BRICK, SAMPLE_RIDE } from "@/components/app/sample-data";
import {
  type BackgroundArgs,
  backgroundArgTypes,
} from "../../../.storybook/backgrounds";
import { CarouselDeck } from "./deck";
import { carouselArgs } from "./story-support";

// Press — editorial broadsheet: masthead + serif headline with a drop cap, stat
// pull-quotes, print-style route/altitude cuts, a closing byline. Type-led, so
// no spanning signature and no veil — text sits in opaque "clipping" boxes.
const meta = {
  component: CarouselDeck,
  title: "Carousel/Press",
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  argTypes: { ...backgroundArgTypes },
  args: { data: SAMPLE_RIDE, ...carouselArgs("press") },
} satisfies Meta<ComponentProps<typeof CarouselDeck> & BackgroundArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Brick: Story = { args: { data: SAMPLE_BRICK } };
