import { requirePageAccount } from '@/lib/account';

export default async function InventoryLayout({ children }: { children: React.ReactNode }) {
  await requirePageAccount();
  return children;
}
