import { beforeEach, describe, expect, it, vi } from "vitest";

import { app, type Bindings, type CampaignRow, type SightingRow } from "../src/worker";

const sessionId = "7c0dbe70-8c47-4fc0-aa62-52427133c612";
const campaignId = "a".repeat(32);
const ownerToken = "1".repeat(64);

type State = {
  campaign?: CampaignRow | null;
  dailyCount?: number;
  photo?: boolean;
  reportCount?: number;
  sightingDailyCount?: number;
  sightings?: SightingRow[];
};

const hash = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const defaultCampaign = async (status: CampaignRow["status"] = "active"): Promise<CampaignRow> => ({
  caution: "追わずに場所を送ってください",
  color: "黄緑色、ほほが青い",
  created_at: Math.floor(Date.now() / 1000),
  creator_session_id: sessionId,
  expires_at: Math.floor(Date.now() / 1000) + 30 * 86_400,
  features: "人の肩に乗ります。右足に青いリングがあります。",
  id: campaignId,
  lost_date: new Date().toISOString().slice(0, 10),
  municipality: "伊都郡かつらぎ町",
  owner_token_hash: await hash(ownerToken),
  pet_name: "ポンズ",
  pet_type: "bird",
  photo_key: `campaigns/${campaignId}.webp`,
  photo_mime: "image/webp",
  prefecture: "和歌山県",
  status,
  updated_at: Math.floor(Date.now() / 1000),
});

const makeBindings = (state: State = {}) => {
  const calls: Array<{ arguments: unknown[]; sql: string }> = [];
  const batch = vi.fn(() => Promise.resolve([]));
  const put = vi.fn(() => Promise.resolve(undefined));
  const deletePhoto = vi.fn(() => Promise.resolve(undefined));
  const prepare = vi.fn((sql: string) => {
    const call = { arguments: [] as unknown[], sql };
    calls.push(call);
    const statement = {
      all: vi.fn(async () => ({
        results: sql.includes("FROM sightings") ? (state.sightings ?? []) : [],
      })),
      bind: vi.fn((...arguments_: unknown[]) => {
        call.arguments = arguments_;
        return statement;
      }),
      first: vi.fn(async () => {
        if (sql.includes("COUNT(*) AS count FROM campaigns")) {
          return { count: state.dailyCount ?? 0 };
        }
        if (sql.includes("COUNT(*) AS count FROM sightings")) {
          return { count: state.sightingDailyCount ?? 0 };
        }
        if (sql.includes("COUNT(*) AS count FROM reports")) {
          return { count: state.reportCount ?? 1 };
        }
        if (sql.includes("SELECT * FROM campaigns")) return state.campaign ?? null;
        return null;
      }),
      run: vi.fn(() => Promise.resolve({ success: true })),
    };
    return statement;
  });
  return {
    batch,
    bindings: {
      ASSETS: { fetch: () => Promise.resolve(new Response("not used")) },
      DB: { batch, prepare },
      PHOTOS: {
        delete: deletePhoto,
        get: vi.fn(async () =>
          state.photo
            ? {
                body: new Blob(["webp"]).stream(),
              }
            : null,
        ),
        put,
      },
    } as unknown as Bindings,
    calls,
    deletePhoto,
    put,
  };
};

const safeWebp = () => {
  const bytes = new Uint8Array(24);
  bytes.set(new TextEncoder().encode("RIFF"), 0);
  bytes.set(new TextEncoder().encode("WEBP"), 8);
  bytes.set(new TextEncoder().encode("VP8 "), 12);
  return new File([bytes], "pet.webp", { type: "image/webp" });
};

const validForm = () => {
  const form = new FormData();
  form.set("caution", "追わずに場所を送ってください");
  form.set("color", "黄緑色、ほほが青い");
  form.set("expiry_days", "30");
  form.set("features", "人の肩に乗ります。右足に青いリングがあります。");
  form.set("lost_date", new Date().toISOString().slice(0, 10));
  form.set("municipality", "伊都郡かつらぎ町");
  form.set("pet_name", "ポンズ");
  form.set("pet_type", "bird");
  form.set("photo", safeWebp());
  form.set("prefecture", "和歌山県");
  form.set("session_id", sessionId);
  form.set("website", "");
  return form;
};

const sameOrigin = { "sec-fetch-site": "same-origin" };

