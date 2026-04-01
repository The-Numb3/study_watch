'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [userName, setUserName] = useState('');
  const router = useRouter();

  const handleJoin = () => {
    if (!userName.trim()) return;
    router.push(`/room/main?user=${encodeURIComponent(userName)}`);
  };

  return (
    <main style={{ padding: 40 }}>
      <h1>Study Watch</h1>
      <p>닉네임만 입력하고 바로 입장</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 320 }}>
        <input
          placeholder="닉네임"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
        />
        <button onClick={handleJoin}>입장하기</button>
      </div>
    </main>
  );
}