import './globals.css';

export const metadata = {
  title: 'Huntington Payment Tracker — One Hour Heating & Air',
  description: 'Monthly bank status check and payment tracking system',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
