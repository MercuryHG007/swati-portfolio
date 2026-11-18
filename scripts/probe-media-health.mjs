/**
 * Checks the image store and records the result in R2 (ops/media-health.json).
 *
 *   node --env-file=.env.local scripts/probe-media-health.mjs            # run and record
 *   node --env-file=.env.local scripts/probe-media-health.mjs --dry-run  # print only, no writes, no email
 *
 * Checks, from outside the app:
 *   - the canary image through the public media domain, which is what visitors load
 *   - the canary object in the R2 media bucket, the origin behind that domain
 *
 * Alerts go by email (Resend) when the state changes. A down or critical state needs two failed runs in a row, so a
 * single blip doesn't page anyone. Needs NEXT_PUBLIC_MEDIA_BASE_URL, R2_ACCOUNT_ID/ACCESS_KEY_ID/SECRET_ACCESS_KEY,
 * R2_BACKUP_BUCKET, R2_MEDIA_BUCKET, RESEND_API_KEY, RESEND_FROM_EMAIL and ALERT_EMAIL.
 */
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const CANARY_KEY = 'swati-portfolio/_health/canary-w160.webp';
const STATE_KEY = 'ops/media-health.json';
const HISTORY_LIMIT = 96; // 24 hours at 15-minute runs
const DELIVERY_TIMEOUT_MS = 5000;
const LATENCY_DEGRADED_MS = 2500;
const FAILURES_BEFORE_ALERT = 2;
const SEVERITY = { healthy: 0, degraded: 1, critical: 2, down: 3 };

const dryRun = process.argv.includes('--dry-run');
const env = process.env;
const required = ['NEXT_PUBLIC_MEDIA_BASE_URL', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BACKUP_BUCKET', 'R2_MEDIA_BUCKET'];
if (!dryRun) required.push('RESEND_API_KEY', 'ALERT_EMAIL');
const missing = required.filter((name) => !env[name]);
if (missing.length) {
  console.error(`Missing environment variable(s): ${missing.join(', ')}`);
  process.exit(1);
}

const mediaBase = env.NEXT_PUBLIC_MEDIA_BASE_URL.replace(/\/$/, '');
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  requestChecksumCalculation: 'WHEN_REQUIRED',
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});

async function checkDelivery() {
  const url = `${mediaBase}/${CANARY_KEY}`;
  const started = Date.now();
  try {
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS) });
    const latencyMs = Date.now() - started;
    const type = res.headers.get('content-type') ?? '';
    await res.arrayBuffer();
    if (res.status === 404) return { ok: false, status: 404, latencyMs, error: 'canary image not found on the media domain' };
    if (!res.ok || !type.startsWith('image/')) return { ok: false, status: res.status, latencyMs, error: `HTTP ${res.status}` };
    return { ok: true, status: res.status, latencyMs };
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    return { ok: false, status: null, latencyMs: Date.now() - started, error: timedOut ? 'timed out' : String(err) };
  }
}

async function checkOrigin() {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: env.R2_MEDIA_BUCKET, Key: CANARY_KEY }));
    return { ok: true };
  } catch (err) {
    if (err?.name === 'NotFound' || err?.$metadata?.httpStatusCode === 404) {
      return { ok: false, error: 'canary missing from the R2 media bucket (run scripts/ensure-media-canary.mjs)' };
    }
    return { ok: false, error: `R2 check failed: ${String(err)}` };
  }
}

// Worst state wins. A failing media domain is "down". A slow domain, or a canary missing from the origin while the
// domain still answers (cached copies), is "degraded".
function classify({ delivery, origin }) {
  const reasons = [];
  let status = 'healthy';
  const raise = (level, reason) => {
    reasons.push(reason);
    if (SEVERITY[level] > SEVERITY[status]) status = level;
  };

  if (!delivery.ok) raise('down', `Media domain failed: ${delivery.error}`);
  if (delivery.ok && delivery.latencyMs > LATENCY_DEGRADED_MS) {
    raise('degraded', `Media domain is slow (${delivery.latencyMs} ms)`);
  }
  if (!origin.ok) raise('degraded', `Origin check failed: ${origin.error}`);
  return { status, reasons };
}

async function readState() {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: env.R2_BACKUP_BUCKET, Key: STATE_KEY }));
    return JSON.parse(Buffer.from(await res.Body.transformToByteArray()).toString('utf8'));
  } catch (err) {
    if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) return null;
    throw err;
  }
}

async function sendAlert(subject, text) {
  if (dryRun) {
    console.log(`[dry-run] would email ${env.ALERT_EMAIL ?? '(ALERT_EMAIL)'}: ${subject}`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.RESEND_FROM_EMAIL || 'onboarding@resend.dev', to: [env.ALERT_EMAIL], subject, text }),
  });
  if (!res.ok) throw new Error(`Resend returned HTTP ${res.status}`);
}

const checkedAt = new Date().toISOString();
const [delivery, origin] = await Promise.all([checkDelivery(), checkOrigin()]);
const { status: raw, reasons } = classify({ delivery, origin });

const prev = await readState();
const failing = raw === 'down' || raw === 'critical';
const consecutiveFailures = failing ? (prev?.consecutiveFailures ?? 0) + 1 : 0;
// Failing states only take effect after FAILURES_BEFORE_ALERT runs in a row. Everything else takes effect at once.
const effectiveStatus =
  failing && consecutiveFailures < FAILURES_BEFORE_ALERT ? (prev?.effectiveStatus ?? 'healthy') : raw;

const state = {
  checkedAt,
  status: raw,
  effectiveStatus,
  consecutiveFailures,
  reasons,
  metrics: { deliveryMs: delivery.latencyMs, deliveryStatus: delivery.status },
  history: [...(prev?.history ?? []), { at: checkedAt, status: raw, deliveryMs: delivery.latencyMs }].slice(-HISTORY_LIMIT),
};
if (effectiveStatus !== prev?.effectiveStatus && (prev || effectiveStatus !== 'healthy')) {
  const subject = `[Swati Portfolio] Image store ${effectiveStatus}`;
  const text = [
    `Image store changed to: ${effectiveStatus}`,
    `Checked at: ${checkedAt}`,
    '',
    ...(reasons.length ? reasons.map((reason) => `- ${reason}`) : ['No problems found.']),
    '',
    'Images are served from R2 through the media domain. Visitors lose images while it is down.',
    'Details: ops/media-health.json in the backup bucket, and /api/health/media.',
  ].join('\n');
  try {
    await sendAlert(subject, text);
    state.lastChangedAt = checkedAt;
  } catch (err) {
    // Keep the old status, so the next run sees the same change and sends the alert again.
    console.error(`Alert email failed, will retry next run: ${err.message}`);
    state.effectiveStatus = prev?.effectiveStatus ?? 'healthy';
    state.lastChangedAt = prev?.lastChangedAt;
  }
} else if (prev?.lastChangedAt) {
  state.lastChangedAt = prev.lastChangedAt;
}

if (dryRun) {
  console.log(JSON.stringify({ ...state, history: state.history.slice(-1) }, null, 2));
} else {
  await s3.send(
    new PutObjectCommand({
      Bucket: env.R2_BACKUP_BUCKET,
      Key: STATE_KEY,
      Body: JSON.stringify(state),
      ContentType: 'application/json',
    })
  );
  console.log(`Media health: ${effectiveStatus} (raw ${raw}). ${reasons.join('; ') || 'all checks passed'}`);
}
