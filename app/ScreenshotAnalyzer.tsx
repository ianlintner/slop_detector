'use client';

import { useState, type FormEvent } from 'react';
import {
  Assessment,
  MAX_CONTEXT_CHARS,
  MAX_IMAGE_BYTES,
  Scope,
} from '@/lib/screenshotScope';

export default function ScreenshotAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [scope, setScope] = useState<Scope>('auto');
  const [context, setContext] = useState('');
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<Assessment | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setResult(null);
    setError('');
    if (!file || file.size > MAX_IMAGE_BYTES) {
      setError('Choose an image smaller than 5 MB.');
      return;
    }
    if (!consent) {
      setError(
        'Consent is required before an image is sent to the vision provider.'
      );
      return;
    }
    const form = new FormData();
    form.set('image', file);
    form.set('scope', scope);
    form.set('context', context);
    form.set('consent', 'yes');
    setBusy(true);
    try {
      const response = await fetch('/api/screenshot', {
        method: 'POST',
        body: form,
      });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json'))
        throw new Error('Analysis service returned an unexpected response.');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Analysis failed');
      setResult(data.assessment);
    } catch (err) {
      setError(
        err instanceof SyntaxError
          ? 'Analysis service returned an invalid response.'
          : err instanceof Error
            ? err.message
            : 'Analysis failed'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-2">Screenshot assessment</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-4">
        Take a screenshot on your device, then upload it here. Browser pages,
        posts and prominent images are supported. This is an opinion about
        observable quality, not an AI-authorship detector.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          Screenshot (PNG, JPEG or WebP, max 5 MB)
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="block mt-2"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setResult(null);
            }}
            required
          />
        </label>
        <label className="block">
          What should we assess?
          <select
            value={scope}
            onChange={(e) => {
              setScope(e.target.value as Scope);
              setResult(null);
            }}
            className="block w-full mt-2 p-2 text-zinc-900 rounded border"
          >
            <option value="auto">Infer from my note; ask if ambiguous</option>
            <option value="image">Prominent image only</option>
            <option value="article">Article / visible text only</option>
            <option value="whole">Whole visible page</option>
          </select>
        </label>
        <label className="block">
          Optional note about what you mean
          <textarea
            value={context}
            maxLength={MAX_CONTEXT_CHARS}
            onChange={(e) => setContext(e.target.value)}
            className="block w-full mt-2 p-2 text-zinc-900 rounded border"
            placeholder="E.g. assess the large illustration, not the article"
          />
        </label>
        <label className="flex gap-2 items-start">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1"
          />{' '}
          Send this screenshot and note to OpenAI for analysis. Do not upload
          secrets or private content.
        </label>
        <button
          disabled={busy}
          className="px-5 py-3 rounded bg-blue-600 text-white disabled:opacity-50"
        >
          {busy ? 'Assessing…' : 'Assess screenshot'}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-4 text-red-600">
          {error}
        </p>
      )}
      {result && (
        <div
          aria-live="polite"
          className="mt-5 p-4 rounded bg-zinc-100 dark:bg-zinc-900"
        >
          <p className="font-bold">
            {result.verdict === 'uncertain'
              ? 'Needs clarification'
              : result.verdict === 'slop'
                ? 'Likely slop'
                : 'Not evidently slop'}{' '}
            — {result.target}
          </p>
          <p className="mt-2">{result.reason}</p>
          {result.evidence.length > 0 && (
            <ul className="list-disc ml-6 mt-2">
              {result.evidence.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
          {result.question && (
            <p className="mt-3 font-semibold">{result.question}</p>
          )}
        </div>
      )}
    </section>
  );
}
