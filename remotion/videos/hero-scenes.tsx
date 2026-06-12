// The hero's scenes, shared by the landscape (Hero) and portrait
// (HeroVertical) cuts — every scene reads the canvas from useVideoConfig and
// lays itself out for either orientation. Cards and carousels are the real
// theme components fed with the app's sample fixtures; nothing is mocked.

import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  SAMPLE_RIDE,
  SAMPLE_RUN,
  SAMPLE_SWIM,
} from "@/components/app/sample-data";
import type { ThemeId } from "@/components/themes";
import { CarouselDeck } from "@/components/themes/carousel/deck";
import { CAROUSEL_THEMES } from "@/components/themes/carousel/registry";
import { carouselArgs } from "@/components/themes/carousel/story-support";
import type { ColorScheme } from "@/lib/colors";
import { Backdrop } from "../components/backdrop";
import { BrowserFrame } from "../components/browser-frame";
import { Caption } from "../components/caption";
import { CardScaled, StripPan } from "../components/card-showcase";
import { KineticTitle } from "../components/kinetic-title";
import { LogoSting } from "../components/logo-sting";
import { PreloadImg } from "../components/preload-img";
import { RiseIn } from "../components/rise-in";
import { RouteDraw } from "../components/route-draw";
import { FileChip, PaletteChip, Pill } from "../components/stat-chip";
import { ThemeCard } from "../components/theme-card";
import { VideoFrame } from "../components/video-frame";
import {
  DUR,
  EASE_PANEL,
  FONT,
  PAPER_DIM,
  RUST,
  SAFE,
  SPACE,
  TYPE,
} from "../design/tokens";

const RIDE_PHOTO = "images/ride.jpg";
const DUNES_PHOTO = "images/dunes.webp";
// Natural size of dunes.webp, measured once — the carousel sizes its
// panorama against it (the app measures live; renders need a constant).
const DUNES_SIZE = { h: 2400, w: 1600 };

function usePortrait(): boolean {
  const { height, width } = useVideoConfig();
  return height > width;
}

/* ───────────── 1 · Hook — the route is the art ───────────── */

export function HookScene() {
  const { height, width } = useVideoConfig();
  const portrait = usePortrait();
  return (
    <VideoFrame>
      <Backdrop grain variant="ink" />
      <AbsoluteFill
        style={{ alignItems: "center", justifyContent: "center", opacity: 0.4 }}
      >
        <RouteDraw
          coords={SAMPLE_RIDE.routeCoordinates}
          durationInFrames={55}
          height={height * 0.72}
          stroke={RUST}
          strokeWidth={8}
          width={width * 0.78}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <KineticTitle
          delay={18}
          lines={[{ text: "You put in" }, { text: "the effort." }]}
          size={portrait ? TYPE.claim * 0.86 : TYPE.claim}
        />
      </AbsoluteFill>
    </VideoFrame>
  );
}

/* ───────────── 2 · Problem — deliberately off-brand stats ───────────── */

// A drab stats screen in cold slate — the one thing in the system allowed to
// look generic, because that's the point.
function DrabStats() {
  const rows = [
    ["Distance", "82.4 km"],
    ["Moving time", "3:21:08"],
    ["Avg speed", "24.5 km/h"],
    ["Elevation", "1,240 m"],
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: "#17191c", padding: 44 }}>
      <div
        style={{
          color: "#aeb4bb",
          fontFamily: "system-ui, sans-serif",
          fontSize: 30,
          fontWeight: 600,
          marginBottom: 30,
        }}
      >
        Sunday Activity
      </div>
      {rows.map(([label, value]) => (
        <div
          key={label}
          style={{
            alignItems: "center",
            borderTop: "1px solid #24272b",
            color: "#878d94",
            display: "flex",
            fontFamily: "system-ui, sans-serif",
            fontSize: 26,
            justifyContent: "space-between",
            paddingBottom: 22,
            paddingTop: 22,
          }}
        >
          <span>{label}</span>
          <span style={{ color: "#aeb4bb", fontWeight: 600 }}>{value}</span>
        </div>
      ))}
    </AbsoluteFill>
  );
}

export function ProblemScene() {
  const frame = useCurrentFrame();
  const { height, width } = useVideoConfig();
  const portrait = usePortrait();
  const zoom = interpolate(frame, [0, 130], [1, 1.04], {
    extrapolateRight: "clamp",
  });
  const frameW = portrait ? width * 0.84 : width * 0.56;
  const frameH = portrait ? height * 0.38 : height * 0.56;
  return (
    <VideoFrame>
      <Backdrop variant="ink" />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: height * 0.12,
        }}
      >
        <RiseIn delay={4} style={{ transform: `scale(${zoom})` }}>
          <BrowserFrame
            label="any stats app"
            style={{ filter: "saturate(0.7)", height: frameH, width: frameW }}
          >
            <DrabStats />
          </BrowserFrame>
        </RiseIn>
      </AbsoluteFill>
      <Caption
        delay={26}
        label="Sound familiar?"
        position="bottom-center"
        text="Your effort deserves more than plain statistics."
      />
    </VideoFrame>
  );
}

