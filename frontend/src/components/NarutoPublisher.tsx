'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Track } from 'livekit-client';

declare global {
  interface Window {
    tf?: any;
    Holistic?: any;
    SelfieSegmentation?: any;
  }
}

type Props = {
  localParticipant: any;
};

type CloneConfig = {
  x: number;
  y: number;
  scale: number;
  delay: number;
  smokeSpawned: boolean;
};

type SmokeState = {
  x: number;
  y: number;
  scale: number;
  start: number;
  frames: HTMLImageElement[];
};

const CUSTOM_CLONES: CloneConfig[] = [
  { x: -100, y: 100, scale: 0.9, delay: 1000, smokeSpawned: false },
  { x: 120, y: 100, scale: 0.85, delay: 1150, smokeSpawned: false },
  { x: -180, y: 140, scale: 0.8, delay: 1300, smokeSpawned: false },
  { x: -140, y: 140, scale: 0.45, delay: 1320, smokeSpawned: false },
  { x: 180, y: 160, scale: 0.7, delay: 1450, smokeSpawned: false },
  { x: 140, y: 160, scale: 0.4, delay: 1470, smokeSpawned: false },
  { x: -250, y: 140, scale: 0.7, delay: 1600, smokeSpawned: false },
  { x: -220, y: 140, scale: 0.35, delay: 1620, smokeSpawned: false },
  { x: 260, y: 160, scale: 0.65, delay: 1750, smokeSpawned: false },
  { x: -100, y: 150, scale: 0.6, delay: 2500, smokeSpawned: false },
  { x: 100, y: 150, scale: 0.6, delay: 2650, smokeSpawned: false },
  { x: -120, y: 70, scale: 0.55, delay: 2800, smokeSpawned: false },
  { x: 100, y: 70, scale: 0.5, delay: 2950, smokeSpawned: false },
  { x: -200, y: 85, scale: 0.55, delay: 3100, smokeSpawned: false },
  { x: 230, y: 85, scale: 0.5, delay: 3250, smokeSpawned: false },
  { x: -280, y: 100, scale: 0.4, delay: 3400, smokeSpawned: false },
];

const SMOKE_FOLDERS = ['smoke_1', 'smoke_2', 'smoke_3'];
const SMOKE_FRAME_COUNT = 5;
const SMOKE_DURATION = 600;
const CLONE_RESET_BUFFER = 2400;
const HEURISTIC_TRIGGER_FRAMES = 6;
const HEURISTIC_DECAY = 2;

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function distance2D(a: any, b: any) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function averagePoint(points: any[]) {
  const total = points.reduce(
    (acc, point) => {
      acc.x += point.x;
      acc.y += point.y;
      return acc;
    },
    { x: 0, y: 0 },
  );

  return {
    x: total.x / points.length,
    y: total.y / points.length,
  };
}

function fingerExtended(lm: any[], mcp: number, pip: number, dip: number, tip: number) {
  return (
    lm[tip].y < lm[pip].y &&
    lm[tip].y < lm[mcp].y &&
    distance2D(lm[tip], lm[dip]) > 0.015
  );
}

function heuristicGestureScore(right: any[] | undefined, left: any[] | undefined) {
  if (!right || !left) return 0;

  const rightPalm = averagePoint([right[0], right[5], right[9], right[13], right[17]]);
  const leftPalm = averagePoint([left[0], left[5], left[9], left[13], left[17]]);

  const palmGapScore = clamp01(1 - distance2D(rightPalm, leftPalm) / 0.18);
  const wristGapScore = clamp01(1 - distance2D(right[0], left[0]) / 0.24);
  const heightAlignmentScore = clamp01(1 - Math.abs(rightPalm.y - leftPalm.y) / 0.12);
  const indexGapScore = clamp01(1 - distance2D(right[8], left[8]) / 0.16);
  const middleGapScore = clamp01(1 - distance2D(right[12], left[12]) / 0.18);

  const rightExtendedCount = [
    fingerExtended(right, 5, 6, 7, 8),
    fingerExtended(right, 9, 10, 11, 12),
    fingerExtended(right, 13, 14, 15, 16),
    fingerExtended(right, 17, 18, 19, 20),
  ].filter(Boolean).length;

  const leftExtendedCount = [
    fingerExtended(left, 5, 6, 7, 8),
    fingerExtended(left, 9, 10, 11, 12),
    fingerExtended(left, 13, 14, 15, 16),
    fingerExtended(left, 17, 18, 19, 20),
  ].filter(Boolean).length;

  const postureScore = (rightExtendedCount + leftExtendedCount) / 8;

  return (
    palmGapScore * 0.28 +
    wristGapScore * 0.16 +
    heightAlignmentScore * 0.18 +
    indexGapScore * 0.14 +
    middleGapScore * 0.12 +
    postureScore * 0.12
  );
}

