export async function fetchToken(roomName: string, userName: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ roomName, userName })
  });

  if (!res.ok) {
    throw new Error('Failed to fetch token');
  }

  return res.json() as Promise<{ token: string; wsUrl: string }>;
}