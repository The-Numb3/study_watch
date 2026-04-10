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

    window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 3000);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === '1') addPrank('Focus mode');
      if (event.key === '2') addPrank('Eyes on the screen');
      if (event.key === '3') addPrank('The teacher is watching');
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <div
        style={{
          position: 'absolute',
          right: 16,
          top: 16,
          display: 'flex',
          gap: 8,
          zIndex: 20,
        }}
      >
        <button onClick={() => addPrank('Focus mode')}>Focus</button>
        <button onClick={() => addPrank('Eyes on the screen')}>Eyes</button>
        <button onClick={() => addPrank('The teacher is watching')}>Watch</button>
      </div>

      {items.map((item, index) => (
        <div
          key={item.id}
          style={{
            position: 'absolute',
            left: '50%',
            top: `${20 + index * 12}%`,
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            padding: '10px 16px',
            borderRadius: 999,
            fontSize: 24,
            zIndex: 30,
          }}
        >
          {item.text}
        </div>
      ))}
    </>
  );
}