function normalizeHand(lm: any[]) {
  const wrist = lm[0];
  const mcp = lm[9];
  const scale =
    Math.sqrt(
      (mcp.x - wrist.x) ** 2 + (mcp.y - wrist.y) ** 2 + (mcp.z - wrist.z) ** 2,
    ) || 1;

  const output: number[] = [];
  for (let i = 0; i < 21; i++) {
    output.push((lm[i].x - wrist.x) / scale);
    output.push((lm[i].y - wrist.y) / scale);
    output.push((lm[i].z - wrist.z) / scale);
  }
  return output;
}

function extractGestureInput(right: any[], left: any[]) {
  return [...normalizeHand(right), ...normalizeHand(left)];
}

async function loadScript(src: string) {
  const existing = document.querySelector(`script[data-src="${src}"]`) as
    | HTMLScriptElement
    | null;

  if (existing) {
    if (existing.dataset.ready === 'true') return;
    await new Promise<void>((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), {
        once: true,
      });
    });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.src = src;
    script.onload = () => {
      script.dataset.ready = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function ensureNarutoLibraries() {
  await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/holistic/holistic.js');
  await loadScript(
    'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js',
  );
}

export default function NarutoPublisher({ localParticipant }: Props) {
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewRef = useRef<HTMLCanvasElement | null>(null);
  const sourceStreamRef = useRef<MediaStream | null>(null);
  const processedTrackRef = useRef<MediaStreamTrack | null>(null);
  const publishedTrackRef = useRef<any>(null);
  const gestureModelRef = useRef<any>(null);
  const cloneTimeoutRef = useRef<number | null>(null);
  const heuristicMatchFramesRef = useRef(0);
  const activeSmokesRef = useRef<SmokeState[]>([]);
  const clonesRef = useRef<CloneConfig[]>(CUSTOM_CLONES.map((clone) => ({ ...clone })));
  const stateRef = useRef({
    mask: null as CanvasImageSource | null,
    clonesTriggered: false,
    cloneStartTime: 0,
    stopped: false,
  });

  const [isReady, setIsReady] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [status, setStatus] = useState('Naruto effect is loading.');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [hasGestureModel, setHasGestureModel] = useState(false);

  const maxCloneDelay = useMemo(
    () => Math.max(...CUSTOM_CLONES.map((clone) => clone.delay)),
    [],
  );

  const resetCloneSequence = () => {
    stateRef.current.clonesTriggered = false;
    stateRef.current.cloneStartTime = 0;
    heuristicMatchFramesRef.current = 0;
    clonesRef.current = CUSTOM_CLONES.map((clone) => ({ ...clone, smokeSpawned: false }));
    activeSmokesRef.current = [];
    if (cloneTimeoutRef.current) {
      window.clearTimeout(cloneTimeoutRef.current);
      cloneTimeoutRef.current = null;
    }
  };

  const scheduleCloneReset = () => {
    if (cloneTimeoutRef.current) window.clearTimeout(cloneTimeoutRef.current);
    cloneTimeoutRef.current = window.setTimeout(() => {
      resetCloneSequence();
    }, maxCloneDelay + CLONE_RESET_BUFFER);
  };

  const triggerCloneSequence = () => {
    if (!isActive) return;
    stateRef.current.clonesTriggered = true;
    stateRef.current.cloneStartTime = performance.now();
    clonesRef.current = CUSTOM_CLONES.map((clone) => ({ ...clone, smokeSpawned: false }));
    activeSmokesRef.current = [];
    scheduleCloneReset();
  };

  const unpublishExistingCameraTrack = async () => {
    const cameraPublication =
      localParticipant.getTrackPublication?.(Track.Source.Camera) ??
      Array.from(localParticipant.videoTrackPublications.values()).find(
        (publication: any) => publication.source === Track.Source.Camera,
      );

    if (cameraPublication?.track) {
      await localParticipant.unpublishTrack(cameraPublication.track);
    }
  };

  const stopNarutoCamera = async () => {
    stateRef.current.stopped = true;

    if (cloneTimeoutRef.current) {
      window.clearTimeout(cloneTimeoutRef.current);
      cloneTimeoutRef.current = null;
    }

    try {
      if (publishedTrackRef.current) {
        await localParticipant.unpublishTrack(publishedTrackRef.current.track);
      } else if (processedTrackRef.current) {
        await localParticipant.unpublishTrack(processedTrackRef.current);
      }
    } catch (error) {
      console.error('Failed to unpublish Naruto camera track:', error);
    }

    publishedTrackRef.current = null;

    if (processedTrackRef.current) {
      processedTrackRef.current.stop();
      processedTrackRef.current = null;
    }

    if (sourceStreamRef.current) {
      sourceStreamRef.current.getTracks().forEach((track) => track.stop());
      sourceStreamRef.current = null;
    }

    if (hiddenVideoRef.current) {
      hiddenVideoRef.current.pause();
      hiddenVideoRef.current.srcObject = null;
    }

    const canvases = [canvasRef.current, previewRef.current];
    canvases.forEach((canvas) => {
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    resetCloneSequence();
    setConfidence(null);
    setIsActive(false);
    setStatus(
      hasGestureModel
        ? 'Naruto camera stopped. Gesture trigger will be available next time.'
        : 'Naruto camera stopped. Heuristic auto trigger will be available next time.',
    );
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        await ensureNarutoLibraries();
        if (cancelled) return;

        try {
          await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs');

          if (window.tf?.loadLayersModel) {
            gestureModelRef.current = await window.tf.loadLayersModel('/naruto/gesture-model.json');
            if (!cancelled) {
              setHasGestureModel(true);
              setStatus('Naruto effect is ready. Gesture trigger enabled.');
            }
          } else {
            throw new Error('TensorFlow.js did not initialize.');
          }
        } catch (error) {
          gestureModelRef.current = null;
          console.warn('Falling back to heuristic trigger mode:', error);
          if (!cancelled) {
            setHasGestureModel(false);
            setStatus('Naruto effect is ready. Auto trigger is running in heuristic mode.');
          }
        }

        if (!cancelled) setIsReady(true);
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setStatus('Failed to load Naruto effect libraries.');
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      void stopNarutoCamera();
    };
  }, []);

  const startNarutoCamera = async () => {
    if (!isReady || isStarting || isActive) return;

    setIsStarting(true);
    setStatus('Starting Naruto camera...');
    stateRef.current.stopped = false;

    try {
      const video = hiddenVideoRef.current;
      const canvas = canvasRef.current;
      const previewCanvas = previewRef.current;

      if (!video || !canvas || !previewCanvas) {
        throw new Error('Naruto camera elements are missing.');
      }

      const rawStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      sourceStreamRef.current = rawStream;
      video.srcObject = rawStream;
      await video.play();

      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      canvas.width = width;
      canvas.height = height;
      previewCanvas.width = width;
      previewCanvas.height = height;

      const ctx = canvas.getContext('2d');
      const previewCtx = previewCanvas.getContext('2d');
      if (!ctx || !previewCtx) throw new Error('Naruto canvas context is unavailable.');

      const offscreen = document.createElement('canvas');
      offscreen.width = width;
      offscreen.height = height;
      const offscreenCtx = offscreen.getContext('2d');
      if (!offscreenCtx) throw new Error('Offscreen canvas context is unavailable.');

      const selfie = new window.SelfieSegmentation({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
      });
      selfie.setOptions({ modelSelection: 1 });
      selfie.onResults((result: any) => {
        stateRef.current.mask = result.segmentationMask ?? null;
      });

      const holistic = new window.Holistic({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`,
      });
      holistic.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
      });

      const spawnSmoke = (x: number, y: number, scale: number) => {
        const folder = SMOKE_FOLDERS[Math.floor(Math.random() * SMOKE_FOLDERS.length)];
        const frames: HTMLImageElement[] = [];
        for (let i = 1; i <= SMOKE_FRAME_COUNT; i++) {
          const image = new Image();
          image.src = `/naruto/${folder}/${i}.png`;
          frames.push(image);
        }

        activeSmokesRef.current.push({
          x,
          y,
          scale: scale * 1.2,
          start: performance.now(),
          frames,
        });
      };

      const drawSmokes = () => {
        const now = performance.now();
        for (let i = activeSmokesRef.current.length - 1; i >= 0; i--) {
          const smoke = activeSmokesRef.current[i];
          const elapsed = now - smoke.start;
          const frameDuration = SMOKE_DURATION / SMOKE_FRAME_COUNT;
          const frameIndex = Math.floor(elapsed / frameDuration);

          if (frameIndex >= smoke.frames.length) {
            activeSmokesRef.current.splice(i, 1);
            continue;
          }

          const image = smoke.frames[frameIndex];
          ctx.save();
          ctx.translate(smoke.x, smoke.y);
          ctx.scale(smoke.scale, smoke.scale);
          ctx.drawImage(image, -image.width / 2, -image.height / 2);
          ctx.restore();
        }
      };

      const grabPerson = () => {
        offscreenCtx.clearRect(0, 0, width, height);

        if (stateRef.current.mask) {
          offscreenCtx.drawImage(stateRef.current.mask, 0, 0, width, height);
          offscreenCtx.globalCompositeOperation = 'source-in';
        }

        offscreenCtx.drawImage(video, 0, 0, width, height);
        offscreenCtx.globalCompositeOperation = 'source-over';
        return offscreen;
      };

      const drawClones = (person: HTMLCanvasElement) => {
        const now = performance.now();
        const sorted = [...clonesRef.current].sort((a, b) => b.delay - a.delay);

        sorted.forEach((clone) => {
          if (now - stateRef.current.cloneStartTime >= clone.delay) {
            ctx.save();
            ctx.translate(clone.x + width * (1 - clone.scale) / 2, clone.y);
            ctx.scale(clone.scale, clone.scale);
            ctx.drawImage(person, 0, 0);
            ctx.restore();
          }
        });

        ctx.drawImage(person, 0, 0);
      };

      const predictGesture = (right: any[] | undefined, left: any[] | undefined) => {
        if (!right || !left) {
          heuristicMatchFramesRef.current = 0;
          setConfidence(null);
          return false;
        }

        if (!gestureModelRef.current) {
          const score = heuristicGestureScore(right, left);
          setConfidence(score);

          if (score >= 0.82) {
            heuristicMatchFramesRef.current += 1;
          } else {
            heuristicMatchFramesRef.current = Math.max(
              0,
              heuristicMatchFramesRef.current - HEURISTIC_DECAY,
            );
          }

          return heuristicMatchFramesRef.current >= HEURISTIC_TRIGGER_FRAMES;
        }

        const input = window.tf.tensor2d([extractGestureInput(right, left)]);
        const prediction = gestureModelRef.current.predict(input);
        const probability = prediction.dataSync()[0];
        input.dispose();
        prediction.dispose?.();
        setConfidence(probability);
        return probability > 0.999;
      };

      holistic.onResults((result: any) => {
        if (stateRef.current.stopped) return;

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(video, 0, 0, width, height);

        const person = grabPerson();

        if (
          !stateRef.current.clonesTriggered &&
          predictGesture(result.rightHandLandmarks, result.leftHandLandmarks)
        ) {
          triggerCloneSequence();
        }

        if (stateRef.current.clonesTriggered) {
          const now = performance.now();
          clonesRef.current.forEach((clone) => {
            if (!clone.smokeSpawned && now - stateRef.current.cloneStartTime >= clone.delay) {
              clone.smokeSpawned = true;
              const centerX = clone.x + width / 2;
              const centerY = clone.y + height / 2 - 40;
              spawnSmoke(centerX - 15, centerY, clone.scale);
              spawnSmoke(centerX + 15, centerY, clone.scale);
            }
          });

          drawClones(person);
          drawSmokes();
        } else {
          ctx.drawImage(person, 0, 0);
        }

        previewCtx.clearRect(0, 0, width, height);
        previewCtx.drawImage(canvas, 0, 0, width, height);
      });

      const processedStream = canvas.captureStream(20);
      const processedTrack = processedStream.getVideoTracks()[0];
      if (!processedTrack) throw new Error('Failed to create processed video track.');

      processedTrackRef.current = processedTrack;
      await unpublishExistingCameraTrack();

      publishedTrackRef.current = await localParticipant.publishTrack(processedTrack, {
        name: 'naruto-camera',
        source: Track.Source.Camera,
      });

      const renderLoop = async () => {
        if (stateRef.current.stopped || !video.srcObject) return;
        await selfie.send({ image: video });
        await holistic.send({ image: video });
        window.requestAnimationFrame(() => {
          void renderLoop();
        });
      };

      resetCloneSequence();
      setConfidence(null);
      setIsActive(true);
      setStatus(
        hasGestureModel
          ? 'Naruto camera is live. Make the gesture or trigger manually.'
          : 'Naruto camera is live. Automatic heuristic trigger is enabled.',
      );

      void renderLoop();
    } catch (error) {
      console.error('Failed to start Naruto camera:', error);
      await stopNarutoCamera();
      setStatus('Failed to start Naruto camera. Check camera permissions.');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => void startNarutoCamera()}
          disabled={!isReady || isActive || isStarting}
        >
          Naruto camera on
        </button>
        <button onClick={() => void stopNarutoCamera()} disabled={!isActive}>
          Naruto camera off
        </button>
        <button onClick={triggerCloneSequence} disabled={!isActive}>
          Shadow clone trigger
        </button>
      </div>

      <div style={{ color: '#bbb', fontSize: 13 }}>
        {status}
        {confidence !== null ? ` Confidence ${(confidence * 100).toFixed(1)}%` : ''}
      </div>

      <div
        style={{
          width: 220,
          border: '1px solid #333',
          borderRadius: 12,
          overflow: 'hidden',
          background: '#050505',
        }}
      >
        <canvas
          ref={previewRef}
          style={{ width: '100%', display: 'block', aspectRatio: '4 / 3', background: '#000' }}
        />
      </div>

      <video ref={hiddenVideoRef} muted playsInline style={{ display: 'none' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
