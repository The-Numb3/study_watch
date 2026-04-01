'use client';

import { VideoTrack, ParticipantName } from '@livekit/components-react';

type Props = {
  tracks: any[];
};

export default function CameraStrip({ tracks }: Props) {
  if (!tracks.length) {
    return <div style={{ color: '#aaa' }}>켜진 캠이 없습니다.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {tracks.map((track, index) => (
        <div
          key={track.publication?.trackSid || index}
          style={{
            border: '1px solid #444',
            borderRadius: 10,
            padding: 8,
            background: '#1b1b1b'
          }}
        >
          <VideoTrack
            trackRef={track}
            style={{
              width: '100%',
              aspectRatio: '16 / 9',
              objectFit: 'cover',
              borderRadius: 8,
              background: '#000'
            }}
          />
          <div style={{ color: '#fff', marginTop: 6, fontSize: 13 }}>
            <ParticipantName participant={track.participant} />
          </div>
        </div>
      ))}
    </div>
  );
}