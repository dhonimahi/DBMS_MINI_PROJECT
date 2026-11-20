import { requirePageAccount } from '@/lib/account';
import StaffManager from './staff-manager';

export default async function StaffPage() {
  await requirePageAccount('admin');
  return <StaffManager />;
}
