import { Hono } from "hono";
import { requestId } from "hono/request-id";
import QRCode from "qrcode/lib/browser.js";

import { securityHeaders } from "./middleware/security";
import {
  CampaignPage,
  GuidePage,
  HomePage,
  ManagePage,
  NotFoundPage,
  PosterPage,
  PrivacyPage,
  type CampaignStatus,
  type CampaignView,
} from "./ui/pages";

export type Bindings = {
  ASSETS: Fetcher;
  DB: D1Database;
  PHOTOS: R2Bucket;
};

export type CampaignRow = {
  caution: string;
  color: string;
  created_at: number;
  creator_session_id: string;
  expires_at: number;
  features: string;
  id: string;
  lost_date: string;
  municipality: string;
  owner_token_hash: string;
  pet_name: string;
  pet_type: CampaignView["petType"];
  photo_key: string;
  photo_mime: "image/webp";
  prefecture: string;
  status: CampaignStatus;
  updated_at: number;
};

export type SightingRow = {
  area: string;
  behavior: string;
  created_at: number;
  direction: string;
  id: string;
  seen_at: string;
};

const app = new Hono<{ Bindings: Bindings }>();
const sessionPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const campaignIdPattern = /^[0-9a-f]{32}$/;
const ownerTokenPattern = /^[0-9a-f]{64}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const dateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const petTypes = new Set(["bird", "cat", "dog", "other", "small"]);
const metricNames = new Set([
  "visited",
  "campaign_created",
  "campaign_viewed",
  "poster_opened",
  "poster_printed",
  "campaign_shared",
  "sighting_submitted",
  "owner_checked",
  "campaign_resolved",
  "returned",
]);
const prefectures = new Set([
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
]);
const blockedText =
  /(?:https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?81|0)\d{1,4}[-ー‐–—\s]?\d{1,4}[-ー‐–—\s]?\d{3,4}|(?:LINE|ライン|Discord|ディスコード|住所|自宅|番地|号室|電話|メール|連絡先|DM|報酬|振込|口座)|@[a-z0-9_]{2,})/iu;

app.use("*", requestId());
app.use("*", securityHeaders);

const unixNow = () => Math.floor(Date.now() / 1000);

const bytesToHex = (bytes: Uint8Array) =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");

const randomHex = (bytes: number) => {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return bytesToHex(value);
};

const sha256 = async (value: string) =>
  bytesToHex(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))),
  );

const constantTimeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
};

const toView = (row: CampaignRow): CampaignView => ({
  caution: row.caution,
  color: row.color,
  createdAt: row.created_at,
  expiresAt: row.expires_at,
  features: row.features,
  id: row.id,
  lostDate: row.lost_date,
  municipality: row.municipality,
  petName: row.pet_name,
  petType: row.pet_type,
  prefecture: row.prefecture,
  status: row.status,
});

const cleanText = (value: string) => value.normalize("NFKC").trim().replace(/\s+/g, " ");

const isSafeText = (value: string, minimum: number, maximum: number) =>
  value.length >= minimum && value.length <= maximum && !blockedText.test(value);

const validLostDate = (value: string) => {
  if (!datePattern.test(value)) return false;
  const timestamp = Date.parse(`${value}T12:00:00+09:00`);
  if (!Number.isFinite(timestamp)) return false;
  const difference = Date.now() - timestamp;
  return difference >= -86_400_000 && difference <= 366 * 86_400_000;
};

const validSeenAt = (value: string) => {
  if (!dateTimePattern.test(value)) return false;
  const timestamp = Date.parse(`${value}:00+09:00`);
  if (!Number.isFinite(timestamp)) return false;
  const difference = Date.now() - timestamp;
  return difference >= -3_600_000 && difference <= 366 * 86_400_000;
};

const isSameOriginMutation = (request: Request) =>
  request.headers.get("sec-fetch-site") === "same-origin";

const loadCampaign = async (db: D1Database, id: string) =>
  db.prepare("SELECT * FROM campaigns WHERE id = ? LIMIT 1").bind(id).first<CampaignRow>();

const isPublic = (row: CampaignRow) => {
  if (row.status === "hidden") return false;
  if (row.status === "active") return row.expires_at > unixNow();
  if (row.status === "resolved") return row.expires_at + 35 * 86_400 > unixNow();
  return false;
};

