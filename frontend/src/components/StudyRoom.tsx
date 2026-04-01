'use client';

import {
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  useLocalParticipant
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import ScreenStage from './ScreenStage';
import CameraStrip from './CameraStrip';
import PrankOverlay from './PrankOverlay';

export default function StudyRoom() {
  const tracks = useTracks([
    { source: Track.Source.ScreenShare, withPlaceholder: false },
    { source: Track.Source.Camera, withPlaceholder: false }
  ]);

  const { localParticipant } = useLocalParticipant();

  const screenTracks = tracks.filter((t) => t.source === Track.Source.ScreenShare);
  const cameraTracks = tracks.filter((t) => t.source === Track.Source.Camera);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 280px' }}>
        <div style={{ position: 'relative', background: '#111' }}>
          <ScreenStage tracks={screenTracks} localParticipant={localParticipant} />
          <PrankOverlay />
        </div>

        <div style={{ borderLeft: '1px solid #333', padding: 12, overflowY: 'auto' }}>
          <h3>캠</h3>
          <CameraStrip tracks={cameraTracks} />
        </div>
      </div>

      <div style={{ borderTop: '1px solid #333' }}>
        <ControlBar
          controls={{
            microphone: false,
            camera: true,
            chat: false,
            screenShare: true,
            leave: true
          }}
        />
      </div>

      <RoomAudioRenderer />
    </div>
  );
}