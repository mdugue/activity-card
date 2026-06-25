"use client";

import {
  ArrowCounterClockwiseIcon,
  CornersInIcon,
  CornersOutIcon,
  PauseIcon,
  PlayIcon,
  SpeakerSimpleHighIcon,
  SpeakerSimpleSlashIcon,
} from "@phosphor-icons/react";
import { Player, type PlayerRef } from "@remotion/player";
import {
  type ComponentType,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useCoarsePointer } from "@/hooks/use-coarse-pointer";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  /** start from the top once the player scrolls into view (the landing hero) */
  autoPlayOnView?: boolean;
  className?: string;
  component: ComponentType;
  compositionHeight: number;
  compositionWidth: number;
  durationInFrames: number;
  fps: number;
  loop?: boolean;
  /** the frame shown while paused / before first play (a flattering still) */
  posterFrame?: number;
}

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

function clock(frames: number, fps: number): string {
  const total = Math.max(0, Math.round(frames / fps));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const ICON = 22;

export function VideoPlayer({
  autoPlayOnView = false,
  className,
  component,
  compositionHeight,
  compositionWidth,
  durationInFrames,
  fps,
  loop = false,
  posterFrame = 0,
}: VideoPlayerProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [player, setPlayer] = useState<PlayerRef | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [frame, setFrame] = useState(posterFrame);
  const [cssFullscreen, setCssFullscreen] = useState(false);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const startedRef = useRef(false);
  const coarse = useCoarsePointer();
  const isFullscreen = cssFullscreen || nativeFullscreen;

  // Subscribe to the player's state once its ref is attached.
  useEffect(() => {
    if (!player) {
      return;
    }
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    const onFrame = (e: { detail: { frame: number } }) =>
      setFrame(e.detail.frame);
    const onVolume = () => setMuted(player.isMuted());
    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);
    player.addEventListener("ended", onEnded);
    player.addEventListener("frameupdate", onFrame);
    player.addEventListener("volumechange", onVolume);
    return () => {
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
      player.removeEventListener("ended", onEnded);
      player.removeEventListener("frameupdate", onFrame);
      player.removeEventListener("volumechange", onVolume);
    };
  }, [player]);

  // Start from the beginning the first time the band is actually on screen, and
  // pause when it leaves — so the hero opens at frame 0 exactly when you see it.
  useEffect(() => {
    const el = wrapRef.current;
    if (!(player && el && autoPlayOnView) || reducedMotion()) {
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.55) {
          // Muted so the browser allows non-gesture autoplay (clips are silent
          // anyway); the viewer can unmute from the controls.
          player.mute();
          if (!startedRef.current) {
            startedRef.current = true;
            player.seekTo(0);
          }
          player.play();
        } else if (entry.intersectionRatio < 0.15) {
          player.pause();
        }
      },
      { threshold: [0, 0.15, 0.55, 1] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [player, autoPlayOnView]);

  // Native fullscreen can flip via the Escape key too — track the document.
  useEffect(() => {
    const onChange = () =>
      setNativeFullscreen(document.fullscreenElement === wrapRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const restart = useCallback(() => {
    player?.seekTo(0);
    player?.play();
  }, [player]);

  const toggleFullscreen = useCallback(() => {
    const el = wrapRef.current;
    if (!el) {
      return;
    }
    if (isFullscreen) {
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      }
      setCssFullscreen(false);
      return;
    }
    // Native where supported (desktop, Android, iPad); a fixed-overlay fallback
    // everywhere it isn't (notably iPhone Safari), so the button always works.
    if (document.fullscreenEnabled && el.requestFullscreen) {
      el.requestFullscreen().catch(() => setCssFullscreen(true));
    } else {
      setCssFullscreen(true);
    }
  }, [isFullscreen]);

  // Always visible on touch (no hover) and whenever paused; otherwise revealed
  // on hover via CSS so the div needs no mouse handlers (keeps a11y happy).
  const forceShow = coarse || !playing;
  const progress = durationInFrames > 1 ? frame / (durationInFrames - 1) : 0;

  return (
    <div
      className={cn(
        "group relative overflow-hidden bg-foreground",
        cssFullscreen
          ? "fixed inset-0 z-[100] flex items-center justify-center"
          : className
      )}
      ref={wrapRef}
    >
      <Player
        acknowledgeRemotionLicense
        clickToPlay
        component={component}
        compositionHeight={compositionHeight}
        compositionWidth={compositionWidth}
        controls={false}
        durationInFrames={durationInFrames}
        fps={fps}
        initialFrame={posterFrame}
        loop={loop}
        ref={setPlayer}
        spaceKeyToPlayOrPause
        style={{ height: "100%", width: "100%" }}
      />

      {/* Custom controls — duotone Phosphor icons, matching the app chrome. */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-4 pt-10 pb-3 transition-opacity duration-300 group-hover:opacity-100",
          forceShow ? "opacity-100" : "opacity-0"
        )}
      >
        {/* scrubber */}
        <button
          aria-label="Seek"
          className="group/seek pointer-events-auto h-2.5 w-full cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            player?.seekTo(
              Math.round(
                Math.min(1, Math.max(0, ratio)) * (durationInFrames - 1)
              )
            );
          }}
          type="button"
        >
          <span className="block h-1 w-full rounded-full bg-white/25 transition-all group-hover/seek:h-1.5">
            <span
              className="block h-full rounded-full bg-primary"
              style={{ width: `${progress * 100}%` }}
            />
          </span>
        </button>

        <div className="pointer-events-auto flex items-center gap-1 text-background">
          <ControlButton
            label={playing ? "Pause" : "Play"}
            onClick={() => player?.toggle()}
          >
            {playing ? (
              <PauseIcon size={ICON} weight="duotone" />
            ) : (
              <PlayIcon size={ICON} weight="duotone" />
            )}
          </ControlButton>
          <ControlButton label="Restart from beginning" onClick={restart}>
            <ArrowCounterClockwiseIcon size={ICON} weight="duotone" />
          </ControlButton>
          <ControlButton
            label={muted ? "Unmute" : "Mute"}
            onClick={() =>
              player?.isMuted() ? player.unmute() : player?.mute()
            }
          >
            {muted ? (
              <SpeakerSimpleSlashIcon size={ICON} weight="duotone" />
            ) : (
              <SpeakerSimpleHighIcon size={ICON} weight="duotone" />
            )}
          </ControlButton>
          <span className="ml-1 font-medium font-mono text-[11px] text-background/80 tabular-nums tracking-wide">
            {clock(frame, fps)} / {clock(durationInFrames, fps)}
          </span>
          <span className="flex-1" />
          <ControlButton
            label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <CornersInIcon size={ICON} weight="duotone" />
            ) : (
              <CornersOutIcon size={ICON} weight="duotone" />
            )}
          </ControlButton>
        </div>
      </div>
    </div>
  );
}

function ControlButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="inline-flex size-9 items-center justify-center rounded-full text-background/85 transition-colors hover:bg-white/15 hover:text-background"
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}