const authorizedCampaign = async (db: D1Database, id: string, token: string) => {
  if (!campaignIdPattern.test(id) || !ownerTokenPattern.test(token)) return null;
  const row = await loadCampaign(db, id);
  if (!row || !constantTimeEqual(await sha256(token), row.owner_token_hash)) return null;
  return row;
};

const recordMetric = async (db: D1Database, sessionId: string, name: string, campaignId = "") => {
  if (!sessionPattern.test(sessionId) || !metricNames.has(name)) return;
  await db
    .prepare(
      "INSERT INTO product_events (session_id, name, campaign_id, occurred_on, created_at) VALUES (?, ?, ?, date('now'), unixepoch())",
    )
    .bind(sessionId.toLowerCase(), name, campaignId)
    .run();
};

const noStore = async (response: Response | Promise<Response>) => {
  const resolved = await response;
  resolved.headers.set("Cache-Control", "no-store");
  resolved.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return resolved;
};

const bodyText = (body: Record<string, unknown>, name: string) => {
  const value = body[name];
  return typeof value === "string" ? value : "";
};

const isMetadataFreeWebp = async (file: File) => {
  if (file.type !== "image/webp" || file.size < 24 || file.size > 1_800_000) return false;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const header = String.fromCharCode(...bytes.slice(0, 12));
  if (!header.startsWith("RIFF") || header.slice(8, 12) !== "WEBP") return false;
  const text = new TextDecoder("latin1").decode(bytes);
  return !text.includes("EXIF") && !text.includes("XMP ") && !text.includes("ICCP");
};

const createError = (code: string) => `/create?error=${encodeURIComponent(code)}`;

app.get("/", (c) => c.html(<HomePage />));
app.get("/create", (c) => c.html(<HomePage createMode error={c.req.query("error") ?? ""} />));
app.get("/guide", (c) => c.html(<GuidePage />));
app.get("/privacy", (c) => c.html(<PrivacyPage />));

app.post("/campaigns", async (c) => {
  if (!isSameOriginMutation(c.req.raw)) return c.json({ error: "forbidden" }, 403);
  if (!(c.req.header("content-type") ?? "").includes("multipart/form-data")) {
    return c.json({ error: "unsupported_media_type" }, 415);
  }
  const contentLength = Number(c.req.header("content-length") ?? "0");
  if (contentLength > 2_500_000) return c.json({ error: "payload_too_large" }, 413);

  const body = await c.req.parseBody();
  const sessionId = bodyText(body, "session_id").trim().toLowerCase();
  const petName = cleanText(bodyText(body, "pet_name"));
  const petType = bodyText(body, "pet_type");
  const lostDate = bodyText(body, "lost_date");
  const prefecture = bodyText(body, "prefecture");
  const municipality = cleanText(bodyText(body, "municipality"));
  const color = cleanText(bodyText(body, "color"));
  const features = cleanText(bodyText(body, "features"));
  const caution = cleanText(bodyText(body, "caution"));
  const website = bodyText(body, "website").trim();
  const expiryDays = Number(bodyText(body, "expiry_days") || "30");
  const photo = body.photo;

  if (
    website ||
    !sessionPattern.test(sessionId) ||
    !petTypes.has(petType) ||
    (petName && !isSafeText(petName, 1, 24)) ||
    !validLostDate(lostDate) ||
    !prefectures.has(prefecture) ||
    !isSafeText(municipality, 2, 40) ||
    !isSafeText(color, 2, 60) ||
    !isSafeText(features, 10, 240) ||
    (caution && !isSafeText(caution, 2, 100)) ||
    ![14, 30, 60].includes(expiryDays)
  ) {
    return c.redirect(createError("invalid"), 303);
  }

  if (!(photo instanceof File) || !(await isMetadataFreeWebp(photo))) {
    return c.redirect(createError("photo"), 303);
  }

  const daily = await c.env.DB.prepare(
    "SELECT COUNT(*) AS count FROM campaigns WHERE creator_session_id = ? AND created_at >= unixepoch('now', 'start of day')",
  )
    .bind(sessionId)
    .first<{ count: number }>();
  if ((daily?.count ?? 0) >= 3) return c.redirect(createError("rate"), 303);

  const id = randomHex(16);
  const ownerToken = randomHex(32);
  const tokenHash = await sha256(ownerToken);
  const photoKey = `campaigns/${id}.webp`;
  const now = unixNow();
  const expiresAt = now + expiryDays * 86_400;

  await c.env.PHOTOS.put(photoKey, photo.stream(), {
    httpMetadata: {
      contentType: "image/webp",
    },
  });

  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO campaigns (
          id, owner_token_hash, creator_session_id, pet_name, pet_type, lost_date,
          prefecture, municipality, color, features, caution, photo_key, photo_mime,
          status, expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'image/webp', 'active', ?, ?, ?)`,
      ).bind(
        id,
        tokenHash,
        sessionId,
        petName,
        petType,
        lostDate,
        prefecture,
        municipality,
        color,
        features,
        caution,
        photoKey,
        expiresAt,
        now,
        now,
      ),
      c.env.DB.prepare(
        "INSERT INTO product_events (session_id, name, campaign_id, occurred_on, created_at) VALUES (?, 'campaign_created', ?, date('now'), ?)",
      ).bind(sessionId, id, now),
    ]);
  } catch (error) {
    await c.env.PHOTOS.delete(photoKey);
    throw error;
  }

  return c.redirect(`/manage/${id}#${ownerToken}`, 303);
});

