import { requirePageAccount } from '@/lib/account';

export default async function WasteLayout({ children }: { children: React.ReactNode }) {
  await requirePageAccount();
  return children;
}
