'use client';

import {
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
  useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import CameraStrip from './CameraStrip';
import NarutoPublisher from './NarutoPublisher';
import PrankOverlay from './PrankOverlay';
import ScreenStage from './ScreenStage';

export default function StudyRoom() {
  const tracks = useTracks([
    { source: Track.Source.ScreenShare, withPlaceholder: false },
    { source: Track.Source.Camera, withPlaceholder: false },
  ]);

  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();

  const screenTracks = tracks.filter((track) => track.source === Track.Source.ScreenShare);
  const cameraTracks = tracks.filter((track) => track.source === Track.Source.Camera);

  const connectedNicknames = participants.map((participant) => {
    return participant.name || participant.identity;
  });

  const handleStartScreenShare = async () => {
    try {
      await localParticipant.setScreenShareEnabled(true);
    } catch (error) {
      console.error('Failed to start screen share:', error);
      alert('Screen share could not start. Please check your browser permissions.');
    }
  };

  const handleStopScreenShare = async () => {
    try {
      await localParticipant.setScreenShareEnabled(false);
    } catch (error) {
      console.error('Failed to stop screen share:', error);
    }
  };

  const handleStartCamera = async () => {
    try {
      await localParticipant.setCameraEnabled(true);
    } catch (error) {
      console.error('Failed to start camera:', error);
      alert('Camera could not start. Please check your browser permissions.');
    }
  };

  const handleStopCamera = async () => {
    try {
      await localParticipant.setCameraEnabled(false);
    } catch (error) {
      console.error('Failed to stop camera:', error);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          padding: 12,
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          borderBottom: '1px solid #333',
          background: '#181818',
        }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={handleStartScreenShare}>Start screen share</button>
          <button onClick={handleStopScreenShare}>Stop screen share</button>
          <button onClick={handleStartCamera}>Start raw camera</button>
          <button onClick={handleStopCamera}>Stop raw camera</button>
        </div>
        <NarutoPublisher localParticipant={localParticipant} />
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 280px' }}>
        <div style={{ position: 'relative', background: '#111' }}>
          <ScreenStage tracks={screenTracks} />
          <PrankOverlay />
        </div>

        <div style={{ borderLeft: '1px solid #333', padding: 12, overflowY: 'auto' }}>
          <h3>Cameras</h3>
          <CameraStrip tracks={cameraTracks} />

          <h3 style={{ marginTop: 20 }}>Connected users</h3>
          {connectedNicknames.length ? (
            <ul style={{ margin: 0, paddingLeft: 18, color: '#ddd', lineHeight: 1.8 }}>
              {connectedNicknames.map((nickname, index) => (
                <li key={`${nickname}-${index}`}>{nickname}</li>
              ))}
            </ul>
          ) : (
            <div style={{ color: '#aaa' }}>No connected users yet.</div>
          )}
        </div>
      </div>

      <RoomAudioRenderer />
    </div>
  );
}
