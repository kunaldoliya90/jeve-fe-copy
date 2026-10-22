/** What a journal entry of this type is checked on, before any review runs. */

import { PageHeader } from '@/components/common';
import { ReviewPlan } from '@/features/reviews';

export default function ReviewPlanPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10 sm:py-14">
      <PageHeader
        eyebrow="Methodology"
        title="What is checked"
        description="The review plan, read from the same versioned files the engine runs from, so this page and the engine cannot disagree about what will be tested."
      />
      <ReviewPlan />
    </div>
  );
}
