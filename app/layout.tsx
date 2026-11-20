// Import the type that describes a Next.js page's metadata.
import { AccountProvider } from './account-context';
import { currentAccount } from '@/lib/account';
import type { Metadata } from 'next';
// Line 7 — Load the stylesheet shared by every route.
// @ts-ignore Next.js provides module declarations for global CSS imports.
import './globals.css';
// Set the browser tab title, page description and FreshTrack favicon.
export const metadata: Metadata = { title:'FreshTrack | Food Expiry & Waste', description:'Smart Food Expiry and Waste Prediction System', icons: { icon: '/freshtrack-mark.svg' } };
// Wrap every page in the root English-language HTML document.
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const account = await currentAccount();
  return <html lang="en"><body><AccountProvider account={account}>{children}</AccountProvider></body></html>;
}
