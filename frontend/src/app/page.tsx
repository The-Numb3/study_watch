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
      <p>Enter your name to join the room.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 320 }}>
        <input
          placeholder="Your name"
          value={userName}
          onChange={(event) => setUserName(event.target.value)}
        />
        <button onClick={handleJoin}>Join room</button>
        <a
          href="/naruto-trainer.html"
          style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}
        >
          Train Naruto gesture model
        </a>
      </div>
    </main>
  );
}
