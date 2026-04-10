export const metadata = {
  title: 'Study Watch',
  description: 'LiveKit study room with Naruto clone camera effects',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
