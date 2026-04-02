'use client';

import {
  RoomAudioRenderer,
  useTracks,
  useLocalParticipant,
  useParticipants,
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
  const participants = useParticipants();

  const screenTracks = tracks.filter((t) => t.source === Track.Source.ScreenShare);
  const cameraTracks = tracks.filter((t) => t.source === Track.Source.Camera);

  const nicknameFromIdentity = (identity: string) => {
    const match = identity.match(/^(.*)-\d{10,}$/);
    return match?.[1] || identity;
  };

  const connectedNicknames = participants.map((participant) => {
    return participant.name || nicknameFromIdentity(participant.identity);
  });

  const handleStartScreenShare = async () => {
    try {
      await localParticipant.setScreenShareEnabled(true);
    } catch (err) {
      console.error('화면 공유 시작 실패:', err);
      alert('화면 공유를 시작하지 못했습니다. 브라우저 권한을 확인해주세요.');
    }
  };

  const handleStopScreenShare = async () => {
    try {
      await localParticipant.setScreenShareEnabled(false);
    } catch (err) {
      console.error('화면 공유 종료 실패:', err);
    }
  };

  const handleStartCamera = async () => {
    try {
      await localParticipant.setCameraEnabled(true);
    } catch (err) {
      console.error('카메라 시작 실패:', err);
      alert('카메라를 시작하지 못했습니다. 브라우저 권한을 확인해주세요.');
    }
  };

  const handleStopCamera = async () => {
    try {
      await localParticipant.setCameraEnabled(false);
    } catch (err) {
      console.error('카메라 종료 실패:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          padding: 12,
          display: 'flex',
          gap: 8,
          borderBottom: '1px solid #333',
          background: '#181818'
        }}
      >
        <button onClick={handleStartScreenShare}>화면 공유 시작</button>
        <button onClick={handleStopScreenShare}>화면 공유 종료</button>
        <button onClick={handleStartCamera}>캠 켜기</button>
        <button onClick={handleStopCamera}>캠 끄기</button>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 280px' }}>
        <div style={{ position: 'relative', background: '#111' }}>
          <ScreenStage tracks={screenTracks} localParticipant={localParticipant} />
          <PrankOverlay />
        </div>

        <div style={{ borderLeft: '1px solid #333', padding: 12, overflowY: 'auto' }}>
          <h3>캠</h3>
          <CameraStrip tracks={cameraTracks} />

          <h3 style={{ marginTop: 20 }}>현재 접속자</h3>
          {connectedNicknames.length ? (
            <ul style={{ margin: 0, paddingLeft: 18, color: '#ddd', lineHeight: 1.8 }}>
              {connectedNicknames.map((nickname, index) => (
                <li key={`${nickname}-${index}`}>{nickname}</li>
              ))}
            </ul>
          ) : (
            <div style={{ color: '#aaa' }}>접속 중인 사용자가 없습니다.</div>
          )}
        </div>
      </div>

      <RoomAudioRenderer />
    </div>
  );
}