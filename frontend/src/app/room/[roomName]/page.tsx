'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { LiveKitRoom } from '@livekit/components-react';
import '@livekit/components-styles/dist/index.css';
import { fetchToken } from '@/lib/api';
import StudyRoom from '@/components/StudyRoom';

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const roomName = decodeURIComponent(params.roomName as string);
  const userName = searchParams.get('user') || 'anonymous';

  const [token, setToken] = useState('');
  const [wsUrl, setWsUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const result = await fetchToken(roomName, userName);
        setToken(result.token);
        setWsUrl(result.wsUrl);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [roomName, userName]);

  if (loading) return <div style={{ padding: 20 }}>연결 준비 중...</div>;
  if (!token || !wsUrl) return <div style={{ padding: 20 }}>토큰 발급 실패</div>;

  return (
    <LiveKitRoom
      video={true}
      audio={false}
      token={token}
      serverUrl={wsUrl}
      connect={true}
      data-lk-theme="default"
      style={{ height: '100vh' }}
    >
      <StudyRoom />
    </LiveKitRoom>
  );
}