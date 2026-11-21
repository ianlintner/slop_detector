/**
 * @jest-environment node
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const REPO = path.resolve(__dirname, '..', '..');
const RUN = path.join(REPO, 'eval', 'run.ts');

// Minimal valid 1x1 PNGs differing in pixel colour (magic bytes are all the
// harness's MIME sniff needs; sharp decoding is exercised when available).
const PNG_A = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
  'base64'
);

let tmp: string;
beforeEach(() => {
  tmp = mkdtempSync(path.join(tmpdir(), 'frameeval-'));
  mkdirSync(path.join(tmp, 'frames'));
  writeFileSync(path.join(tmp, 'frames', 'a.png'), PNG_A);
  writeFileSync(path.join(tmp, 'frames', 'b.png'), PNG_A);
});
afterEach(() => rmSync(tmp, { recursive: true, force: true }));

// `eval/run.ts` is a type-stripping entrypoint (`node eval/run.ts`), which is
// only unflagged on Node >= 22.18 / 23.6. CI also runs Node 20, so elsewhere
// load it through a tiny CJS bootstrap that transpiles .ts with the repo's
// own `typescript`. FRAME_EVAL_FORCE_BOOTSTRAP=1 exercises that path locally.
const [major, minor] = process.versions.node.split('.').map(Number);
const NATIVE_TS =
  !process.env.FRAME_EVAL_FORCE_BOOTSTRAP &&
  (major >= 24 ||
    (major === 23 && minor >= 6) ||
    (major === 22 && minor >= 18));

const BOOTSTRAP = `
const ts = require(${JSON.stringify(path.join(REPO, 'node_modules', 'typescript'))});
const fs = require('fs');
require.extensions['.ts'] = (m, f) => {
  const out = ts.transpileModule(fs.readFileSync(f, 'utf8'), {
    fileName: f,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  m._compile(out.outputText, f);
};
process.argv.splice(1, 0, ${JSON.stringify(RUN)});
require(${JSON.stringify(RUN)});
`;

function run(args: string[], cwd = tmp, env: Record<string, string> = {}) {
  const nodeArgs = NATIVE_TS
    ? [RUN, ...args]
    : ['-e', BOOTSTRAP, '--', ...args];
  return spawnSync(process.execPath, nodeArgs, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

function labels(rows: string[]) {
  writeFileSync(
    path.join(tmp, 'labels.csv'),
    ['file,label,scope,notes', ...rows].join('\n')
  );
}

describe('frame eval CLI', () => {
  test('resolves --dir and --labels relative to the cwd', () => {
    labels(['a.png,slop,,']);
    const r = run(['--dir', 'frames', '--labels', 'labels.csv', '--json']);
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout).metrics.n).toBe(1);
  });

  test('duplicates inherit the original verdict and are not errors', () => {
    labels(['a.png,slop,,', 'b.png,slop,,']);
    const r = run(['--dir', 'frames', '--labels', 'labels.csv', '--json']);
    const out = JSON.parse(r.stdout);
    expect(out.metrics.n).toBe(2);
    expect(out.metrics.deduped).toBe(1);
    expect(out.metrics.errored).toBe(0);
    expect(out.predictions[1].duplicate).toBe(true);
    expect(out.predictions[1].verdict).toBe(out.predictions[0].verdict);
  });

  test('a skip frame does not suppress a later labelled duplicate', () => {
    labels(['a.png,skip,,', 'b.png,slop,,']);
    const out = JSON.parse(
      run(['--dir', 'frames', '--labels', 'labels.csv', '--json']).stdout
    );
    expect(out.metrics.n).toBe(1);
    expect(out.metrics.deduped).toBe(0);
    expect(out.predictions[1].duplicate).toBeUndefined();
    expect(out.predictions[1].verdict).not.toBeNull();
  });

  test.each([
    [['--threshold']],
    [['--threshold', 'abc']],
    [['--threshold', '99']],
  ])('rejects invalid threshold %j', (extra) => {
    labels(['a.png,slop,,']);
    const r = run(['--dir', 'frames', '--labels', 'labels.csv', ...extra]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/--threshold requires an integer/);
  });

  test('rejects frame paths that escape the frames dir', () => {
    writeFileSync(path.join(tmp, 'outside.png'), PNG_A);
    labels([
      '../outside.png,slop,,',
      `${path.join(tmp, 'outside.png')},slop,,`,
    ]);
    const out = JSON.parse(
      run(['--dir', 'frames', '--labels', 'labels.csv', '--json']).stdout
    );
    expect(out.metrics.errored).toBe(2);
    for (const p of out.predictions) expect(p.reason).toMatch(/outside/);
  });

  test('fails loudly if sharp cannot load, unless explicitly allowed', () => {
    labels(['a.png,slop,,']);
    const hook = path.join(tmp, 'nosharp.mjs');
    writeFileSync(
      hook,
      `import { register } from 'node:module';
register('data:text/javascript,' + encodeURIComponent(
  'export async function resolve(s,c,n){ if (s==="sharp") throw new Error("boom"); return n(s,c); }'
));`
    );
    // The bootstrap path transpiles `import()` to `require()`, which ESM
    // resolve hooks cannot see, so block sharp via a CJS preload there.
    const cjsHook = path.join(tmp, 'nosharp.cjs');
    writeFileSync(
      cjsHook,
      `const M = require('node:module');
const orig = M._resolveFilename;
M._resolveFilename = function (r, ...a) {
  if (r === 'sharp') throw new Error('boom');
  return orig.call(this, r, ...a);
};`
    );
    const env = {
      NODE_OPTIONS: NATIVE_TS ? `--import=${hook}` : `--require=${cjsHook}`,
    };
    const base = ['--dir', 'frames', '--labels', 'labels.csv', '--json'];
    const strict = run(base, tmp, env);
    expect(strict.status).toBe(2);
    expect(strict.stderr).toMatch(/sharp failed to load/);
    const lax = run([...base, '--allow-content-hash'], tmp, env);
    expect(lax.status).toBe(0);
    expect(lax.stderr).toMatch(/WARNING: sharp unavailable/);
  });
});
