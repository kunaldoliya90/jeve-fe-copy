/** Upload a journal entry workbook, and see the ones already reviewed. */

import { useNavigate } from 'react-router';

import { PageHeader, Reveal } from '@/components/common';
import { paths } from '@/config/paths';
import { ReviewList, UploadPanel } from '@/features/reviews';

export default function ReviewsPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 px-4 py-10 sm:py-14">
      <PageHeader
        eyebrow="Record to report"
        title="Journal entry review"
        description="Upload a workbook. Every cell and formula is read, the arithmetic is re-performed in Python, and anything that cannot be proven goes to a person rather than being passed."
      />

      <Reveal as="div" index={0}>
        <UploadPanel
          onAccepted={(reviewId) => {
            void navigate(paths.app.reviewDetail.getHref(reviewId));
          }}
        />
      </Reveal>

      <Reveal as="section" index={1} aria-labelledby="recent-heading" className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="recent-heading" className="text-sm font-semibold text-foreground">
            Recent reviews
          </h2>
          <p className="text-xs text-subtle-foreground">
            Newest first, including ones still running
          </p>
        </div>
        <ReviewList />
      </Reveal>
    </div>
  );
}
