// The hero's scenes — a cinematic, continuously-moving cut shared by the
// landscape (Hero) and portrait (HeroVertical) compositions. Typography and
// cards live in a shallow 3D room (Stage3D); elements glide rather than sit,
// and the word EFFORT carries through the opening as one continuous object.
// Every card and carousel is the real theme component fed with sample data.

import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
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
import { type Coord, mixHex } from "@/lib/chart-helpers";
import { Backdrop } from "../components/backdrop";
import { Caption } from "../components/caption";
import { CardScaled, StripPan } from "../components/card-showcase";
import { FileIcon } from "../components/file-icon";
import { LogoSting } from "../components/logo-sting";
import { PreloadImg } from "../components/preload-img";
import { RiseIn } from "../components/rise-in";
import { RouteDraw } from "../components/route-draw";
import { Plane3D, Stage3D } from "../components/stage-3d";
import { PaletteChip, Pill } from "../components/stat-chip";
import { ThemeCard } from "../components/theme-card";
import { VideoFrame } from "../components/video-frame";
import { breathe, EASE_GLIDE } from "../design/motion";
import {
  FONT,
  PAPER,
  PAPER_DIM,
  RUST,
  RUST_BRIGHT,
  SETTLE_SPRING,
  SPACE,
  TRACKING,
  TYPE,
} from "../design/tokens";

const RIDE_PHOTO = "images/ride.jpg";
const DUNES_PHOTO = "images/dunes.webp";
// Natural sizes (measured once) — carousel panoramas size against them.
const DUNES_SIZE = { h: 2400, w: 1600 };

function usePortrait(): boolean {
  const { height, width } = useVideoConfig();
  return height > width;
}

// A hard alpine climb: hairpin switchbacks of uneven width tightening toward a
// summit, finished with a little summit hook. Reads as a genuine challenge —
// where a gentle loop reads as a Sunday spin.
function genClimb(n: number): Coord[] {
  const out: Coord[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    // Switchbacks tighten as the road climbs; each pass a different width so it
    // never reads as a machine zig-zag.
    const phase = t * 5.5;
    const tri = 2 * Math.abs(phase - Math.round(phase)) - 1; // −1 … 1
    const ampVar = 0.62 + 0.5 * Math.sin(t * 8.5 + 0.7);
    const amp = (1 - 0.52 * t) * ampVar;
    // a summit hook near the top, then the air thins (route stops climbing)
    const hook = t > 0.86 ? Math.sin((t - 0.86) * 22) * 0.4 : 0;
    const x = tri * amp + hook + 0.05 * Math.sin(t * 37);
    const y = (0.5 - t) * 1.9 + 0.07 * Math.cos(t * 24) + (t > 0.9 ? 0.08 : 0);
    out.push([x, y]);
  }
  return out;
}
const CLIMB_ROUTE = genClimb(260);

/* ════════════════ 1 · Opening — "you put in the EFFORT" ════════════════ */
// One scene, two claims. The word EFFORT is a single object that travels from
// the first claim's position into the second, swinging face-on and taking the
// rust accent as it lands — "your effort deserves more than plain statistics".

