'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { LiveKitRoom } from '@livekit/components-react';
import StudyRoom from '@/components/StudyRoom';
import { fetchToken } from '@/lib/api';

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
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [roomName, userName]);

  if (loading) return <div style={{ padding: 20 }}>Joining room...</div>;
  if (!token || !wsUrl) return <div style={{ padding: 20 }}>Failed to fetch room token.</div>;

  return (
    <LiveKitRoom
      video={false}
      audio={false}
      token={token}
      serverUrl={wsUrl}
      connect={true}
      style={{ height: '100vh' }}
    >
      <StudyRoom />
    </LiveKitRoom>
  );
}