/* ───────────── 3 · Ingest — drop a file, or pull from Strava ───────────── */

export function IngestScene() {
  const { height } = useVideoConfig();
  const portrait = usePortrait();
  return (
    <VideoFrame>
      <Backdrop grain variant="ink" />
      <AbsoluteFill
        style={{
          alignItems: "center",
          gap: SPACE.md,
          flexDirection: portrait ? "column" : "row",
          justifyContent: "center",
          paddingBottom: height * 0.1,
        }}
      >
        <RiseIn delay={6}>
          <FileChip label="sunday-ride.gpx" scale={portrait ? 1 : 1.15} />
        </RiseIn>
        <RiseIn delay={14}>
          <span
            style={{
              color: PAPER_DIM,
              fontFamily: FONT.mono,
              fontSize: TYPE.caption,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            or
          </span>
        </RiseIn>
        <RiseIn delay={20}>
          <Img
            src={staticFile("strava/btn-connect-with-strava-orange.svg")}
            style={{ display: "block", height: portrait ? 72 : 84 }}
          />
        </RiseIn>
      </AbsoluteFill>
      <Caption
        delay={30}
        label="Drop your effort"
        position="bottom-center"
        text="A ride, run, or swim — GPX, .fit, or straight from Strava."
      />
    </VideoFrame>
  );
}

/* ───────────── 4 · Reveal — the card, instantly ───────────── */

export function CardRevealScene() {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const portrait = usePortrait();
  const settle = interpolate(frame, [0, 26], [1.05, 1], {
    easing: EASE_PANEL,
    extrapolateRight: "clamp",
  });
  return (
    <VideoFrame>
      <Backdrop grain variant="ink" />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: portrait ? height * 0.1 : height * 0.14,
        }}
      >
        <div style={{ transform: `scale(${settle})` }}>
          <CardScaled height={height * (portrait ? 0.56 : 0.68)}>
            <ThemeCard data={SAMPLE_RIDE} id="path" />
          </CardScaled>
        </div>
      </AbsoluteFill>
      <Caption
        delay={20}
        label="Instant"
        position="bottom-center"
        text="A share-ready card — route, numbers, and all."
      />
    </VideoFrame>
  );
}

/* ───────────── 5 · Montage — themes ───────────── */

const MONTAGE_THEMES: { id: ThemeId; label: string }[] = [
  { id: "altitude", label: "Altitude" },
  { id: "strata", label: "Strata" },
  { id: "editorial", label: "Editorial" },
  { id: "data", label: "Data" },
];

export function MontageThemesScene({
  durationInFrames,
}: {
  durationInFrames: number;
}) {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const portrait = usePortrait();
  const step = Math.floor(durationInFrames / MONTAGE_THEMES.length);
  const active = Math.min(MONTAGE_THEMES.length - 1, Math.floor(frame / step));
  const local = frame - active * step;
  const slide = interpolate(local, [0, DUR.fast], [36, 0], {
    easing: EASE_PANEL,
    extrapolateRight: "clamp",
  });
  const fade = interpolate(local, [0, DUR.fast], [0, 1], {
    extrapolateRight: "clamp",
  });
  const entry = MONTAGE_THEMES[active];
  return (
    <VideoFrame>
      <Backdrop grain variant="ink" />
      <PreloadImg src={staticFile(RIDE_PHOTO)} />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: height * (portrait ? 0.3 : 0.28),
        }}
      >
        <div style={{ opacity: fade, transform: `translateX(${slide}px)` }}>
          <CardScaled height={height * (portrait ? 0.5 : 0.56)}>
            <ThemeCard
              data={SAMPLE_RIDE}
              id={entry.id}
              photoUrl={
                entry.id === "altitude" ? staticFile(RIDE_PHOTO) : undefined
              }
            />
          </CardScaled>
        </div>
      </AbsoluteFill>
      <div
        style={{
          bottom: SAFE + (portrait ? 250 : 134),
          display: "flex",
          flexWrap: "wrap",
          gap: SPACE.sm,
          justifyContent: "center",
          left: 0,
          position: "absolute",
          right: 0,
        }}
      >
        {MONTAGE_THEMES.map((t, i) => (
          <Pill active={i === active} key={t.id}>
            {t.label}
          </Pill>
        ))}
      </div>
      <Caption
        delay={6}
        label="Thirteen looks"
        position="bottom-center"
        text="Posters and carousels — pick the one that feels like the day."
      />
    </VideoFrame>
  );
}

/* ───────────── 6 · Montage — colours ───────────── */

const PALETTE_BEATS: { label: string; scheme: ColorScheme }[] = [
  { label: "Rust", scheme: { primary: "#c45a2c" } },
  { label: "Alpine", scheme: { primary: "#2f6f86", secondary: "#c4663a" } },
  { label: "Ocean", scheme: { primary: "#1e6fa0" } },
  { label: "Press", scheme: { primary: "#b1281a", secondary: "#1d3a2e" } },
  { label: "Sand", scheme: { primary: "#e8c39e" } },
];

