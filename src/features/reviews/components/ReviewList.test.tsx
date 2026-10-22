import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '@/testing/mocks/server';
import { renderWithProviders, screen, waitFor, within } from '@/testing/test-utils';

import { ReviewList } from './ReviewList';

const REVIEWS = '/api/jeve/reviews/';

function rowFor(fileName: string): HTMLElement {
  const row = screen.getByText(fileName).closest('li');
  if (!row) throw new Error(`No row for ${fileName}`);
  return row;
}

async function openDeleteFor(fileName: string, user: ReturnType<typeof setup>['user']) {
  await user.click(
    within(rowFor(fileName)).getByRole('button', { name: `Delete the review of ${fileName}` }),
  );
}

function setup() {
  return renderWithProviders(<ReviewList />);
}

describe('ReviewList', () => {
  it('lists the reviews the server returns', async () => {
    setup();

    expect(await screen.findByText('236264.xlsx')).toBeInTheDocument();
    expect(screen.getByText('305800.xlsx')).toBeInTheDocument();
  });

  it('offers a delete on a finished review', async () => {
    setup();
    await screen.findByText('236264.xlsx');

    expect(
      within(rowFor('236264.xlsx')).getByRole('button', {
        name: 'Delete the review of 236264.xlsx',
      }),
    ).toBeEnabled();
  });

  it('will not offer to delete a review that is still running', async () => {
    // The server refuses it, so the UI must not invite a click that is certain
    // to fail — the button stays, disabled, rather than vanishing.
    setup();
    await screen.findByText('in-flight.xlsx');

    expect(
      within(rowFor('in-flight.xlsx')).getByRole('button', {
        name: 'Delete the review of in-flight.xlsx',
      }),
    ).toBeDisabled();
  });

  it('asks before deleting, and names what is about to go', async () => {
    const { user } = setup();
    await screen.findByText('236264.xlsx');

    await openDeleteFor('236264.xlsx', user);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Delete this review?')).toBeInTheDocument();
    expect(within(dialog).getByText('236264.xlsx')).toBeInTheDocument();
    expect(within(dialog).getByText(/cannot be undone/i)).toBeInTheDocument();
  });

  it('leaves the review alone when the confirmation is cancelled', async () => {
    const { user } = setup();
    await screen.findByText('236264.xlsx');

    await openDeleteFor('236264.xlsx', user);
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByText('236264.xlsx')).toBeInTheDocument();
  });

  it('hands focus back to the delete button when the dialog is dismissed', async () => {
    // Radix restores focus to whatever was focused at open time, which lands on
    // `<body>` when the list re-renders underneath. A keyboard user who cancels
    // must not lose their place in the list.
    const { user } = setup();
    await screen.findByText('236264.xlsx');

    const button = within(rowFor('236264.xlsx')).getByRole('button', {
      name: 'Delete the review of 236264.xlsx',
    });
    await user.click(button);
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(button).toHaveFocus();
  });

  it('removes the row once the delete is confirmed', async () => {
    const { user } = setup();
    await screen.findByText('236264.xlsx');

    await openDeleteFor('236264.xlsx', user);
    await user.click(await screen.findByRole('button', { name: 'Delete review' }));

    await waitFor(() => {
      expect(screen.queryByText('236264.xlsx')).not.toBeInTheDocument();
    });
    // And only that one.
    expect(screen.getByText('305800.xlsx')).toBeInTheDocument();
  });

  it('keeps the dialog open and shows why when the server refuses', async () => {
    // Closing on failure is how a user ends up believing a delete succeeded.
    server.use(
      http.delete(`${REVIEWS}:reviewId/`, () =>
        HttpResponse.json(
          {
            detail: {
              error_code: 'review_running',
              message: 'This review is still running. It can be deleted once it finishes.',
            },
          },
          { status: 409 },
        ),
      ),
    );

    const { user } = setup();
    await screen.findByText('236264.xlsx');

    await openDeleteFor('236264.xlsx', user);
    await user.click(await screen.findByRole('button', { name: 'Delete review' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/still running/i);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('puts the row back when the delete fails', async () => {
    // The row is removed optimistically, so a refusal has to restore it or the
    // list quietly disagrees with the server about what exists.
    server.use(
      http.delete(`${REVIEWS}:reviewId/`, () =>
        HttpResponse.json(
          { detail: { error_code: 'internal', message: 'Nope.' } },
          { status: 500 },
        ),
      ),
    );

    const { user } = setup();
    await screen.findByText('236264.xlsx');

    await openDeleteFor('236264.xlsx', user);
    await user.click(await screen.findByRole('button', { name: 'Delete review' }));
    await screen.findByRole('alert');

    // Dismiss, which is what a user does on reading the reason. The row has to
    // be there afterwards.
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(screen.getByText('236264.xlsx')).toBeInTheDocument();
    expect(screen.getByText('305800.xlsx')).toBeInTheDocument();
  });

  it('shows an empty state rather than a bare list when there is nothing', async () => {
    server.use(http.get(REVIEWS, () => HttpResponse.json([])));
    setup();

    expect(await screen.findByText('No reviews yet')).toBeInTheDocument();
  });

  it('says the service could not be reached rather than showing nothing', async () => {
    server.use(http.get(REVIEWS, () => HttpResponse.error()));
    setup();

    expect(await screen.findByText(/could not be reached/i)).toBeInTheDocument();
  });
});