describe("まいごポスター worker", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("renders the visual poster builder without meta experiment copy or oversized hero", async () => {
    const response = await app.request("/", undefined, makeBindings().bindings);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-security-policy")).toContain("default-src 'self'");
    expect(html).toContain('lang="ja"');
    expect(html).toContain('class="poster-card sample-poster"');
    expect(html).toContain("捜索ページをつくる");
    expect(html).toContain("目撃情報は公開されません");
    expect(html).not.toContain('class="hero"');
    expect(html).not.toContain("成功条件");
  });

  it("creates a private expiring campaign, stores a WebP, and returns a fragment owner key", async () => {
    const { batch, bindings, calls, put } = makeBindings();
    const response = await app.request(
      "/campaigns",
      { body: validForm(), headers: sameOrigin, method: "POST" },
      bindings,
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toMatch(/^\/manage\/[0-9a-f]{32}#[0-9a-f]{64}$/);
    expect(put).toHaveBeenCalledTimes(1);
    expect(batch).toHaveBeenCalledTimes(1);
    const insert = calls.find((call) => call.sql.includes("INSERT INTO campaigns"));
    expect(insert?.arguments).toContain("ポンズ");
    expect(insert?.arguments).toContain("和歌山県");
    expect(JSON.stringify(insert?.arguments)).not.toContain(ownerToken);
  });

  it("rejects cross-site posts, exact-address/contact text, unsafe photos, and daily excess", async () => {
    const crossSite = await app.request(
      "/campaigns",
      { body: validForm(), headers: { "sec-fetch-site": "cross-site" }, method: "POST" },
      makeBindings().bindings,
    );
    expect(crossSite.status).toBe(403);

    const address = validForm();
    address.set("municipality", "かつらぎ町1丁目2番地");
    const blocked = await app.request(
      "/campaigns",
      { body: address, headers: sameOrigin, method: "POST" },
      makeBindings().bindings,
    );
    expect(blocked.status).toBe(303);
    expect(blocked.headers.get("location")).toContain("invalid");

    const metadata = validForm();
    metadata.set("photo", new File(["RIFFxxxxWEBPxxxxEXIF"], "pet.webp", { type: "image/webp" }));
    const unsafe = await app.request(
      "/campaigns",
      { body: metadata, headers: sameOrigin, method: "POST" },
      makeBindings().bindings,
    );
    expect(unsafe.status).toBe(303);
    expect(unsafe.headers.get("location")).toContain("photo");

    const limited = await app.request(
      "/campaigns",
      { body: validForm(), headers: sameOrigin, method: "POST" },
      makeBindings({ dailyCount: 3 }).bindings,
    );
    expect(limited.status).toBe(303);
    expect(limited.headers.get("location")).toContain("rate");
  });

  it("renders an active campaign with a private sighting form and dynamic photo preview", async () => {
    const campaign = await defaultCampaign();
    const response = await app.request(
      `/campaigns/${campaignId}`,
      undefined,
      makeBindings({ campaign }).bindings,
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(html).toContain("ポンズ");
    expect(html).toContain("見かけた場所を送る");
    expect(html).toContain(`/campaigns/${campaignId}/photo`);
    expect(html).toContain('src="/campaign.js"');
    expect(html).not.toContain(ownerToken);
  });

  it("keeps resolved campaigns visible but removes the sighting form, and hides closed pages", async () => {
    const resolved = await defaultCampaign("resolved");
    const resolvedResponse = await app.request(
      `/campaigns/${campaignId}`,
      undefined,
      makeBindings({ campaign: resolved }).bindings,
    );
    const resolvedHtml = await resolvedResponse.text();
    expect(resolvedResponse.status).toBe(200);
    expect(resolvedHtml).toContain("帰宅・保護済み");
    expect(resolvedHtml).not.toContain("data-sighting-form");

    const closed = await defaultCampaign("closed");
    const closedResponse = await app.request(
      `/campaigns/${campaignId}`,
      undefined,
      makeBindings({ campaign: closed }).bindings,
    );
    expect(closedResponse.status).toBe(404);
  });

  it("serves private no-store photos and functional QR SVGs for public campaigns", async () => {
    const campaign = await defaultCampaign();
    const bindings = makeBindings({ campaign, photo: true }).bindings;
    const photo = await app.request(`/campaigns/${campaignId}/photo`, undefined, bindings);
    const qr = await app.request(`/campaigns/${campaignId}/qr.svg`, undefined, bindings);

    expect(photo.status).toBe(200);
    expect(photo.headers.get("content-type")).toContain("image/webp");
    expect(photo.headers.get("cache-control")).toContain("no-store");
    expect(qr.status).toBe(200);
    expect(qr.headers.get("content-type")).toContain("image/svg+xml");
    expect(await qr.text()).toContain("<svg");
  });

  it("accepts safe sightings and rejects contacts, closed campaigns, and daily excess", async () => {
    const campaign = await defaultCampaign();
    const body = {
      area: "かつらぎ公園の北側",
      behavior: "木の上で鳴いていた",
      direction: "駅の方向へ飛んだ",
      seenAt: new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
        .toISOString()
        .slice(0, 16),
      sessionId,
      website: "",
    };
    const valid = makeBindings({ campaign });
    const response = await app.request(
      `/api/campaigns/${campaignId}/sightings`,
      {
        body: JSON.stringify(body),
        headers: { ...sameOrigin, "content-type": "application/json" },
        method: "POST",
      },
      valid.bindings,
    );
    expect(response.status).toBe(201);
    expect(valid.batch).toHaveBeenCalledTimes(1);

    const unsafe = await app.request(
      `/api/campaigns/${campaignId}/sightings`,
      {
        body: JSON.stringify({ ...body, area: "自宅は1丁目2番地です" }),
        headers: { ...sameOrigin, "content-type": "application/json" },
        method: "POST",
      },
      makeBindings({ campaign }).bindings,
    );
    expect(unsafe.status).toBe(400);

    const limited = await app.request(
      `/api/campaigns/${campaignId}/sightings`,
      {
        body: JSON.stringify(body),
        headers: { ...sameOrigin, "content-type": "application/json" },
        method: "POST",
      },
      makeBindings({ campaign, sightingDailyCount: 10 }).bindings,
    );
    expect(limited.status).toBe(429);
  });

  it("returns sightings only to the fragment-key owner and omits reporter identity", async () => {
    const campaign = await defaultCampaign();
    const sighting = {
      area: "公園の北側",
      behavior: "鳴いていた",
      created_at: Math.floor(Date.now() / 1000),
      direction: "東",
      id: "b".repeat(32),
      seen_at: "2026-07-29T15:30",
    };
    const bindings = makeBindings({ campaign, sightings: [sighting] }).bindings;
    const forbidden = await app.request(
      `/api/campaigns/${campaignId}/sightings`,
      undefined,
      bindings,
    );
    expect(forbidden.status).toBe(403);

    const response = await app.request(
      `/api/campaigns/${campaignId}/sightings`,
      { headers: { "x-owner-token": ownerToken } },
      bindings,
    );
    const text = await response.text();
    expect(response.status).toBe(200);
    expect(text).toContain("公園の北側");
    expect(text).not.toContain("reporter_session_id");
    expect(text).not.toContain(sessionId);
  });

  it("accepts owner resolution and deletion only with the fragment key", async () => {
    const campaign = await defaultCampaign();
    const valid = makeBindings({ campaign });
    const resolved = await app.request(
      `/api/campaigns/${campaignId}/status`,
      {
        body: JSON.stringify({ status: "resolved" }),
        headers: {
          ...sameOrigin,
          "content-type": "application/json",
          "x-owner-token": ownerToken,
        },
        method: "POST",
      },
      valid.bindings,
    );
    expect(resolved.status).toBe(200);
    expect(
      valid.calls.some(
        (call) =>
          call.sql.includes("UPDATE campaigns SET status") && call.arguments[0] === "resolved",
      ),
    ).toBe(true);

    const invalid = await app.request(
      `/api/campaigns/${campaignId}`,
      { headers: { ...sameOrigin, "x-owner-token": "2".repeat(64) }, method: "DELETE" },
      makeBindings({ campaign }).bindings,
    );
    expect(invalid.status).toBe(403);

    const deletion = makeBindings({ campaign });
    const removed = await app.request(
      `/api/campaigns/${campaignId}`,
      { headers: { ...sameOrigin, "x-owner-token": ownerToken }, method: "DELETE" },
      deletion.bindings,
    );
    expect(removed.status).toBe(204);
    expect(deletion.deletePhoto).toHaveBeenCalledWith(campaign.photo_key);
  });

  it("hides a campaign after three distinct anonymous reports", async () => {
    const campaign = await defaultCampaign();
    const { bindings, calls } = makeBindings({ campaign, reportCount: 3 });
    const response = await app.request(
      `/api/campaigns/${campaignId}/report`,
      {
        body: JSON.stringify({ reason: "unsafe", sessionId }),
        headers: { ...sameOrigin, "content-type": "application/json" },
        method: "POST",
      },
      bindings,
    );
    const body = await response.json<{ hidden: boolean }>();
    expect(response.status).toBe(200);
    expect(body.hidden).toBe(true);
    expect(calls.some((call) => call.sql.includes("status = 'hidden'"))).toBe(true);
  });

  it("documents photo, location, private sighting, and deletion boundaries", async () => {
    const response = await app.request("/privacy", undefined, makeBindings().bindings);
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain("作成者だけが見られるもの");
    expect(html).toContain("EXIF位置情報");
    expect(html).toContain("番地、自宅住所");
    expect(html).toContain("期限から35日以内");
  });

  it("serves HTML for missing pages, JSON for missing APIs, and a safe health response", async () => {
    const bindings = makeBindings().bindings;
    const page = await app.request("/missing", undefined, bindings);
    const api = await app.request("/api/missing", undefined, bindings);
    const health = await app.request("/healthz", undefined, bindings);
    expect(page.status).toBe(404);
    expect(await page.text()).toContain("ページが見つかりません");
    expect(api.status).toBe(404);
    expect(await api.json()).toEqual(expect.objectContaining({ error: "not_found" }));
    expect(await health.json()).toEqual(
      expect.objectContaining({ healthy: true, service: "maigo-poster" }),
    );
  });
});
