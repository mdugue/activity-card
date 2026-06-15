// The hero's scenes — a cinematic, continuously-moving cut shared by the
// landscape (Hero) and portrait (HeroVertical) compositions. Big, bold
// typography lives in a 3D room (Stage3D) opposite the visual it describes,
// the two trading sides between beats; elements glide rather than sit, the word
// EFFORT carries through the opening as one object, inputs morph into the card,
// and the single card uncrops into the carousel. Every card is the real theme.

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
import { CardScaled } from "../components/card-showcase";
import { FileIcon } from "../components/file-icon";
import { LogoSting } from "../components/logo-sting";
import { PreloadImg } from "../components/preload-img";
import { RouteDraw } from "../components/route-draw";
import { Plane3D, Stage3D } from "../components/stage-3d";
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
  TRACKING,
  TYPE,
} from "../design/tokens";

const RIDE_PHOTO = "images/ride.jpg";
const DUNES_PHOTO = "images/dunes.webp";
// Natural sizes (measured once) — carousel panoramas size against them.
const DUNES_SIZE = { h: 2400, w: 1600 };
// Stable keys for the carousel seam ticks (indexing this, not the loop index).
const SEAM_KEYS = ["seam-a", "seam-b", "seam-c", "seam-d", "seam-e"];

function usePortrait(): boolean {
  const { height, width } = useVideoConfig();
  return height > width;
}

// A hard alpine climb: hairpin switchbacks of uneven width tightening toward a
// summit, finished with a little summit hook. Reads as a genuine challenge.
function genClimb(n: number): Coord[] {
  const out: Coord[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const phase = t * 5.5;
    const tri = 2 * Math.abs(phase - Math.round(phase)) - 1;
    const ampVar = 0.62 + 0.5 * Math.sin(t * 8.5 + 0.7);
    const amp = (1 - 0.52 * t) * ampVar;
    const hook = t > 0.86 ? Math.sin((t - 0.86) * 22) * 0.4 : 0;
    const x = tri * amp + hook + 0.05 * Math.sin(t * 37);
    const y = (0.5 - t) * 1.9 + 0.07 * Math.cos(t * 24) + (t > 0.9 ? 0.08 : 0);
    out.push([x, y]);
  }
  return out;
}
const CLIMB_ROUTE = genClimb(260);

/* ───────────────────────── shared bold-text layout ───────────────────────── */

interface HeadlineLine {
  accent?: boolean;
  text: string;
}