app.get("/campaigns/:id", async (c) => {
  const id = c.req.param("id");
  if (!campaignIdPattern.test(id)) return noStore(c.html(<NotFoundPage />, 404));
  const row = await loadCampaign(c.env.DB, id);
  if (!row || !isPublic(row)) return noStore(c.html(<NotFoundPage expired />, 404));
  return noStore(c.html(<CampaignPage campaign={toView(row)} />));
});

app.get("/campaigns/:id/poster", async (c) => {
  const id = c.req.param("id");
  if (!campaignIdPattern.test(id)) return noStore(c.html(<NotFoundPage />, 404));
  const row = await loadCampaign(c.env.DB, id);
  if (!row || !isPublic(row)) return noStore(c.html(<NotFoundPage expired />, 404));
  return noStore(c.html(<PosterPage campaign={toView(row)} />));
});

app.get("/campaigns/:id/photo", async (c) => {
  const id = c.req.param("id");
  if (!campaignIdPattern.test(id)) return c.body(null, 404);
  const row = await loadCampaign(c.env.DB, id);
  if (!row || !isPublic(row)) return c.body(null, 404);
  const object = await c.env.PHOTOS.get(row.photo_key);
  if (!object) return c.body(null, 404);
  return new Response(object.body, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": row.photo_mime,
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
});

app.get("/campaigns/:id/qr.svg", async (c) => {
  const id = c.req.param("id");
  if (!campaignIdPattern.test(id)) return c.body(null, 404);
  const row = await loadCampaign(c.env.DB, id);
  if (!row || !isPublic(row)) return c.body(null, 404);
  const svg = await QRCode.toString(`https://maigo-poster.yhay81.com/campaigns/${id}`, {
    color: { dark: "#17201d", light: "#ffffff" },
    errorCorrectionLevel: "M",
    margin: 2,
    type: "svg",
    width: 360,
  });
  return new Response(svg, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "image/svg+xml; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
});

app.get("/manage/:id", async (c) => {
  const id = c.req.param("id");
  if (!campaignIdPattern.test(id)) return noStore(c.html(<NotFoundPage />, 404));
  const row = await loadCampaign(c.env.DB, id);
  if (!row) return noStore(c.html(<NotFoundPage expired />, 404));
  return noStore(c.html(<ManagePage campaign={toView(row)} />));
});

app.post("/api/events", async (c) => {
  if (!isSameOriginMutation(c.req.raw)) return c.json({ error: "forbidden" }, 403);
  if (!(c.req.header("content-type") ?? "").includes("application/json")) {
    return c.json({ error: "unsupported_media_type" }, 415);
  }
  const body = await c.req.json<{ campaignId?: string; name?: string; sessionId?: string }>();
  const name = String(body.name ?? "");
  const sessionId = String(body.sessionId ?? "");
  const campaignId = String(body.campaignId ?? "");
  if (
    !metricNames.has(name) ||
    !sessionPattern.test(sessionId) ||
    (campaignId && !campaignIdPattern.test(campaignId))
  ) {
    return c.json({ error: "invalid_event" }, 400);
  }
  await recordMetric(c.env.DB, sessionId, name, campaignId);
  return new Response(null, { status: 204 });
});

app.post("/api/campaigns/:id/sightings", async (c) => {
  if (!isSameOriginMutation(c.req.raw)) return c.json({ error: "forbidden" }, 403);
  const id = c.req.param("id");
  if (!campaignIdPattern.test(id)) return c.json({ error: "not_found" }, 404);
  if (!(c.req.header("content-type") ?? "").includes("application/json")) {
    return c.json({ error: "unsupported_media_type" }, 415);
  }
  const body = await c.req.json<{
    area?: string;
    behavior?: string;
    direction?: string;
    seenAt?: string;
    sessionId?: string;
    website?: string;
  }>();
  const sessionId = String(body.sessionId ?? "")
    .trim()
    .toLowerCase();
  const seenAt = String(body.seenAt ?? "");
  const area = cleanText(String(body.area ?? ""));
  const direction = cleanText(String(body.direction ?? ""));
  const behavior = cleanText(String(body.behavior ?? ""));
  if (
    body.website ||
    !sessionPattern.test(sessionId) ||
    !validSeenAt(seenAt) ||
    !isSafeText(area, 2, 80) ||
    (direction && !isSafeText(direction, 2, 60)) ||
    (behavior && !isSafeText(behavior, 2, 100))
  ) {
    return c.json({ error: "invalid_sighting" }, 400);
  }
  const row = await loadCampaign(c.env.DB, id);
  if (!row || row.status !== "active" || row.expires_at <= unixNow()) {
    return c.json({ error: "not_found" }, 404);
  }
  const daily = await c.env.DB.prepare(
    "SELECT COUNT(*) AS count FROM sightings WHERE reporter_session_id = ? AND created_at >= unixepoch('now', 'start of day')",
  )
    .bind(sessionId)
    .first<{ count: number }>();
  if ((daily?.count ?? 0) >= 10) return c.json({ error: "rate_limited" }, 429);

  const sightingId = randomHex(16);
  const now = unixNow();
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO sightings (
        id, campaign_id, reporter_session_id, seen_at, area, direction, behavior, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(sightingId, id, sessionId, seenAt, area, direction, behavior, now),
    c.env.DB.prepare(
      "INSERT INTO product_events (session_id, name, campaign_id, occurred_on, created_at) VALUES (?, 'sighting_submitted', ?, date('now'), ?)",
    ).bind(sessionId, id, now),
  ]);
  return c.json({ accepted: true }, 201);
});

app.get("/api/campaigns/:id/sightings", async (c) => {
  const id = c.req.param("id");
  const token = c.req.header("x-owner-token") ?? "";
  const row = await authorizedCampaign(c.env.DB, id, token);
  if (!row) return c.json({ error: "forbidden" }, 403);
  const result = await c.env.DB.prepare(
    "SELECT id, seen_at, area, direction, behavior, created_at FROM sightings WHERE campaign_id = ? ORDER BY created_at DESC LIMIT 100",
  )
    .bind(id)
    .all<SightingRow>();
  await recordMetric(c.env.DB, row.creator_session_id, "owner_checked", id);
  return noStore(c.json({ sightings: result.results ?? [] }));
});

app.post("/api/campaigns/:id/report", async (c) => {
  if (!isSameOriginMutation(c.req.raw)) return c.json({ error: "forbidden" }, 403);
  const id = c.req.param("id");
  if (!campaignIdPattern.test(id)) return c.json({ error: "not_found" }, 404);
  const body = await c.req.json<{ reason?: string; sessionId?: string }>();
  const sessionId = String(body.sessionId ?? "");
  const reason = String(body.reason ?? "");
  if (!sessionPattern.test(sessionId) || !["false", "personal", "unsafe"].includes(reason)) {
    return c.json({ error: "invalid_report" }, 400);
  }
  const row = await loadCampaign(c.env.DB, id);
  if (!row || !isPublic(row)) return c.json({ error: "not_found" }, 404);
  await c.env.DB.prepare(
    "INSERT OR IGNORE INTO reports (campaign_id, reporter_session_id, reason, created_at) VALUES (?, ?, ?, unixepoch())",
  )
    .bind(id, sessionId.toLowerCase(), reason)
    .run();
  const result = await c.env.DB.prepare(
    "SELECT COUNT(*) AS count FROM reports WHERE campaign_id = ?",
  )
    .bind(id)
    .first<{ count: number }>();
  const hidden = (result?.count ?? 0) >= 3;
  if (hidden) {
    await c.env.DB.prepare(
      "UPDATE campaigns SET status = 'hidden', updated_at = unixepoch() WHERE id = ?",
    )
      .bind(id)
      .run();
  }
  return c.json({ hidden });
});

app.post("/api/campaigns/:id/status", async (c) => {
  if (!isSameOriginMutation(c.req.raw)) return c.json({ error: "forbidden" }, 403);
  const id = c.req.param("id");
  const token = c.req.header("x-owner-token") ?? "";
  const row = await authorizedCampaign(c.env.DB, id, token);
  if (!row) return c.json({ error: "forbidden" }, 403);
  const body = await c.req.json<{ status?: string }>();
  const status = String(body.status);
  if (!["active", "resolved"].includes(status)) {
    return c.json({ error: "invalid_status" }, 400);
  }
  if (status === "active" && row.expires_at <= unixNow()) {
    return c.json({ error: "expired" }, 409);
  }
  await c.env.DB.prepare("UPDATE campaigns SET status = ?, updated_at = unixepoch() WHERE id = ?")
    .bind(status, id)
    .run();
  if (status === "resolved") {
    await recordMetric(c.env.DB, row.creator_session_id, "campaign_resolved", id);
  }
  return c.json({ status });
});

app.delete("/api/campaigns/:id", async (c) => {
  if (!isSameOriginMutation(c.req.raw)) return c.json({ error: "forbidden" }, 403);
  const id = c.req.param("id");
  const token = c.req.header("x-owner-token") ?? "";
  const row = await authorizedCampaign(c.env.DB, id, token);
  if (!row) return c.json({ error: "forbidden" }, 403);
  await c.env.DB.prepare("DELETE FROM campaigns WHERE id = ?").bind(id).run();
  await c.env.PHOTOS.delete(row.photo_key);
  return new Response(null, { status: 204 });
});

app.get("/healthz", (c) =>
  c.json({
    healthy: true,
    service: "maigo-poster",
    time: new Date().toISOString(),
  }),
);

app.notFound((c) => {
  if (c.req.path.startsWith("/api/")) {
    return c.json({ error: "not_found", requestId: c.get("requestId") }, 404);
  }
  return noStore(c.html(<NotFoundPage />, 404));
});

app.onError((error, c) => {
  console.error(
    JSON.stringify({
      event: "request_failed",
      message: error.message,
      requestId: c.get("requestId"),
    }),
  );
  return c.json({ error: "internal_error", requestId: c.get("requestId") }, 500);
});

const scheduled: ExportedHandlerScheduledHandler<Bindings> = async (_controller, env) => {
  const obsolete = await env.DB.prepare(
    `SELECT photo_key FROM campaigns
     WHERE expires_at < unixepoch('now', '-35 days')
        OR (status = 'hidden' AND updated_at < unixepoch('now', '-35 days'))`,
  ).all<{ photo_key: string }>();
  await Promise.all((obsolete.results ?? []).map((row) => env.PHOTOS.delete(row.photo_key)));
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE campaigns SET status = 'closed', updated_at = unixepoch() WHERE status = 'active' AND expires_at <= unixepoch()",
    ),
    env.DB.prepare("DELETE FROM reports WHERE created_at < unixepoch('now', '-35 days')"),
    env.DB.prepare("DELETE FROM product_events WHERE created_at < unixepoch('now', '-35 days')"),
    env.DB.prepare(
      "DELETE FROM campaigns WHERE expires_at < unixepoch('now', '-35 days') OR (status = 'hidden' AND updated_at < unixepoch('now', '-35 days'))",
    ),
  ]);
};

export { app };
export default { fetch: app.fetch, scheduled };
