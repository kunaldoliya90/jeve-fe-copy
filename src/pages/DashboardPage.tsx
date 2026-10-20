import { LayoutDashboard } from 'lucide-react';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { useAuth } from '@/features/auth';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" description={user ? `Signed in as ${user.email}` : undefined} />

      <EmptyState
        icon={LayoutDashboard}
        title="Nothing here yet"
        description="Add a feature under src/features and compose it into this page."
      />
    </div>
  );
}
