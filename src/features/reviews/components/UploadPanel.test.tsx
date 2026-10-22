import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fireEvent, renderWithProviders, screen, waitFor } from '@/testing/test-utils';

import { UploadPanel } from './UploadPanel';

const REVIEWS = '/api/jeve/reviews/';

/** Every upload the panel asked to be sent, in order. */
let uploads: { fileName: string; fields: string[] }[] = [];

/**
 * Intercept at `fetch` rather than at the network, and read the `FormData`
 * the panel assembled.
 *
 * Not msw, for once: a multipart body carrying a jsdom `File` cannot be read
 * back inside a handler — the request stream closes prematurely — so a
 * handler that inspects the body aborts the request it is meant to observe.
 */
function acceptUploads(status = 202) {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    if (!url.includes(REVIEWS)) {
      throw new Error(`Unexpected request to ${url}`);
    }

    const form = init?.body as FormData;
    const workbook = form.get('workbook');
    uploads.push({
      fileName: workbook instanceof File ? workbook.name : '',
      fields: [...form.keys()],
    });

    const body =
      status === 202
        ? {
            review_id: 'rev_test_0001',
            status: 'queued',
            events_url: `${REVIEWS}rev_test_0001/events/`,
            reused_from: null,
          }
        : { detail: { error_code: 'not_excel', message: 'Not a workbook' } };

    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    );
  });
}

function workbook(name = '305800.xlsx') {
  return new File(['binary'], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function setup() {
  const onAccepted = vi.fn();
  return { onAccepted, ...renderWithProviders(<UploadPanel onAccepted={onAccepted} />) };
}

async function stage(user: ReturnType<typeof setup>['user'], file = workbook()) {
  await user.upload(screen.getByLabelText('Journal entry workbook'), file);
  // The staged panel is what proves the upload did not fire on the picker.
  await screen.findByRole('button', { name: 'Start review' });
}

beforeEach(() => {
  uploads = [];
});

describe('UploadPanel', () => {
  it('stages the workbook rather than uploading it on the picker', async () => {
    acceptUploads();
    const { user } = setup();

    await stage(user);

    expect(uploads).toHaveLength(0);
    expect(screen.getByText('305800.xlsx')).toBeInTheDocument();
  });

  it('asks the reviewer for nothing beyond the workbook', async () => {
    // The document number and the risk rating are the review's own now: the
    // number comes off the file name, the rating off the score. A form that
    // still asked for either would be collecting a value nothing reads.
    acceptUploads();
    const { user } = setup();

    await stage(user);

    expect(screen.queryByLabelText(/document no/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/risk rating/i)).not.toBeInTheDocument();
  });

  it('sends the workbook and the entry type, and nothing else', async () => {
    acceptUploads();
    const { user, onAccepted } = setup();

    await stage(user);
    await user.click(screen.getByRole('button', { name: 'Start review' }));

    await waitFor(() => {
      expect(uploads).toHaveLength(1);
    });
    expect(uploads[0]?.fileName).toBe('305800.xlsx');
    expect(uploads[0]?.fields.toSorted()).toEqual(['je_type', 'workbook']);
    expect(onAccepted).toHaveBeenCalledWith('rev_test_0001');
  });

  it('stages a dropped workbook without sending it', async () => {
    acceptUploads();
    setup();

    const target = screen.getByText('Drop a journal entry workbook here').closest('div');
    if (!target) throw new Error('No drop target');

    fireEvent.drop(target, { dataTransfer: { files: [workbook()] } });

    expect(await screen.findByRole('button', { name: 'Start review' })).toBeInTheDocument();
    expect(uploads).toHaveLength(0);
  });

  it('keeps the staged file when the server refuses it', async () => {
    acceptUploads(400);
    const { user, onAccepted } = setup();

    await stage(user);
    await user.click(screen.getByRole('button', { name: 'Start review' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/not an Excel workbook/i);
    expect(onAccepted).not.toHaveBeenCalled();
    // The reviewer presses the button again; they do not go and find the file
    // in a folder again.
    expect(screen.getByText('305800.xlsx')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start review' })).toBeEnabled();
  });

  it('lets the staged workbook be removed', async () => {
    acceptUploads();
    const { user } = setup();

    await stage(user);
    await user.click(screen.getByRole('button', { name: 'Remove this workbook' }));

    expect(screen.getByRole('button', { name: 'Choose a workbook' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start review' })).not.toBeInTheDocument();
    expect(uploads).toHaveLength(0);
  });
});