export function OpeningScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { height, width } = useVideoConfig();
  const portrait = usePortrait();

  const effortSize = (portrait ? 0.82 : 1) * TYPE.claim;
  // Morph window: claim 1 → claim 2.
  const m = interpolate(frame, [96, 140], [0, 1], {
    easing: EASE_GLIDE,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // EFFORT — the shared, continuous object.
  const intro = spring({
    config: SETTLE_SPRING,
    durationInFrames: 24,
    fps,
    frame,
  });
  const ex =
    interpolate(m, [0, 1], [-width * 0.16, 0]) + breathe(frame, 5, 240);
  const ey = interpolate(m, [0, 1], [-height * 0.03, -height * 0.11]);
  const escale =
    interpolate(m, [0, 1], [1, 0.9]) * interpolate(intro, [0, 1], [0.92, 1]);
  const erot = interpolate(m, [0, 1], [15, 0]);
  const ecolor = mixHex(PAPER, RUST_BRIGHT, m);

  const claim1Op = interpolate(frame, [108, 132], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const claim2Op = interpolate(frame, [134, 160], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const strike = interpolate(frame, [168, 196], [0, 1], {
    easing: EASE_GLIDE,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const smallSize = effortSize * 0.26;

  return (
    <VideoFrame>
      <Backdrop grain variant="ink" />
      <Stage3D>
        {/* The hard climb, angled on the right plane — phase one only. */}
        <Plane3D
          opacity={claim1Op * 0.92}
          rotateY={-15}
          x={width * (portrait ? 0.0 : 0.22)}
          y={portrait ? -height * 0.26 : 0}
          z={-60}
        >
          <RouteDraw
            coords={CLIMB_ROUTE}
            durationInFrames={78}
            height={portrait ? height * 0.32 : height * 0.64}
            stroke={RUST}
            strokeWidth={7}
            width={portrait ? width * 0.7 : width * 0.42}
          />
        </Plane3D>

        {/* "YOU PUT IN THE" — phase one, left/up. */}
        <div
          style={{
            color: PAPER_DIM,
            fontFamily: FONT.heading,
            fontSize: smallSize,
            left: "50%",
            letterSpacing: TRACKING.heading,
            lineHeight: 1,
            opacity: claim1Op,
            position: "absolute",
            textTransform: "uppercase",
            top: "50%",
            transform: `translate(-50%, -50%) translate(${-width * 0.16}px, ${-height * 0.03 - effortSize * 0.62}px) rotateY(15deg)`,
            whiteSpace: "nowrap",
          }}
        >
          You put in the
        </div>

        {/* "YOUR" — phase two, above EFFORT. */}
        <div
          style={{
            color: PAPER,
            fontFamily: FONT.heading,
            fontSize: smallSize,
            left: "50%",
            letterSpacing: TRACKING.heading,
            lineHeight: 1,
            opacity: claim2Op,
            position: "absolute",
            textTransform: "uppercase",
            top: "50%",
            transform: `translate(-50%, -50%) translate(0px, ${-height * 0.11 - effortSize * 0.9 * 0.74}px)`,
          }}
        >
          Your
        </div>

        {/* EFFORT — the continuous object. */}
        <div
          style={{
            color: ecolor,
            fontFamily: FONT.heading,
            fontSize: effortSize,
            left: "50%",
            letterSpacing: TRACKING.heading,
            lineHeight: 1,
            opacity: intro,
            position: "absolute",
            textShadow: "0 24px 60px rgba(0,0,0,0.5)",
            textTransform: "uppercase",
            top: "50%",
            transform: `translate(-50%, -50%) translate(${ex}px, ${ey}px) rotateY(${erot}deg) scale(${escale})`,
          }}
        >
          Effort
        </div>

        {/* phase two — the deprecating tail, struck through. */}
        <div
          style={{
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            left: "50%",
            opacity: claim2Op,
            position: "absolute",
            top: "50%",
            transform: `translate(-50%, -50%) translate(0px, ${-height * 0.11 + effortSize * 0.9 * 0.9}px)`,
          }}
        >
          <span
            style={{
              color: PAPER_DIM,
              fontFamily: FONT.sans,
              fontSize: effortSize * 0.22,
            }}
          >
            deserves more than just
          </span>
          <div style={{ position: "relative" }}>
            <span
              style={{
                color: PAPER,
                fontFamily: FONT.heading,
                fontSize: effortSize * 0.4,
                letterSpacing: TRACKING.heading,
                textTransform: "uppercase",
              }}
            >
              plain statistics
            </span>
            <div
              style={{
                backgroundColor: RUST_BRIGHT,
                height: 5,
                left: -6,
                position: "absolute",
                right: -6,
                top: "52%",
                transform: `scaleX(${strike})`,
                transformOrigin: "left center",
              }}
            />
          </div>
        </div>
      </Stage3D>
    </VideoFrame>
  );
}

/* ════════════ 2 · Ingest → reveal — any input becomes a card ════════════ */
// GPX, .fit and Strava drift in the room, then converge and morph into the
// first card (Altitude — image-led, so the photo lands the point).

export function IngestRevealScene({
  durationInFrames,
}: {
  durationInFrames: number;
}) {
  const frame = useCurrentFrame();
  const { height, width } = useVideoConfig();
  const portrait = usePortrait();

  const cStart = durationInFrames - 122;
  const cEnd = durationInFrames - 92;
  const converge = interpolate(frame, [cStart, cEnd], [0, 1], {
    easing: EASE_GLIDE,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const inputsOp = interpolate(frame, [cStart, cEnd], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cardIn = interpolate(frame, [cEnd - 14, cEnd + 16], [0, 1], {
    easing: EASE_GLIDE,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const spread = 1 - converge;
  const side = portrait ? width * 0.2 : width * 0.24;

  function inputTransform(baseX: number, baseY: number, drift: number): string {
    const x = baseX * spread + breathe(frame, 10, 150, drift) * spread;
    const y = baseY * spread + breathe(frame, 14, 170, drift + 1) * spread;
    const s = interpolate(converge, [0, 1], [1, 0.18]);
    return `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${s})`;
  }

  return (
    <VideoFrame>
      <Backdrop grain variant="ink" />
      <PreloadImg src={staticFile(RIDE_PHOTO)} />
      <Stage3D>
        {/* the three inputs */}
        <Plane3D
          opacity={inputsOp}
          rotateY={14}
          style={{
            left: "50%",
            position: "absolute",
            top: "50%",
            transform: inputTransform(-side, height * 0.04, 0),
          }}
        >
          <FileIcon ext=".GPX" width={portrait ? 180 : 220} />
        </Plane3D>
        <Plane3D
          opacity={inputsOp}
          rotateY={-14}
          style={{
            left: "50%",
            position: "absolute",
            top: "50%",
            transform: inputTransform(side, height * 0.04, 2.3),
          }}
        >
          <FileIcon accent="#2f6f86" ext=".FIT" width={portrait ? 180 : 220} />
        </Plane3D>
        <div
          style={{
            left: "50%",
            opacity: inputsOp,
            position: "absolute",
            top: "50%",
            transform: inputTransform(0, -height * 0.24, 4.1),
          }}
        >
          <Img
            src={staticFile("strava/btn-connect-with-strava-orange.svg")}
            style={{ display: "block", height: portrait ? 70 : 84 }}
          />
        </div>

        {/* the card the inputs become */}
        <div
          style={{
            opacity: cardIn,
            transform: `scale(${interpolate(cardIn, [0, 1], [0.86, 1])})`,
          }}
        >
          <CardScaled height={height * (portrait ? 0.6 : 0.76)}>
            <ThemeCard
              data={SAMPLE_RIDE}
              id="altitude"
              photoUrl={staticFile(RIDE_PHOTO)}
            />
          </CardScaled>
        </div>
      </Stage3D>
      {frame < cEnd ? (
        <Caption
          delay={6}
          label="Any file, any sport"
          position="bottom-center"
          text="GPX, .fit, or straight from Strava — drop it in."
        />
      ) : (
        <Caption
          delay={cEnd + 4}
          label="Instantly"
          position="bottom-center"
          text="…and it's a card worth sharing."
        />
      )}
    </VideoFrame>
  );
}

/* ════════════════ 3 · Themes — flying in from behind you ════════════════ */

const THEME_TOUR: { id: ThemeId; label: string; photo?: boolean }[] = [
  { id: "altitude", label: "Altitude", photo: true },
  { id: "strata", label: "Strata" },
  { id: "editorial", label: "Editorial" },
  { id: "data", label: "Data" },
];

export function ThemesScene({
  durationInFrames,
}: {
  durationInFrames: number;
}) {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const portrait = usePortrait();
  const step = Math.floor(durationInFrames / THEME_TOUR.length);
  const active = Math.min(THEME_TOUR.length - 1, Math.floor(frame / step));
  const local = frame - active * step;
  const entry = THEME_TOUR[active];

  // Fly in from behind the viewer: starts huge + blurred + tipped, recedes home
  // quickly so each card has a clear, sharp beat before the next arrives.
  const z = interpolate(local, [0, 13], [760, 0], {
    easing: EASE_GLIDE,
    extrapolateRight: "clamp",
  });
  const blur = interpolate(local, [0, 9], [18, 0], {
    extrapolateRight: "clamp",
  });
  const rot = interpolate(local, [0, 15], [active % 2 ? 13 : -13, 0], {
    easing: EASE_GLIDE,
    extrapolateRight: "clamp",
  });
  const fade = interpolate(local, [0, 7, step - 9, step], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <VideoFrame>
      <Backdrop grain variant="ink" />
      <PreloadImg src={staticFile(RIDE_PHOTO)} />
      <Stage3D camera={false} perspective={1400}>
        <div
          style={{
            filter: `blur(${blur}px)`,
            opacity: fade,
            transform: `translateZ(${z}px) rotateY(${rot}deg)`,
            transformStyle: "preserve-3d",
          }}
        >
          <CardScaled height={height * (portrait ? 0.54 : 0.66)}>
            <ThemeCard
              data={SAMPLE_RIDE}
              id={entry.id}
              photoUrl={entry.photo ? staticFile(RIDE_PHOTO) : undefined}
            />
          </CardScaled>
        </div>
      </Stage3D>
      <div
        style={{
          bottom: portrait ? height * 0.16 : 134,
          display: "flex",
          flexWrap: "wrap",
          gap: SPACE.sm,
          justifyContent: "center",
          left: 0,
          position: "absolute",
          right: 0,
        }}
      >
        {THEME_TOUR.map((t, i) => (
          <Pill active={i === active} key={t.id}>
            {t.label}
          </Pill>
        ))}
      </div>
      <Caption
        delay={6}
        label="Thirteen looks"
        position="bottom-center"
        text="Pick the one that feels like the day."
      />
    </VideoFrame>
  );
}

/* ════════════════ 4 · Colour — the whole card, recoloured ════════════════ */
// Strata's mood swaps the entire generative field — a real, dramatic colour
// move, not a one-pixel accent tweak.

const MOOD_BEATS: { label: string; mood: string; swatch: [string, string] }[] =
  [
    { label: "Dusk", mood: "dusk", swatch: ["#e0683a", "#7c3a52"] },
    { label: "Alpine", mood: "alpine", swatch: ["#2f6f86", "#9fc7d6"] },
    { label: "Midnight", mood: "midnight", swatch: ["#1e2a4a", "#5566a8"] },
    { label: "Dawn", mood: "dawn", swatch: ["#caa46a", "#e8c39e"] },
  ];

export function ColorScene({ durationInFrames }: { durationInFrames: number }) {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const portrait = usePortrait();
  const step = Math.floor(durationInFrames / MOOD_BEATS.length);
  const active = Math.min(MOOD_BEATS.length - 1, Math.floor(frame / step));
  const local = frame - active * step;
  const beat = MOOD_BEATS[active];
  const pop = interpolate(local, [0, 12], [0.96, 1], {
    easing: EASE_GLIDE,
    extrapolateRight: "clamp",
  });

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
        <div style={{ transform: `scale(${pop})` }}>
          <CardScaled height={height * (portrait ? 0.5 : 0.64)}>
            <ThemeCard
              config={{ mood: beat.mood }}
              data={SAMPLE_RIDE}
              id="strata"
            />
          </CardScaled>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: portrait ? "row" : "column",
            gap: SPACE.sm,
          }}
        >
          {MOOD_BEATS.map((b, i) => (
            <PaletteChip
              active={i === active}
              colors={b.swatch}
              key={b.mood}
              label={b.label}
            />
          ))}
        </div>
      </AbsoluteFill>
      <Caption
        delay={6}
        label="Your colours"
        position="bottom-center"
        text="Recolour the whole card — or pull a palette from your photo."
      />
    </VideoFrame>
  );
}

/* ═══════════ 5 · Carousel — not one image, but a whole strip ═══════════ */
// Open on what looks like a single beautiful image (slide one of Exposure),
// then pull the camera back to reveal it was a seamless wide carousel.

export function CarouselScene({
  durationInFrames,
}: {
  durationInFrames: number;
}) {
  const frame = useCurrentFrame();
  const { height, width } = useVideoConfig();
  const portrait = usePortrait();
  const theme = CAROUSEL_THEMES.exposure;
  const slideCount = theme.panels.length;

  // Phase one: a single beautiful image (one photo-led card, the dunes shot).
  // Phase two: the camera pulls back to reveal the same shot was a wide
  // carousel all along — same photo, so the relationship is unmistakable.
  const handoff = durationInFrames - 122;
  const single = interpolate(frame, [handoff, handoff + 24], [1, 0], {
    easing: EASE_GLIDE,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const singleZoom =
    interpolate(frame, [0, handoff], [1, 1.06], { extrapolateRight: "clamp" }) +
    interpolate(frame, [handoff, handoff + 24], [0, 0.16], {
      easing: EASE_GLIDE,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  const reveal = interpolate(
    frame,
    [handoff + 6, durationInFrames - 8],
    [0, 1],
    { easing: EASE_GLIDE, extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const stripOp = interpolate(frame, [handoff + 6, handoff + 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const stripHeight = height * (portrait ? 0.56 : 0.66);
  const scale = stripHeight / 1350;
  const panTo = Math.max(0, slideCount * 1080 - width / scale);

  return (
    <VideoFrame>
      <Backdrop variant="ink" />
      <PreloadImg src={staticFile(DUNES_PHOTO)} />

      {/* phase two — the carousel strip, fading up as the single card lifts */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          opacity: stripOp,
          paddingBottom: height * (portrait ? 0.12 : 0.16),
        }}
      >
        <StripPan
          height={stripHeight}
          panFrom={0}
          panTo={panTo}
          progress={reveal}
          showSeams={reveal > 0.45}
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

      {/* phase one — one beautiful image, the same photo */}
      {single > 0.01 ? (
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            opacity: single,
            paddingBottom: height * (portrait ? 0.12 : 0.16),
          }}
        >
          <div style={{ transform: `scale(${singleZoom})` }}>
            <CardScaled height={height * (portrait ? 0.62 : 0.78)}>
              <ThemeCard
                data={SAMPLE_RIDE}
                id="altitude"
                photoUrl={staticFile(DUNES_PHOTO)}
              />
            </CardScaled>
          </div>
        </AbsoluteFill>
      ) : null}

      {frame < handoff + 12 ? (
        <Caption
          delay={6}
          label="Carousel mode"
          position="bottom-left"
          text="Not just one beautiful image…"
        />
      ) : (
        <Caption
          delay={handoff + 12}
          label="Carousel mode"
          position="bottom-left"
          text="…but a whole carousel from one wide frame."
        />
      )}
    </VideoFrame>
  );
}

/* ════════════════════════ 6 · Every sport ════════════════════════ */

const SPORT_CARDS: { data: typeof SAMPLE_RIDE; id: ThemeId }[] = [
  { data: SAMPLE_RIDE, id: "path" },
  { data: SAMPLE_RUN, id: "editorial" },
  { data: SAMPLE_SWIM, id: "data" },
];

export function SportsScene() {
  const frame = useCurrentFrame();
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
        {SPORT_CARDS.map((card, i) => {
          // a slow continuous float so the fan never sits still
          const drift = breathe(frame, 8, 180, i * 1.4);
          return (
            <RiseIn
              delay={6 + i * 7}
              key={card.id}
              style={{
                marginTop: portrait && i > 0 ? -cardHeight * 0.22 : 0,
                transform: portrait
                  ? `rotate(${(i - 1) * 3}deg)`
                  : `translateY(${(i - 1) * 14 + drift}px) rotate(${(i - 1) * 2}deg)`,
              }}
            >
              <CardScaled height={cardHeight}>
                <ThemeCard data={card.data} id={card.id} />
              </CardScaled>
            </RiseIn>
          );
        })}
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

/* ════════════════════════ 7 · CTA ════════════════════════ */

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
