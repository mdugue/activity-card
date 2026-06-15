// The hero's scenes — a cinematic, continuously-moving cut shared by the
// landscape (Hero) and portrait (HeroVertical) compositions. Big, bold
// typography lives in a 3D room (Stage3D) opposite the visual it describes,
// the two trading sides between beats; elements glide rather than sit, the word
// EFFORT carries through the opening as one object, inputs morph into the card,
// and the single card uncrops into the carousel. Every card is the real theme.

import {
  AbsoluteFill,
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
import { mixHex } from "@/lib/chart-helpers";
import { Backdrop } from "../components/backdrop";
import { CardScaled } from "../components/card-showcase";
import { FileIcon, StravaChip } from "../components/file-icon";
import { LogoSting } from "../components/logo-sting";
import { PreloadImg } from "../components/preload-img";
import { RouteDraw } from "../components/route-draw";
import { Plane3D, Stage3D } from "../components/stage-3d";
import { ThemeCard } from "../components/theme-card";
import { VideoFrame } from "../components/video-frame";
import { breathe, EASE_GLIDE } from "../design/motion";
import {
  BOUNCE_SPRING,
  EASE_ALPHA,
  FONT,
  PAPER,
  PAPER_DIM,
  RUST,
  RUST_BRIGHT,
  TRACKING,
  TYPE,
} from "../design/tokens";
import { HERO_ROUTE } from "./hero-route";

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

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

// The deliberately dull "any stats app" panel — cold greys, system font. The
// thing the bold claim is set against on the left of the opening's second beat.
function BoringStats({ width }: { width: number }) {
  const rows = [
    ["Distance", "18.43 km"],
    ["Moving time", "1:32:04"],
    ["Avg pace", "4:59 /km"],
    ["Elevation", "86 m"],
  ];
  return (
    <div
      style={{
        backgroundColor: "#17191c",
        border: "1px solid #24272b",
        borderRadius: 10,
        boxShadow: "0 40px 80px -30px rgba(0,0,0,0.6)",
        padding: 30,
        width,
      }}
    >
      <div
        style={{
          color: "#9aa0a6",
          fontFamily: "system-ui, sans-serif",
          fontSize: width * 0.07,
          fontWeight: 600,
          marginBottom: 18,
        }}
      >
        Activity · 03 Jun 2026
      </div>
      {rows.map(([label, value]) => (
        <div
          key={label}
          style={{
            alignItems: "center",
            borderTop: "1px solid #24272b",
            color: "#777c82",
            display: "flex",
            fontFamily: "system-ui, sans-serif",
            fontSize: width * 0.058,
            justifyContent: "space-between",
            padding: `${width * 0.04}px 0`,
          }}
        >
          <span>{label}</span>
          <span style={{ color: "#aeb4bb", fontWeight: 600 }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

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
  align?: "left" | "center" | "right";
  frame: number;
  lines: HeadlineLine[];
  size: number;
}) {
  const items = { center: "center", left: "flex-start", right: "flex-end" }[
    align
  ];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: items,
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
  spread = 0,
  visual,
}: {
  /** rust mono overline */
  label: string;
  lines: HeadlineLine[];
  side: "text-left" | "text-right";
  /** extra horizontal separation (fraction of width) — widen for wide visuals
   *  like the sports fan so the text never sits under a card */
  spread?: number;
  visual: React.ReactNode;
}) {
  const frame = useCurrentFrame();
  const { height, width } = useVideoConfig();
  const portrait = usePortrait();
  const textLeft = side === "text-left";
  const textX = (0.24 + spread) * width;
  const visualX = (0.2 + spread) * width;

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
            <BoldHeadline frame={frame} lines={lines} size={width * 0.155} />
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
          rotateY={textLeft ? 19 : -19}
          x={textLeft ? -textX : textX}
          z={-20}
        >
          <div
            style={{
              textAlign: textLeft ? "right" : "left",
              width: width * 0.46,
            }}
          >
            <Overline label={label} />
            <BoldHeadline
              align={textLeft ? "right" : "left"}
              frame={frame}
              lines={lines}
              size={width * 0.08}
            />
          </div>
        </Plane3D>
        <Plane3D rotateY={textLeft ? -9 : 9} x={textLeft ? visualX : -visualX}>
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

  const effortSize = (portrait ? 1.08 : 1.36) * TYPE.claim;
  const smallSize = effortSize * 0.26;

  // EFFORT arrives late and with a bounce — it's the word that matters.
  const intro = spring({
    config: BOUNCE_SPRING,
    durationInFrames: 20,
    fps,
    frame: frame - 16,
  });
  // …then sweeps quickly across to the second claim, overshooting and settling
  // (a bouncy container move, not a slow glide).
  const m = spring({
    config: BOUNCE_SPRING,
    durationInFrames: 22,
    fps,
    frame: frame - 96,
  });
  const mc = clamp01(m);

  // Phase-one home: left of centre, angled. Phase-two home: over on the right,
  // face-on, where the full claim assembles and the boring stats sit opposite.
  const x1 = portrait ? -width * 0.04 : -width * 0.13;
  const x2 = portrait ? 0 : width * 0.2;
  const y1 = portrait ? -height * 0.16 : -height * 0.02;
  const y2 = portrait ? -height * 0.04 : -height * 0.05;

  const ex = interpolate(m, [0, 1], [x1, x2]) + breathe(frame, 4, 240);
  const ey = interpolate(m, [0, 1], [y1, y2]);
  const erot = interpolate(mc, [0, 1], [30, 0]);
  const escale =
    interpolate(m, [0, 1], [1, 0.82]) * interpolate(intro, [0, 1], [0.5, 1]);
  const ecolor = mixHex(PAPER, RUST_BRIGHT, mc);

  const claim1Op =
    interpolate(frame, [0, 10], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }) *
    interpolate(frame, [92, 106], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  const claim2Op = interpolate(frame, [112, 132], [0, 1], {
    easing: EASE_ALPHA,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const strike = interpolate(frame, [138, 162], [0, 1], {
    easing: EASE_GLIDE,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <VideoFrame>
      <Backdrop grain variant="ink" />
      <Stage3D perspective={1150}>
        {/* The real run — a genuine GPS route — angled on the right. Phase one. */}
        <Plane3D
          opacity={claim1Op * 0.95}
          rotateY={-26}
          x={width * (portrait ? 0 : 0.24)}
          y={portrait ? -height * 0.28 : 0}
          z={-90}
        >
          <RouteDraw
            coords={HERO_ROUTE}
            durationInFrames={80}
            height={portrait ? height * 0.3 : height * 0.66}
            stroke={RUST}
            strokeWidth={8}
            width={portrait ? width * 0.72 : width * 0.44}
          />
        </Plane3D>

        {/* The boring stats slide in on the left as the claim lands right. */}
        <div
          style={{
            left: "50%",
            opacity: claim2Op,
            position: "absolute",
            top: "50%",
            transform: `translate(-50%, -50%) translate(${-width * 0.24}px, ${interpolate(claim2Op, [0, 1], [40, 0])}px) perspective(1200px) rotateY(16deg)`,
          }}
        >
          <BoringStats width={portrait ? width * 0.5 : width * 0.32} />
        </div>

        {/* "YOU PUT IN THE" — phase one, by the phase-one EFFORT. */}
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
            transform: `translate(-50%, -50%) translate(${x1}px, ${y1 - effortSize * 0.6}px) perspective(1000px) rotateY(28deg)`,
            whiteSpace: "nowrap",
          }}
        >
          You put in the
        </div>

        {/* "YOUR" — phase two, above the landed EFFORT. */}
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
            transform: `translate(-50%, -50%) translate(${x2}px, ${y2 - effortSize * 0.82 * 0.72}px)`,
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
            opacity: clamp01(intro),
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
            transform: `translate(-50%, -50%) translate(${x2}px, ${y2 + effortSize * 0.82 * 0.9}px)`,
          }}
        >
          <span
            style={{
              color: PAPER_DIM,
              fontFamily: FONT.sans,
              fontSize: effortSize * 0.2,
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
  const headlineOp = interpolate(frame, [mStart, mStart + 16], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Every source folds into the one card with a Material "container transform":
  // each tile glides to the centre and scales up while its source cross-fades
  // (fade-through) into the Altitude card, its box distorting to the card's
  // aspect, and lands with a small bounce. Staggered so they resolve in turn.
  const iconH = portrait ? 250 : 300;
  const cardH = height * (portrait ? 0.6 : 0.78);
  const tiles: {
    accent: string;
    ext: string;
    kind: "file" | "strava";
    rot: number;
    x: number;
    y: number;
  }[] = portrait
    ? [
        { accent: RUST_BRIGHT, ext: ".GPX", kind: "file", rot: 7, x: 0, y: 0 },
        {
          accent: "#2f6f86",
          ext: ".FIT",
          kind: "file",
          rot: -11,
          x: -width * 0.2,
          y: -height * 0.03,
        },
        {
          accent: "#fc5200",
          ext: "STRAVA",
          kind: "strava",
          rot: 13,
          x: width * 0.2,
          y: -height * 0.03,
        },
      ]
    : [
        {
          accent: RUST_BRIGHT,
          ext: ".GPX",
          kind: "file",
          rot: 6,
          x: width * 0.2,
          y: height * 0.02,
        },
        {
          accent: "#2f6f86",
          ext: ".FIT",
          kind: "file",
          rot: -11,
          x: width * 0.29,
          y: -height * 0.18,
        },
        {
          accent: "#fc5200",
          ext: "STRAVA",
          kind: "strava",
          rot: 13,
          x: width * 0.29,
          y: height * 0.2,
        },
      ];

  const headlineSize = (portrait ? 0.15 : 0.092) * width;

  return (
    <VideoFrame>
      <Backdrop grain variant="ink" />
      <PreloadImg src={staticFile(RIDE_PHOTO)} />
      <Stage3D perspective={1250}>
        {/* bold claim on the left, fading as the morph takes over */}
        {!portrait && (
          <Plane3D opacity={headlineOp} rotateY={19} x={-width * 0.24} z={-20}>
            <div style={{ textAlign: "right", width: width * 0.46 }}>
              <Overline label="Any file, any sport" />
              <BoldHeadline
                align="right"
                frame={frame}
                lines={[{ text: "Drop" }, { text: "it in." }]}
                size={headlineSize}
              />
            </div>
          </Plane3D>
        )}

        {tiles.map((t, i) => {
          const span = 6;
          const tg = interpolate(
            frame,
            [mStart + i * span, mEnd + i * span],
            [0, 1],
            {
              easing: EASE_GLIDE,
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }
          );
          // a small landing bounce on the scale
          const bounce =
            1 +
            0.05 *
              Math.sin(Math.min(1, Math.max(0, (tg - 0.78) / 0.22)) * Math.PI);
          const th = interpolate(tg, [0, 1], [iconH, cardH]) * bounce;
          const tw = th * interpolate(tg, [0, 1], [0.77, 0.8]);
          const tx = interpolate(tg, [0, 1], [t.x, 0]) + breathe(frame, 4, 200);
          const ty = interpolate(tg, [0, 1], [t.y, 0]);
          const trot = interpolate(tg, [0, 1], [t.rot, 0]);
          // fade-through: source clears over the first third, card arrives over
          // the rest — eased so the swap reads as one continuous surface.
          const srcOp = interpolate(tg, [0, 0.34], [1, 0], {
            easing: EASE_ALPHA,
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const cardOp = interpolate(tg, [0.3, 0.92], [0, 1], {
            easing: EASE_ALPHA,
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={t.kind + t.ext}
              style={{
                left: "50%",
                position: "absolute",
                top: "50%",
                transform: `translate(${tx}px, ${ty}px) perspective(1100px) rotateY(${trot}deg)`,
                zIndex: i,
              }}
            >
              <div
                style={{
                  left: 0,
                  opacity: srcOp,
                  position: "absolute",
                  top: 0,
                  transform: `translate(-50%, -50%) scaleX(${tw / (th * 0.77)})`,
                }}
              >
                {t.kind === "strava" ? (
                  <StravaChip coords={HERO_ROUTE} width={th * 0.77} />
                ) : (
                  <FileIcon accent={t.accent} ext={t.ext} width={th * 0.77} />
                )}
              </div>
              <div
                style={{
                  left: 0,
                  opacity: cardOp,
                  position: "absolute",
                  top: 0,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <CardScaled height={th}>
                  <ThemeCard
                    data={SAMPLE_RIDE}
                    id="altitude"
                    photoUrl={staticFile(RIDE_PHOTO)}
                  />
                </CardScaled>
              </div>
            </div>
          );
        })}
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
  const { height, width } = useVideoConfig();
  const portrait = usePortrait();
  const step = Math.floor(durationInFrames / THEME_TOUR.length);
  const active = Math.min(THEME_TOUR.length - 1, Math.floor(frame / step));
  const local = frame - active * step;
  const entry = THEME_TOUR[active];
  const isFirst = active === 0;

  // First card: hand off from the ingest morph — it sits centred (where the
  // card just formed) and quickly glides across to its place beside the
  // headline, so it animates over rather than vanishing and reappearing.
  const glide = interpolate(local, [0, 22], [0, 1], {
    easing: EASE_GLIDE,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const firstOp = interpolate(local, [step - 9, step], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Every later theme flies in from behind the viewer: huge + blurred + tipped.
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

  // The split places the visual at +0.21·w; cancel that on the first frame so it
  // starts dead-centre (matching the ingest card) at the ingest card's size.
  const firstTransform = `translateX(${interpolate(glide, [0, 1], [-width * 0.21, 0])}px) scale(${interpolate(glide, [0, 1], [1.22, 1])})`;

  const visual = (
    <div
      style={{
        filter: isFirst ? undefined : `blur(${blur}px)`,
        opacity: isFirst ? firstOp : fade,
        transform: isFirst
          ? firstTransform
          : `translateZ(${z}px) rotateY(${rot}deg)`,
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
  const { height, width } = useVideoConfig();
  const portrait = usePortrait();
  const step = Math.floor(durationInFrames / MOOD_BEATS.length);
  const active = Math.min(MOOD_BEATS.length - 1, Math.floor(frame / step));
  const local = frame - active * step;
  const beat = MOOD_BEATS[active];
  const isFirst = active === 0;
  const pop = interpolate(local, [0, 12], [0.94, 1], {
    easing: EASE_GLIDE,
    extrapolateRight: "clamp",
  });
  const swap = interpolate(local, [0, 8], [0, 1], {
    easing: EASE_ALPHA,
    extrapolateRight: "clamp",
  });
  // Hand off from the themes card (which sat on the right): the first mood
  // glides across to its home on the left rather than popping in.
  const enterX = isFirst
    ? interpolate(local, [0, 22], [width * 0.4, 0], {
        easing: EASE_GLIDE,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  const visual = (
    <div
      style={{
        opacity: isFirst ? 1 : swap,
        transform: `translateX(${enterX}px) scale(${pop})`,
      }}
    >
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
            fontSize: (portrait ? 0.085 : 0.062) * width,
            letterSpacing: TRACKING.heading,
            textTransform: "uppercase",
          }}
        >
          {frame < hold + 20 ? "Choose a single image" : "Or a whole carousel"}
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
      spread={portrait ? 0 : 0.07}
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