// Big Anton lines, optionally rising one after another. The video's voice.
function BoldHeadline({
  align = "left",
  frame,
  lines,
  size,
}: {
  align?: "left" | "center";
  frame: number;
  lines: HeadlineLine[];
  size: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        textAlign: align,
      }}
    >
      {lines.map((line, i) => {
        const rise = interpolate(frame, [i * 4, i * 4 + 16], [40, 0], {
          easing: EASE_GLIDE,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const op = interpolate(frame, [i * 4, i * 4 + 14], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={line.text}
            style={{
              color: line.accent ? RUST_BRIGHT : PAPER,
              fontFamily: FONT.heading,
              fontSize: size,
              letterSpacing: TRACKING.heading,
              lineHeight: 0.96,
              opacity: op,
              textShadow: "0 20px 50px rgba(0,0,0,0.45)",
              textTransform: "uppercase",
              transform: `translateY(${rise}px)`,
            }}
          >
            {line.text}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The editorial split every middle beat shares: a bold headline block angled in
 * 3D on one side, the visual it describes on the other. `side` flips which is
 * which so successive beats trade sides. Portrait stacks them (text up top).
 */
function SplitScene({
  label,
  lines,
  side,
  visual,
}: {
  /** rust mono overline */
  label: string;
  lines: HeadlineLine[];
  side: "text-left" | "text-right";
  visual: React.ReactNode;
}) {
  const frame = useCurrentFrame();
  const { height, width } = useVideoConfig();
  const portrait = usePortrait();
  const textLeft = side === "text-left";

  if (portrait) {
    return (
      <VideoFrame>
        <Backdrop grain variant="ink" />
        <AbsoluteFill
          style={{
            alignItems: "flex-start",
            flexDirection: "column",
            gap: height * 0.035,
            justifyContent: "center",
            padding: 70,
          }}
        >
          <div style={{ width: "100%" }}>
            <Overline label={label} />
            <BoldHeadline frame={frame} lines={lines} size={width * 0.13} />
          </div>
          <div style={{ alignSelf: "center" }}>{visual}</div>
        </AbsoluteFill>
      </VideoFrame>
    );
  }

  // Planes are absolutely positioned (anchored to the stage centre), so place
  // each by an explicit offset — text in one third angled toward the middle,
  // the visual in the other, lightly counter-tilted.
  return (
    <VideoFrame>
      <Backdrop grain variant="ink" />
      <Stage3D perspective={1250}>
        <Plane3D
          rotateY={textLeft ? 20 : -20}
          x={textLeft ? -width * 0.25 : width * 0.25}
          z={-30}
        >
          <div style={{ width: width * 0.4 }}>
            <Overline label={label} />
            <BoldHeadline frame={frame} lines={lines} size={width * 0.072} />
          </div>
        </Plane3D>
        <Plane3D
          rotateY={textLeft ? -9 : 9}
          x={textLeft ? width * 0.2 : -width * 0.2}
        >
          {visual}
        </Plane3D>
      </Stage3D>
    </VideoFrame>
  );
}

function Overline({ label }: { label: string }) {
  return (
    <div
      style={{
        color: RUST_BRIGHT,
        fontFamily: FONT.mono,
        fontSize: 24,
        fontWeight: 600,
        letterSpacing: TRACKING.label,
        marginBottom: 22,
        textTransform: "uppercase",
      }}
    >
      {label}
    </div>
  );
}

/* ════════════════ 1 · Opening — "you put in the EFFORT" ════════════════ */
// One scene, two claims. EFFORT is a single object that travels from the first
// claim into the second, swinging face-on and taking the rust accent as it
// lands — "your EFFORT deserves more than just plain statistics".

export function OpeningScene() {
  const frame = useCurrentFrame();
  const { fps, height, width } = useVideoConfig();
  const portrait = usePortrait();

  const effortSize = (portrait ? 0.92 : 1.12) * TYPE.claim;
  const m = interpolate(frame, [96, 142], [0, 1], {
    easing: EASE_GLIDE,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const intro = spring({
    config: SETTLE_SPRING,
    durationInFrames: 24,
    fps,
    frame,
  });

  const ex =
    interpolate(m, [0, 1], [-width * 0.17, 0]) + breathe(frame, 5, 240);
  const ey = interpolate(m, [0, 1], [-height * 0.03, -height * 0.11]);
  const escale =
    interpolate(m, [0, 1], [1, 0.92]) * interpolate(intro, [0, 1], [0.9, 1]);
  // Strong perspective swing: from sharply angled to face-on as it lands.
  const erot = interpolate(m, [0, 1], [34, 0]);
  const ecolor = mixHex(PAPER, RUST_BRIGHT, m);

  const claim1Op = interpolate(frame, [108, 132], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const claim2Op = interpolate(frame, [136, 162], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const strike = interpolate(frame, [170, 198], [0, 1], {
    easing: EASE_GLIDE,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const smallSize = effortSize * 0.26;

  return (
    <VideoFrame>
      <Backdrop grain variant="ink" />
      <Stage3D perspective={1150}>
        {/* The hard climb, sharply angled on the right plane — phase one. */}
        <Plane3D
          opacity={claim1Op * 0.95}
          rotateY={-26}
          x={width * (portrait ? 0 : 0.24)}
          y={portrait ? -height * 0.27 : 0}
          z={-90}
        >
          <RouteDraw
            coords={CLIMB_ROUTE}
            durationInFrames={80}
            height={portrait ? height * 0.32 : height * 0.66}
            stroke={RUST}
            strokeWidth={8}
            width={portrait ? width * 0.72 : width * 0.44}
          />
        </Plane3D>

        {/* "YOU PUT IN THE" — phase one, riding the left plane. */}
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
            transform: `translate(-50%, -50%) translate(${-width * 0.17}px, ${-height * 0.03 - effortSize * 0.62}px) perspective(1000px) rotateY(28deg)`,
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
            transform: `translate(-50%, -50%) translate(0px, ${-height * 0.11 - effortSize * 0.92 * 0.74}px)`,
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
            textShadow: "0 30px 70px rgba(0,0,0,0.55)",
            textTransform: "uppercase",
            top: "50%",
            transform: `translate(-50%, -50%) translate(${ex}px, ${ey}px) perspective(900px) rotateY(${erot}deg) scale(${escale})`,
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
            gap: 12,
            left: "50%",
            opacity: claim2Op,
            position: "absolute",
            top: "50%",
            transform: `translate(-50%, -50%) translate(0px, ${-height * 0.11 + effortSize * 0.92 * 0.92}px)`,
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
                fontSize: effortSize * 0.42,
                letterSpacing: TRACKING.heading,
                textTransform: "uppercase",
              }}
            >
              plain statistics
            </span>
            <div
              style={{
                backgroundColor: RUST_BRIGHT,
                height: 6,
                left: -8,
                position: "absolute",
                right: -8,
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

/* ════════════ 2 · Ingest → reveal — an input morphs into the card ════════════ */
// GPX, .fit and Strava sit in the 3D room next to a bold claim; then the file
// grows and morphs into the first card — an icon opening into the app.

export function IngestRevealScene({
  durationInFrames,
}: {
  durationInFrames: number;
}) {
  const frame = useCurrentFrame();
  const { height, width } = useVideoConfig();
  const portrait = usePortrait();

  const mStart = durationInFrames - 132;
  const mEnd = durationInFrames - 96;
  const grow = interpolate(frame, [mStart, mEnd], [0, 1], {
    easing: EASE_GLIDE,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const inputsOp = interpolate(frame, [mStart, mStart + 18], [1, 0.0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headlineOp = interpolate(frame, [mStart, mStart + 16], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // The morphing tile: starts at the GPX sheet's size/place, grows into the card.
  const iconH = portrait ? 250 : 300;
  const cardH = height * (portrait ? 0.6 : 0.78);
  const tileH = interpolate(grow, [0, 1], [iconH, cardH]);
  const tileW = tileH * 0.8;
  const startX = portrait ? 0 : width * 0.17;
  const startY = portrait ? -height * 0.04 : 0;
  const tileX = interpolate(grow, [0, 1], [startX, 0]) + breathe(frame, 4, 200);
  const tileY = interpolate(grow, [0, 1], [startY, 0]);
  const tileRot = interpolate(grow, [0, 1], [12, 0]);
  const fileOp = interpolate(grow, [0.18, 0.55], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cardOp = interpolate(grow, [0.4, 0.82], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const headlineSize =
    (portrait ? 0.12 : 0.135) * Math.min(width, height * 1.4);

  return (
    <VideoFrame>
      <Backdrop grain variant="ink" />
      <PreloadImg src={staticFile(RIDE_PHOTO)} />
      <Stage3D perspective={1250}>
        {/* bold claim on the left, fading as the morph takes over */}
        {!portrait && (
          <Plane3D opacity={headlineOp} rotateY={22} x={-width * 0.26} z={-40}>
            <div style={{ maxWidth: width * 0.4 }}>
              <Overline label="Any file, any sport" />
              <BoldHeadline
                frame={frame}
                lines={[{ text: "Drop" }, { text: "it in." }]}
                size={headlineSize}
              />
            </div>
          </Plane3D>
        )}

        {/* the secondary inputs (.fit + Strava), fanned behind the GPX sheet */}
        <Plane3D
          opacity={inputsOp}
          rotateY={-16}
          x={portrait ? width * 0.22 : width * 0.32}
          y={portrait ? -height * 0.04 : height * 0.02}
          z={-120}
        >
          <FileIcon accent="#2f6f86" ext=".FIT" width={portrait ? 150 : 190} />
        </Plane3D>
        <div
          style={{
            left: "50%",
            opacity: inputsOp,
            position: "absolute",
            top: "50%",
            transform: `translate(-50%, -50%) translate(${portrait ? 0 : width * 0.18}px, ${-height * 0.27}px)`,
          }}
        >
          <Img
            src={staticFile("strava/btn-connect-with-strava-orange.svg")}
            style={{ display: "block", height: portrait ? 64 : 78 }}
          />
        </div>

        {/* the morphing tile: GPX sheet → Altitude card */}
        <div
          style={{
            borderRadius: interpolate(grow, [0, 1], [16, 6]),
            boxShadow: "0 60px 120px -40px rgba(0,0,0,0.7)",
            height: tileH,
            left: "50%",
            overflow: "hidden",
            position: "absolute",
            top: "50%",
            transform: `translate(-50%, -50%) translate(${tileX}px, ${tileY}px) perspective(1100px) rotateY(${tileRot}deg)`,
            width: tileW,
          }}
        >
          <div
            style={{
              inset: 0,
              opacity: fileOp,
              position: "absolute",
            }}
          >
            <FileIcon ext=".GPX" width={tileW} />
          </div>
          <div style={{ inset: 0, opacity: cardOp, position: "absolute" }}>
            <CardScaled height={tileH} shadow={false}>
              <ThemeCard
                data={SAMPLE_RIDE}
                id="altitude"
                photoUrl={staticFile(RIDE_PHOTO)}
              />
            </CardScaled>
          </div>
        </div>
      </Stage3D>
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

  // Fly in from behind the viewer: huge + blurred + tipped, recedes home fast.
  const z = interpolate(local, [0, 13], [820, 0], {
    easing: EASE_GLIDE,
    extrapolateRight: "clamp",
  });
  const blur = interpolate(local, [0, 9], [18, 0], {
    extrapolateRight: "clamp",
  });
  const rot = interpolate(local, [0, 15], [active % 2 ? 16 : -16, 0], {
    easing: EASE_GLIDE,
    extrapolateRight: "clamp",
  });
  const fade = interpolate(local, [0, 7, step - 9, step], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
  });

  const visual = (
    <div
      style={{
        filter: `blur(${blur}px)`,
        opacity: fade,
        transform: `translateZ(${z}px) rotateY(${rot}deg)`,
        transformStyle: "preserve-3d",
      }}
    >
      <PreloadImg src={staticFile(RIDE_PHOTO)} />
      <CardScaled height={height * (portrait ? 0.46 : 0.64)}>
        <ThemeCard
          data={SAMPLE_RIDE}
          id={entry.id}
          photoUrl={entry.photo ? staticFile(RIDE_PHOTO) : undefined}
        />
      </CardScaled>
    </div>
  );

  return (
    <SplitScene
      label="Pick your look"
      lines={[{ text: entry.label }, { text: "look.", accent: true }]}
      side="text-left"
      visual={visual}
    />
  );
}

/* ════════════════ 4 · Colour — the whole card, recoloured ════════════════ */

const MOOD_BEATS: { label: string; mood: string }[] = [
  { label: "Dusk", mood: "dusk" },
  { label: "Alpine", mood: "alpine" },
  { label: "Midnight", mood: "midnight" },
  { label: "Dawn", mood: "dawn" },
];

export function ColorScene({ durationInFrames }: { durationInFrames: number }) {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const portrait = usePortrait();
  const step = Math.floor(durationInFrames / MOOD_BEATS.length);
  const active = Math.min(MOOD_BEATS.length - 1, Math.floor(frame / step));
  const local = frame - active * step;
  const beat = MOOD_BEATS[active];
  const pop = interpolate(local, [0, 12], [0.94, 1], {
    easing: EASE_GLIDE,
    extrapolateRight: "clamp",
  });
  const swap = interpolate(local, [0, 8], [0, 1], {
    extrapolateRight: "clamp",
  });

  const visual = (
    <div style={{ opacity: swap, transform: `scale(${pop})` }}>
      <CardScaled height={height * (portrait ? 0.46 : 0.66)}>
        <ThemeCard
          config={{ mood: beat.mood }}
          data={SAMPLE_RIDE}
          id="strata"
        />
      </CardScaled>
    </div>
  );

  return (
    <SplitScene
      label="Your colours"
      lines={[{ text: beat.label }, { text: "in a tap.", accent: true }]}
      side="text-right"
      visual={visual}
    />
  );
}

/* ═══════════ 5 · Carousel — uncrop the image into a whole strip ═══════════ */
// Open on what looks like a single beautiful photo card, then literally uncrop
// the same image — the frame widens to reveal it was a seamless carousel.

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

  const hold = 40;
  const reveal = interpolate(frame, [hold, durationInFrames - 10], [0, 1], {
    easing: EASE_GLIDE,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Scale: zoomed so one slide nearly fills the frame → pulled back so the full
  // strip fits the width. The strip never moves; the crop window just widens.
  const startScale = (height * (portrait ? 0.58 : 0.82)) / 1350;
  const endScale = (width * (portrait ? 0.92 : 0.96)) / (slideCount * 1080);
  const scale = interpolate(reveal, [0, 1], [startScale, endScale]);
  const stripDispW = slideCount * 1080 * scale;
  const stripDispH = 1350 * scale;
  const slideDispW = 1080 * scale;
  // crop window grows from one slide to the whole strip
  const cropW = interpolate(reveal, [0, 1], [slideDispW, stripDispW]);

  return (
    <VideoFrame>
      <Backdrop variant="ink" />
      <PreloadImg src={staticFile(DUNES_PHOTO)} />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: height * (portrait ? 0.16 : 0.16),
        }}
      >
        <div
          style={{
            boxShadow: "0 60px 120px -40px rgba(0,0,0,0.65)",
            height: stripDispH,
            overflow: "hidden",
            position: "relative",
            width: cropW,
          }}
        >
          {/* the full strip, centred in the crop window — widening the window
              uncrops the same continuous photo into a carousel */}
          <div
            style={{
              height: stripDispH,
              left: "50%",
              position: "absolute",
              top: 0,
              transform: "translateX(-50%)",
              width: stripDispW,
            }}
          >
            <div
              style={{
                height: 1350,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                width: slideCount * 1080,
              }}
            >
              <CarouselDeck
                data={SAMPLE_RIDE}
                {...carouselArgs("exposure")}
                imageSize={DUNES_SIZE}
                photoUrl={staticFile(DUNES_PHOTO)}
              />
            </div>
          </div>
          {/* seam ticks once the carousel is clearly revealed */}
          {reveal > 0.55
            ? Array.from({ length: slideCount - 1 }, (_, i) => {
                const leftPx = (i + 1) * slideDispW - (stripDispW - cropW) / 2;
                return (
                  <div
                    key={SEAM_KEYS[i]}
                    style={{
                      backgroundColor: "rgba(247,243,236,0.4)",
                      bottom: 0,
                      left: leftPx,
                      opacity: interpolate(reveal, [0.55, 0.7], [0, 1], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      }),
                      position: "absolute",
                      top: 0,
                      width: 2,
                    }}
                  />
                );
              })
            : null}
        </div>
      </AbsoluteFill>

      <div
        style={{
          bottom: portrait ? height * 0.06 : 70,
          left: 0,
          position: "absolute",
          right: 0,
          textAlign: "center",
        }}
      >
        <Overline label="Carousel mode" />
        <div
          style={{
            color: PAPER,
            fontFamily: FONT.heading,
            fontSize: (portrait ? 0.07 : 0.05) * width,
            letterSpacing: TRACKING.heading,
            textTransform: "uppercase",
          }}
        >
          {frame < hold + 20 ? "Not just one image" : "A whole carousel"}
        </div>
      </div>
    </VideoFrame>
  );
}

/* ════════════════════════ 6 · Every sport ════════════════════════ */

const SPORT_CARDS: { data: typeof SAMPLE_RIDE; id: ThemeId; label: string }[] =
  [
    { data: SAMPLE_RIDE, id: "path", label: "Ride" },
    { data: SAMPLE_RUN, id: "editorial", label: "Run" },
    { data: SAMPLE_SWIM, id: "data", label: "Swim" },
  ];

export function SportsScene() {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const portrait = usePortrait();
  const cardHeight = height * (portrait ? 0.26 : 0.5);

  const visual = (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        flexDirection: portrait ? "column" : "row",
        gap: portrait ? 0 : -cardHeight * 0.12,
        justifyContent: "center",
      }}
    >
      {SPORT_CARDS.map((card, i) => {
        const drift = breathe(frame, 7, 170, i * 1.4);
        const enter = interpolate(frame, [6 + i * 6, 24 + i * 6], [60, 0], {
          easing: EASE_GLIDE,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const op = interpolate(frame, [6 + i * 6, 22 + i * 6], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={card.id}
            style={{
              marginTop: portrait && i > 0 ? -cardHeight * 0.18 : 0,
              opacity: op,
              transform: `translateY(${enter + (i - 1) * 12 + drift}px) rotate(${(i - 1) * 4}deg)`,
              zIndex: i === 1 ? 2 : 1,
            }}
          >
            <CardScaled height={cardHeight}>
              <ThemeCard data={card.data} id={card.id} />
            </CardScaled>
          </div>
        );
      })}
    </div>
  );

  return (
    <SplitScene
      label="Ride · Run · Swim · Tri"
      lines={[{ text: "Every" }, { text: "sport.", accent: true }]}
      side="text-left"
      visual={visual}
    />
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
