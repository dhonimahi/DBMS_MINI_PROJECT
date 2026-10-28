import type { Metadata } from 'next';
// @ts-ignore Next.js provides module declarations for global CSS imports.
import './globals.css';
export const metadata: Metadata = { title:'FreshTrack | Food Expiry & Waste', description:'Smart Food Expiry and Waste Prediction System' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