export function MontagePaletteScene({
  durationInFrames,
}: {
  durationInFrames: number;
}) {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const portrait = usePortrait();
  const step = Math.floor(durationInFrames / PALETTE_BEATS.length);
  const active = Math.min(PALETTE_BEATS.length - 1, Math.floor(frame / step));
  const beat = PALETTE_BEATS[active];
  return (
    <VideoFrame>
      <Backdrop grain variant="ink" />
      <AbsoluteFill
        style={{
          alignItems: "center",
          flexDirection: portrait ? "column" : "row",
          gap: portrait ? SPACE.md : SPACE.lg,
          justifyContent: "center",
          paddingBottom: height * 0.12,
        }}
      >
        <CardScaled height={height * (portrait ? 0.5 : 0.64)}>
          <ThemeCard colors={beat.scheme} data={SAMPLE_RIDE} id="path" />
        </CardScaled>
        <div
          style={{
            display: "flex",
            flexDirection: portrait ? "row" : "column",
            gap: SPACE.sm,
          }}
        >
          {PALETTE_BEATS.map((b, i) => (
            <PaletteChip
              active={i === active}
              colors={[b.scheme.primary, b.scheme.secondary ?? "#f7f3ec"]}
              key={b.label}
              label={b.label}
            />
          ))}
        </div>
      </AbsoluteFill>
      <Caption
        delay={6}
        label="Your colours"
        position="bottom-center"
        text="Preset schemes — or palettes pulled straight from your photo."
      />
    </VideoFrame>
  );
}

/* ───────────── 7 · Montage — the seamless carousel ───────────── */

export function MontageCarouselScene({
  durationInFrames,
}: {
  durationInFrames: number;
}) {
  const frame = useCurrentFrame();
  const { height, width } = useVideoConfig();
  const portrait = usePortrait();
  const theme = CAROUSEL_THEMES.exposure;
  const slideCount = theme.panels.length;
  const stripHeight = height * (portrait ? 0.6 : 0.72);
  const scale = stripHeight / 1350;
  const viewportStripPx = width / scale;
  const panTo = Math.max(0, slideCount * 1080 - viewportStripPx);
  const progress = interpolate(frame, [8, durationInFrames - 6], [0, 1], {
    easing: EASE_PANEL,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <VideoFrame>
      <Backdrop variant="ink" />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: height * (portrait ? 0.12 : 0.18),
        }}
      >
        <PreloadImg src={staticFile(DUNES_PHOTO)} />
        <StripPan
          height={stripHeight}
          panFrom={0}
          panTo={panTo}
          progress={progress}
          showSeams
          slideCount={slideCount}
          style={{
            boxShadow: "0 60px 120px -40px rgba(0,0,0,0.65)",
            width,
          }}
        >
          <CarouselDeck
            data={SAMPLE_RIDE}
            {...carouselArgs("exposure")}
            imageSize={DUNES_SIZE}
            photoUrl={staticFile(DUNES_PHOTO)}
          />
        </StripPan>
      </AbsoluteFill>
      <Caption
        delay={10}
        label="Carousel mode"
        position="bottom-left"
        text="One seamless story — sliced into slides."
      />
    </VideoFrame>
  );
}

/* ───────────── 8 · Montage — every sport ───────────── */

const SPORT_CARDS: { data: typeof SAMPLE_RIDE; id: ThemeId }[] = [
  { data: SAMPLE_RIDE, id: "path" },
  { data: SAMPLE_RUN, id: "editorial" },
  { data: SAMPLE_SWIM, id: "data" },
];

export function MontageSportsScene() {
  const { height } = useVideoConfig();
  const portrait = usePortrait();
  const cardHeight = height * (portrait ? 0.28 : 0.56);
  return (
    <VideoFrame>
      <Backdrop grain variant="ink" />
      <AbsoluteFill
        style={{
          alignItems: "center",
          flexDirection: portrait ? "column" : "row",
          gap: portrait ? 0 : SPACE.md,
          justifyContent: "center",
          paddingBottom: height * 0.1,
        }}
      >
        {SPORT_CARDS.map((card, i) => (
          <RiseIn
            delay={6 + i * 7}
            key={card.id}
            style={{
              // Portrait stacks the trio into a slightly rotated fan; the
              // negative margin overlaps them so all three fit the column.
              marginTop: portrait && i > 0 ? -cardHeight * 0.22 : 0,
              transform: portrait
                ? `rotate(${(i - 1) * 3}deg)`
                : `translateY(${(i - 1) * 14}px)`,
            }}
          >
            <CardScaled height={cardHeight}>
              <ThemeCard data={card.data} id={card.id} />
            </CardScaled>
          </RiseIn>
        ))}
      </AbsoluteFill>
      <Caption
        delay={24}
        label="Every sport"
        position="bottom-center"
        text="Ride, run, swim, triathlon — the right numbers for each."
      />
    </VideoFrame>
  );
}

/* ───────────── 9 · CTA ───────────── */

export function CtaScene() {
  return (
    <VideoFrame>
      <Backdrop grain variant="ink" />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <LogoSting sub="Free · No account · In your browser" />
      </AbsoluteFill>
    </VideoFrame>
  );
}
