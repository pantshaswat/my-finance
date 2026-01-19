import './globals.css';
import Providers from './providers';

export const metadata = {
  title: 'Finance Manager',
  description: 'Manage your finances with email sync',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}