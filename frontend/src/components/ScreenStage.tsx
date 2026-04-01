'use client';

import { useMemo, useState } from 'react';
import { VideoTrack, ParticipantName } from '@livekit/components-react';

type Props = {
  tracks: any[];
  localParticipant: any;
};

export default function ScreenStage({ tracks }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectedTrack = useMemo(() => {
    if (!tracks.length) return null;
    return tracks[selectedIndex] || tracks[0];
  }, [tracks, selectedIndex]);

  if (!tracks.length) {
    return (
      <div style={{
        color: '#fff',
        height: '100%',
        display: 'grid',
        placeItems: 'center'
      }}>
        아직 공유 중인 화면이 없습니다.
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <VideoTrack
          trackRef={selectedTrack}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            background: '#000'
          }}
        />
        <div style={{
          position: 'absolute',
          top: 12,
          left: 12,
          color: '#fff',
          background: 'rgba(0,0,0,0.5)',
          padding: '6px 10px',
          borderRadius: 8
        }}>
          <ParticipantName participant={selectedTrack.participant} />
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: 8,
        padding: 8,
        overflowX: 'auto',
        background: '#1a1a1a'
      }}>
        {tracks.map((track, index) => (
          <button
            key={track.publication?.trackSid || index}
            onClick={() => setSelectedIndex(index)}
            style={{
              minWidth: 180,
              height: 100,
              border: index === selectedIndex ? '2px solid #4f8cff' : '1px solid #444',
              background: '#000',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            <VideoTrack
              trackRef={track}
              style={{ width: '100%', height: '70%', objectFit: 'contain' }}
            />
            <div style={{ fontSize: 12, paddingTop: 4 }}>
              <ParticipantName participant={track.participant} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}