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

// Ascent — the elevation profile is the spanning signature, a mountain-range
// portrait along the bottom of the strip at first light (Dawn) or after dark
// (Dusk) via the ATMOSPHERE param. The elevation viz follows the
// (user-adjustable) accent.
const meta = {
  component: CarouselDeck,
  title: "Carousel/Ascent",
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  argTypes: { ...backgroundArgTypes },
  args: { data: SAMPLE_RIDE, ...carouselArgs("ascent") },
} satisfies Meta<ComponentProps<typeof CarouselDeck> & BackgroundArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Dawn: Story = {};
// The ATMOSPHERE param swaps the deck onto the dusk look (palette + type).
export const Dusk: Story = { args: { config: { atmosphere: "dusk" } } };

// Multi-activity project: each leg's profile lays side by side on a shared,
// distance-weighted scale in the elevation signature.
export const DawnTriathlon: Story = { args: { data: SAMPLE_TRI } };
export const DawnBrick: Story = { args: { data: SAMPLE_BRICK } };
