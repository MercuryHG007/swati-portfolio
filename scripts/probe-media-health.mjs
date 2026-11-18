/**
 * Checks the image sources behind /api/media and records the result in R2 (ops/media-health.json).
 *
 *   node --env-file=.env.local scripts/probe-media-health.mjs            # run and record
 *   node --env-file=.env.local scripts/probe-media-health.mjs --dry-run  # print only, no writes, no email
 *
 * Checks, from outside the app, so the central route's fallback can't hide a failure:
 *   - Cloudinary delivery of a canary image (the request goes straight to res.cloudinary.com)
 *   - Cloudinary Admin API ping and the plan usage percentage
 *   - the R2 mirror copy of the canary, which is what the fallback serves
 *
 * Alerts go by email (Resend) when the state changes. A down or critical state needs two failed runs in a row, so a
 * single blip doesn't page anyone. Needs CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET, R2_ACCOUNT_ID/ACCESS_KEY_ID/
 * SECRET_ACCESS_KEY, R2_BACKUP_BUCKET, R2_MIRROR_BUCKET, RESEND_API_KEY, RESEND_FROM_EMAIL and ALERT_EMAIL.
 */
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const CANARY_PUBLIC_ID = 'swati-portfolio/_health/canary';
const STATE_KEY = 'ops/media-health.json';
const HISTORY_LIMIT = 96; // 24 hours at 15-minute runs
const DELIVERY_TIMEOUT_MS = 5000;
const LATENCY_DEGRADED_MS = 2500;
const QUOTA_DEGRADED_PERCENT = 80;
const QUOTA_CRITICAL_PERCENT = 100;
const FAILURES_BEFORE_ALERT = 2;
const SEVERITY = { healthy: 0, degraded: 1, critical: 2, down: 3 };

const dryRun = process.argv.includes('--dry-run');
const env = process.env;
const required = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BACKUP_BUCKET', 'R2_MIRROR_BUCKET'];
if (!dryRun) required.push('RESEND_API_KEY', 'ALERT_EMAIL');
const missing = required.filter((name) => !env[name]);
if (missing.length) {
  console.error(`Missing environment variable(s): ${missing.join(', ')}`);
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});

async function checkDelivery() {
  const url = `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/c_limit,w_64,f_webp,q_auto/${CANARY_PUBLIC_ID}`;
  const started = Date.now();
  try {
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS) });
    const latencyMs = Date.now() - started;
    const type = res.headers.get('content-type') ?? '';
    await res.arrayBuffer();
    if (res.status === 404) return { ok: false, status: 404, latencyMs, error: 'canary image not found in Cloudinary' };
    if (!res.ok || !type.startsWith('image/')) return { ok: false, status: res.status, latencyMs, error: `HTTP ${res.status}` };
    return { ok: true, status: res.status, latencyMs };
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    return { ok: false, status: null, latencyMs: Date.now() - started, error: timedOut ? 'timed out' : String(err) };
  }
}

function adminAuth() {
  return `Basic ${Buffer.from(`${env.CLOUDINARY_API_KEY}:${env.CLOUDINARY_API_SECRET}`).toString('base64')}`;
}

async function checkApi() {
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/ping`, {
      headers: { Authorization: adminAuth() },
      cache: 'no-store',
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
    });
    if (res.status === 401 || res.status === 403) return { ok: false, rejected: true, error: 'API credentials rejected' };
    return { ok: res.ok, rejected: false, error: res.ok ? undefined : `ping HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, rejected: false, error: `ping failed: ${String(err)}` };
  }
}

// The usage endpoint reports used_percent per plan resource. The highest one is what matters for 420 errors.
async function checkQuota() {
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/usage`, {
      headers: { Authorization: adminAuth() },
      cache: 'no-store',
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
    });
    if (!res.ok) return { percent: null, error: `usage HTTP ${res.status}` };
    const usage = await res.json();
    const percents = [];
    for (const resource of ['credits', 'bandwidth', 'transformations', 'storage']) {
      const entry = usage?.[resource];
      if (typeof entry?.used_percent === 'number') percents.push(entry.used_percent);
      else if (typeof entry?.usage === 'number' && typeof entry?.limit === 'number' && entry.limit > 0) {
        percents.push((entry.usage / entry.limit) * 100);
      }
    }
    return { percent: percents.length ? Math.round(Math.max(...percents)) : null };
  } catch (err) {
    return { percent: null, error: `usage failed: ${String(err)}` };
  }
}

async function checkMirrorCopy() {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: env.R2_MIRROR_BUCKET, Key: CANARY_PUBLIC_ID }));
    return { ok: true };
  } catch (err) {
    if (err?.name === 'NotFound' || err?.$metadata?.httpStatusCode === 404) {
      return { ok: false, error: 'canary missing from the R2 mirror (run scripts/ensure-media-canary.mjs)' };
    }
    return { ok: false, error: `R2 check failed: ${String(err)}` };
  }
}

// Worst state wins. Delivery failure is "down", a rejected key or quota exhaustion is "critical", and anything that
// still serves but is at risk is "degraded".
function classify({ delivery, api, quota, mirror }) {
  const reasons = [];
  let status = 'healthy';
  const raise = (level, reason) => {
    reasons.push(reason);
    if (SEVERITY[level] > SEVERITY[status]) status = level;
  };

  if (!delivery.ok) raise('down', `Cloudinary delivery failed: ${delivery.error}`);
  if (api.rejected) raise('critical', api.error);
  else if (!api.ok) raise('degraded', api.error);
  if (quota.percent !== null && quota.percent >= QUOTA_CRITICAL_PERCENT) {
    raise('critical', `Cloudinary plan usage is ${quota.percent}%`);
  } else if (quota.percent !== null && quota.percent >= QUOTA_DEGRADED_PERCENT) {
    raise('degraded', `Cloudinary plan usage is ${quota.percent}%`);
  }
  if (delivery.ok && delivery.latencyMs > LATENCY_DEGRADED_MS) {
    raise('degraded', `Cloudinary is slow (${delivery.latencyMs} ms)`);
  }
  if (!mirror.ok) raise('degraded', `Fallback copy unavailable: ${mirror.error}`);
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
const [delivery, api, quota, mirror] = await Promise.all([checkDelivery(), checkApi(), checkQuota(), checkMirrorCopy()]);
const { status: raw, reasons } = classify({ delivery, api, quota, mirror });

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
  metrics: { deliveryMs: delivery.latencyMs, deliveryStatus: delivery.status, quotaPercent: quota.percent },
  history: [...(prev?.history ?? []), { at: checkedAt, status: raw, deliveryMs: delivery.latencyMs, quotaPercent: quota.percent }].slice(-HISTORY_LIMIT),
};
if (effectiveStatus !== prev?.effectiveStatus && (prev || effectiveStatus !== 'healthy')) {
  const subject = `[Swati Portfolio] Image sources ${effectiveStatus}`;
  const text = [
    `Image sources changed to: ${effectiveStatus}`,
    `Checked at: ${checkedAt}`,
    '',
    ...(reasons.length ? reasons.map((reason) => `- ${reason}`) : ['No problems found.']),
    '',
    'Images keep working from the R2 mirror while Cloudinary is unavailable, so visitors may not notice.',
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
