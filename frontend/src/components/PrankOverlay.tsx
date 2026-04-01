'use client';

import { useEffect, useState } from 'react';

type PrankItem = {
  id: number;
  text: string;
};

export default function PrankOverlay() {
  const [items, setItems] = useState<PrankItem[]>([]);

  const addPrank = (text: string) => {
    const id = Date.now();
    setItems((prev) => [...prev, { id, text }]);

    setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 3000);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1') addPrank('😴 졸지 마');
      if (e.key === '2') addPrank('🔥 집중해');
      if (e.key === '3') addPrank('👀 보고 있다');
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <div style={{
        position: 'absolute',
        right: 16,
        top: 16,
        display: 'flex',
        gap: 8,
        zIndex: 20
      }}>
        <button onClick={() => addPrank('😴 졸지 마')}>😴</button>
        <button onClick={() => addPrank('🔥 집중해')}>🔥</button>
        <button onClick={() => addPrank('👀 보고 있다')}>👀</button>
      </div>

      {items.map((item, idx) => (
        <div
          key={item.id}
          style={{
            position: 'absolute',
            left: '50%',
            top: `${20 + idx * 12}%`,
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            padding: '10px 16px',
            borderRadius: 999,
            fontSize: 24,
            zIndex: 30
          }}
        >
          {item.text}
        </div>
      ))}
    </>
  );
}