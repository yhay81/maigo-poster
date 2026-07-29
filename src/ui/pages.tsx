import { product } from "../config/product";
import { Layout } from "./layout";

export type CampaignStatus = "active" | "closed" | "hidden" | "resolved";

export type CampaignView = {
  caution: string;
  color: string;
  createdAt: number;
  expiresAt: number;
  features: string;
  id: string;
  lostDate: string;
  municipality: string;
  petName: string;
  petType: "bird" | "cat" | "dog" | "other" | "small";
  prefecture: string;
  status: CampaignStatus;
};

const petTypeLabels: Record<CampaignView["petType"], string> = {
  bird: "鳥",
  cat: "猫",
  dog: "犬",
  other: "その他",
  small: "小動物",
};

const formatDate = (value: string | number) =>
  new Intl.DateTimeFormat("ja-JP", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Tokyo",
    year: "numeric",
  }).format(new Date(typeof value === "number" ? value * 1000 : `${value}T12:00:00+09:00`));

const errorMessages: Record<string, string> = {
  image: "写真を読み込めませんでした。10MB以下のJPEG・PNG・WebPを選び直してください。",
  invalid: "入力内容を確認してください。住所、電話番号、メール、SNSのIDは入力できません。",
  photo: "写真の安全な変換に失敗しました。別の写真を選んでください。",
  rate: "今日は3件作成済みです。明日また作れます。",
};

function SamplePoster() {
  return (
    <article class="poster-card sample-poster" aria-label="迷子ポスターの作成例">
      <div class="poster-ribbon">
        <span>迷子です</span>
        <b>捜索中</b>
      </div>
      <div class="sample-photo" data-preview-photo aria-hidden="true">
        <span>⌁</span>
        <i></i>
        <i></i>
        <i></i>
      </div>
      <div class="poster-pet">
        <span data-preview-type>鳥</span>
        <h2 data-preview-name>ポンズ</h2>
        <p data-preview-color>黄緑色・ほほが青い</p>
      </div>
      <dl class="poster-facts">
        <div>
          <dt>いつ</dt>
          <dd data-preview-date>7月23日</dd>
        </div>
        <div>
          <dt>どこ</dt>
          <dd data-preview-place>和歌山県 かつらぎ町</dd>
        </div>
      </dl>
      <p class="poster-features" data-preview-features>
        人の肩に乗るセキセイインコ。右足に青いリングがあります。
      </p>
      <div class="poster-contact">
        <span class="sample-qr" aria-hidden="true">
          <i></i>
          <i></i>
          <i></i>
          <i></i>
          <i></i>
        </span>
        <p>
          <b>見かけた場所を教えてください</b>
          <small>連絡先を公開せず、このQRから送れます</small>
        </p>
      </div>
    </article>
  );
}

export function HomePage({
  createMode = false,
  error = "",
}: {
  createMode?: boolean;
  error?: string;
}) {
  return (
    <Layout scripts={["/builder.js"]}>
      <section class={`builder-shell${createMode ? " create-focus" : ""}`}>
        <header class="product-heading">
          <div>
            <p class="eyebrow">SEARCH PAGE + QR POSTER</p>
            <h1>{product.headline}</h1>
            <p>写真と特徴を一度入力。共有ページ、印刷ポスター、目撃フォームが同時にできます。</p>
          </div>
          <div class="action-strip" aria-label="写真から捜索ページとポスターを作る流れ">
            <span class="action-photo">●</span>
            <i></i>
            <span class="action-sheet">▦</span>
            <i></i>
            <span class="action-pin">⌖</span>
          </div>
        </header>

        {errorMessages[error] ? (
          <div class="notice error" role="alert">
            {errorMessages[error]}
          </div>
        ) : null}

        <div class="builder-workspace">
          <form
            action="/campaigns"
            class="builder-panel"
            data-campaign-form
            enctype="multipart/form-data"
            method="post"
          >
            <input data-session-field name="session_id" type="hidden" />
            <label class="honeypot" aria-hidden="true">
              ウェブサイト
              <input autocomplete="off" name="website" tabindex={-1} />
            </label>
            <div class="panel-heading">
              <div>
                <p class="panel-kicker">SEARCH KIT</p>
                <h2>捜索ページをつくる</h2>
              </div>
              <span>登録不要</span>
            </div>

            <label class="photo-field">
              <input
                accept="image/jpeg,image/png,image/webp"
                data-photo-input
                name="photo"
                required
                type="file"
              />
              <span class="photo-button">
                <i aria-hidden="true">＋</i>
                <b>ペットの写真を選ぶ</b>
                <small>端末内で位置情報を除いてから送信します</small>
              </span>
            </label>

            <div class="two-columns">
              <label class="field">
                <span>種類</span>
                <select data-preview-type-input name="pet_type" required>
                  <option value="dog">犬</option>
                  <option value="cat">猫</option>
                  <option selected value="bird">
                    鳥
                  </option>
                  <option value="small">小動物</option>
                  <option value="other">その他</option>
                </select>
              </label>
              <label class="field">
                <span>呼び名</span>
                <input
                  data-preview-name-input
                  maxlength={24}
                  name="pet_name"
                  placeholder="例：ポンズ"
                />
              </label>
            </div>

            <div class="two-columns">
              <label class="field">
                <span>迷子になった日</span>
                <input data-preview-date-input name="lost_date" required type="date" />
              </label>
              <label class="field">
                <span>都道府県</span>
                <select data-preview-prefecture name="prefecture" required>
                  <option value="">選んでください</option>
                  {[
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
                  ].map((prefecture) => (
                    <option value={prefecture}>{prefecture}</option>
                  ))}
                </select>
              </label>
            </div>

            <label class="field">
              <span>
                市区町村 <small>番地や自宅住所は書かない</small>
              </span>
              <input
                data-preview-municipality
                maxlength={40}
                minlength={2}
                name="municipality"
                placeholder="例：伊都郡かつらぎ町"
                required
              />
            </label>

            <label class="field">
              <span>色・見た目</span>
              <input
                data-preview-color-input
                maxlength={60}
                minlength={2}
                name="color"
                placeholder="例：黄緑色、ほほが青い"
                required
              />
            </label>

            <label class="field">
              <span>見分ける特徴</span>
              <textarea
                data-preview-features-input
                maxlength={240}
                minlength={10}
                name="features"
                placeholder="例：人の肩に乗ります。右足に青いリングがあります。"
                required
                rows={4}
              ></textarea>
            </label>

            <label class="field">
              <span>
                見かけたときの注意 <small>任意</small>
              </span>
              <input
                maxlength={100}
                name="caution"
                placeholder="例：追わずに、いる場所を送ってください"
              />
            </label>

            <fieldset>
              <legend>公開期間</legend>
              <div class="choice-row">
                <label>
                  <input name="expiry_days" type="radio" value="14" />
                  <span>14日</span>
                </label>
                <label>
                  <input checked name="expiry_days" type="radio" value="30" />
                  <span>30日</span>
                </label>
                <label>
                  <input name="expiry_days" type="radio" value="60" />
                  <span>60日</span>
                </label>
              </div>
            </fieldset>

            <button class="button primary" data-submit-button type="submit">
              <span aria-hidden="true">＋</span> 捜索ページをつくる
            </button>
            <p class="form-boundary">
              電話・メール・SNS IDは公開しません。目撃情報は管理画面だけに届きます。
            </p>
            <p class="form-message" data-form-message role="status"></p>
          </form>

          <section class="preview-panel" aria-label="迷子ポスターのプレビュー">
            <div class="panel-heading">
              <div>
                <p class="panel-kicker">LIVE PREVIEW</p>
                <h2>QRポスターの見本</h2>
              </div>
              <span>A4印刷対応</span>
            </div>
            <SamplePoster />
            <div class="preview-caption">
              <span class="caption-icon" aria-hidden="true">
                ⌖
              </span>
              <div>
                <strong>目撃情報は公開されません</strong>
                <p>QRから届いた日時・場所・移動方向を、管理鍵を持つ人だけが確認できます。</p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </Layout>
  );
}

function CampaignFacts({ campaign }: { campaign: CampaignView }) {
  return (
    <dl class="campaign-facts">
      <div>
        <dt>種類</dt>
        <dd>{petTypeLabels[campaign.petType]}</dd>
      </div>
      <div>
        <dt>迷子になった日</dt>
        <dd>{formatDate(campaign.lostDate)}</dd>
      </div>
      <div>
        <dt>地域</dt>
        <dd>
          {campaign.prefecture} {campaign.municipality}
        </dd>
      </div>
      <div>
        <dt>色・見た目</dt>
        <dd>{campaign.color}</dd>
      </div>
    </dl>
  );
}

export function CampaignPage({ campaign }: { campaign: CampaignView }) {
  const displayName = campaign.petName || petTypeLabels[campaign.petType];
  const isActive = campaign.status === "active";
  const campaignUrl = `${product.url}/campaigns/${campaign.id}`;
  return (
    <Layout
      canonicalUrl={campaignUrl}
      description={`${campaign.prefecture}${campaign.municipality}で迷子になった${displayName}の捜索ページです。`}
      imageUrl={`${product.url}/campaigns/${campaign.id}/photo`}
      noIndex
      scripts={["/campaign.js"]}
      title={`${displayName}を探しています | ${product.name}`}
    >
      <article
        class={`campaign-shell status-${campaign.status}`}
        data-campaign-id={campaign.id}
        data-campaign-name={displayName}
      >
        <header class="campaign-heading">
          <div class="status-stamp">
            <span>
              {isActive ? "捜索中" : campaign.status === "resolved" ? "帰宅・保護済み" : "公開終了"}
            </span>
            <small>{formatDate(campaign.lostDate)}</small>
          </div>
          <div>
            <p class="eyebrow">MISSING PET SEARCH</p>
            <h1>
              {displayName}
              <span>を探しています</span>
            </h1>
            <p>
              {campaign.prefecture} {campaign.municipality}
            </p>
          </div>
        </header>

        <div class="campaign-grid">
          <figure class="campaign-photo">
            <img
              alt={`${displayName}の捜索用写真`}
              height="1200"
              src={`/campaigns/${campaign.id}/photo`}
              width="1200"
            />
            <figcaption>{campaign.color}</figcaption>
          </figure>
          <section class="campaign-detail">
            <CampaignFacts campaign={campaign} />
            <div class="feature-note">
              <span>見分ける特徴</span>
              <p>{campaign.features}</p>
            </div>
            {campaign.caution ? (
              <div class="caution-note">
                <span aria-hidden="true">!</span>
                <p>{campaign.caution}</p>
              </div>
            ) : null}
            <div class="campaign-actions">
              <button class="button primary" data-share type="button">
                この捜索ページを共有
              </button>
              <a class="button secondary" data-poster href={`/campaigns/${campaign.id}/poster`}>
                QRポスターを開く
              </a>
            </div>
          </section>
        </div>

        {isActive ? (
          <section class="sighting-dock">
            <header>
              <span class="sighting-mark" aria-hidden="true">
                ⌖
              </span>
              <div>
                <p class="panel-kicker">SIGHTING REPORT</p>
                <h2>見かけた場所を送る</h2>
                <p>連絡先は不要です。送った内容は作成者だけが確認します。</p>
              </div>
            </header>
            <form data-sighting-form>
              <div class="two-columns">
                <label class="field">
                  <span>見かけた日時</span>
                  <input data-seen-at name="seen_at" required type="datetime-local" />
                </label>
                <label class="field">
                  <span>
                    おおよその場所 <small>住所は書かない</small>
                  </span>
                  <input
                    maxlength={80}
                    minlength={2}
                    name="area"
                    placeholder="例：○○公園の北側"
                    required
                  />
                </label>
              </div>
              <div class="two-columns">
                <label class="field">
                  <span>
                    移動した方向 <small>任意</small>
                  </span>
                  <input maxlength={60} name="direction" placeholder="例：駅の方向へ飛んだ" />
                </label>
                <label class="field">
                  <span>
                    様子 <small>任意</small>
                  </span>
                  <input maxlength={100} name="behavior" placeholder="例：木の上で鳴いていた" />
                </label>
              </div>
              <label class="honeypot" aria-hidden="true">
                ウェブサイト
                <input autocomplete="off" name="website" tabindex={-1} />
              </label>
              <button class="button report-button" type="submit">
                目撃情報を送る
              </button>
              <p class="form-message" data-sighting-message role="status"></p>
            </form>
          </section>
        ) : (
          <section class="resolved-board">
            <span aria-hidden="true">✓</span>
            <div>
              <h2>この捜索は終了しました</h2>
              <p>
                {campaign.status === "resolved"
                  ? "帰宅または保護済みです。共有・捜索へのご協力ありがとうございました。"
                  : "作成者が公開を終了したか、公開期限を迎えました。"}
              </p>
            </div>
          </section>
        )}

        <div class="campaign-tools">
          <span>公開期限 {formatDate(campaign.expiresAt)}</span>
          <button class="text-button" data-report type="button">
            問題を報告
          </button>
        </div>
      </article>
    </Layout>
  );
}

export function PosterPage({ campaign }: { campaign: CampaignView }) {
  const displayName = campaign.petName || petTypeLabels[campaign.petType];
  return (
    <Layout
      canonicalUrl={`${product.url}/campaigns/${campaign.id}/poster`}
      noIndex
      scripts={["/poster.js"]}
      title={`${displayName}のQRポスター | ${product.name}`}
    >
      <section class="poster-page" data-campaign-id={campaign.id}>
        <div class="poster-toolbar">
          <a class="text-link" href={`/campaigns/${campaign.id}`}>
            ← 捜索ページへ
          </a>
          <button class="button primary" data-print type="button">
            印刷・PDF保存
          </button>
        </div>
        <article class="print-poster">
          <header>
            <span>迷子です</span>
            <b>{petTypeLabels[campaign.petType]}</b>
          </header>
          <div class="print-body">
            <figure>
              <img
                alt={`${displayName}の捜索用写真`}
                height="1200"
                src={`/campaigns/${campaign.id}/photo`}
                width="1200"
              />
            </figure>
            <div class="print-name">
              <span>呼び名</span>
              <h1>{displayName}</h1>
              <p>{campaign.color}</p>
            </div>
            <CampaignFacts campaign={campaign} />
            <section class="print-features">
              <h2>見分ける特徴</h2>
              <p>{campaign.features}</p>
            </section>
            {campaign.caution ? <p class="print-caution">{campaign.caution}</p> : null}
          </div>
          <footer>
            <img
              alt="目撃情報フォームのQRコード"
              height="360"
              src={`/campaigns/${campaign.id}/qr.svg`}
              width="360"
            />
            <div>
              <b>見かけた場所を教えてください</b>
              <p>QRを読み取り、日時と場所を送れます。電話番号やメールは表示されません。</p>
              <small>maigo-poster.yhay81.com</small>
            </div>
          </footer>
        </article>
      </section>
    </Layout>
  );
}

export function ManagePage({ campaign }: { campaign: CampaignView }) {
  const displayName = campaign.petName || petTypeLabels[campaign.petType];
  return (
    <Layout noIndex scripts={["/manage.js"]} title={`捜索の管理 | ${product.name}`}>
      <section
        class="manage-shell"
        data-campaign-id={campaign.id}
        data-campaign-status={campaign.status}
      >
        <header class="manage-heading">
          <div class="manage-key" aria-hidden="true">
            <i></i>
            <i></i>
            <span>⌖</span>
          </div>
          <div>
            <p class="eyebrow">OWNER DESK</p>
            <h1>{displayName}の捜索を管理</h1>
            <p>このURLの末尾に管理鍵があります。ブックマークして、他の人には渡さないでください。</p>
          </div>
        </header>

        <div class="manage-grid">
          <section class="share-ticket">
            <span>共有するURL</span>
            <strong>
              {campaign.prefecture} {campaign.municipality}
            </strong>
            <code data-share-url>{`${product.url}/campaigns/${campaign.id}`}</code>
            <div class="ticket-actions">
              <button class="button primary" data-copy-url type="button">
                URLと共有文をコピー
              </button>
              <a class="button secondary" href={`/campaigns/${campaign.id}/poster`}>
                QRポスター
              </a>
            </div>
          </section>

          <section class="manage-controls">
            <div class="status-row">
              <span>現在の状態</span>
              <strong data-status-label>
                {campaign.status === "active"
                  ? "捜索中"
                  : campaign.status === "resolved"
                    ? "帰宅・保護済み"
                    : campaign.status === "closed"
                      ? "公開終了"
                      : "非表示"}
              </strong>
            </div>
            <p>公開期限は {formatDate(campaign.expiresAt)}。期限から35日以内に削除されます。</p>
            <div class="control-row">
              <button class="button resolved-button" data-resolve type="button">
                帰宅・保護済みにする
              </button>
              <button class="button secondary" data-reopen type="button">
                捜索を再開
              </button>
            </div>
            <button class="danger-button" data-delete type="button">
              写真・目撃情報をすべて削除
            </button>
            <p class="manage-message" data-manage-message role="status"></p>
          </section>
        </div>

        <div class="owner-workspace">
          <section class="sightings-panel">
            <header>
              <div>
                <p class="panel-kicker">PRIVATE SIGHTINGS</p>
                <h2>届いた目撃情報</h2>
              </div>
              <button class="text-button" data-refresh type="button">
                更新
              </button>
            </header>
            <div class="sightings-list" data-sightings>
              <p class="empty-message">管理鍵を確認して読み込みます。</p>
            </div>
          </section>

          <section class="action-checklist">
            <header>
              <p class="panel-kicker">FIRST ACTIONS</p>
              <h2>先に連絡する場所</h2>
            </header>
            <label>
              <input data-checklist="police" type="checkbox" />
              <span>交番・警察署</span>
            </label>
            <label>
              <input data-checklist="center" type="checkbox" />
              <span>保健所・動物愛護センター</span>
            </label>
            <label>
              <input data-checklist="vet" type="checkbox" />
              <span>近くの動物病院</span>
            </label>
            <label>
              <input data-checklist="neighborhood" type="checkbox" />
              <span>近所の施設・店舗</span>
            </label>
            <a
              class="text-link"
              href="https://www.env.go.jp/nature/dobutsu/aigo/shuyo/if.html"
              rel="noreferrer"
              target="_blank"
            >
              環境省の案内を確認 ↗
            </a>
          </section>
        </div>
      </section>
    </Layout>
  );
}

export function GuidePage() {
  return (
    <Layout title={`迷子ペットの探し方 | ${product.name}`}>
      <article class="guide-shell">
        <header>
          <p class="eyebrow">SEARCH ROUTE</p>
          <h1>掲示だけで終わらせず、連絡・捜索・更新を並べる。</h1>
        </header>
        <div class="guide-grid">
          <section>
            <span class="step-number">1</span>
            <div class="guide-visual call-visual" aria-hidden="true">
              <i></i>
              <i></i>
              <i></i>
            </div>
            <h2>公的窓口へ連絡</h2>
            <p>保健所、動物管理センター、交番、近くの動物病院へ連絡します。</p>
          </section>
          <section>
            <span class="step-number">2</span>
            <div class="guide-visual poster-visual" aria-hidden="true">
              <i></i>
              <b>⌖</b>
            </div>
            <h2>同じ情報を広げる</h2>
            <p>共有ページ、SNS用文面、QRポスターで情報のばらつきを減らします。</p>
          </section>
          <section>
            <span class="step-number">3</span>
            <div class="guide-visual sighting-visual" aria-hidden="true">
              <span>1</span>
              <span>2</span>
              <span>3</span>
            </div>
            <h2>目撃を時系列で確認</h2>
            <p>日時・場所・移動方向を管理画面へ集め、捜索範囲の判断に使います。</p>
          </section>
        </div>
        <section class="safety-board">
          <div>
            <h2>このサービスだけで発見を保証するものではありません</h2>
            <p>
              実地捜索、公的窓口への届出、既存掲示板や地域SNSとの併用が必要です。
              不審な連絡や金銭要求には応じず、保護時は動物の安全を優先してください。
            </p>
          </div>
          <a
            class="button secondary"
            href="https://www.env.go.jp/nature/dobutsu/aigo/shuyo/if.html"
            rel="noreferrer"
            target="_blank"
          >
            環境省の案内
          </a>
          <a class="button primary" href="/create">
            捜索ページをつくる
          </a>
        </section>
      </article>
    </Layout>
  );
}

export function PrivacyPage() {
  return (
    <Layout title={`プライバシー | ${product.name}`}>
      <article class="prose">
        <p class="eyebrow">PRIVACY & SAFETY</p>
        <h1>探すために必要な範囲だけ、公開します。</h1>
        <h2>公開するもの</h2>
        <p>
          ペットの写真、種類、任意の呼び名、迷子になった日、都道府県、市区町村、色・特徴、
          見かけたときの注意、捜索状態を共有URLに表示します。共有ページは検索一覧へ掲載しません。
        </p>
        <h2>作成者だけが見られるもの</h2>
        <p>
          目撃日時、おおよその場所、移動方向、様子は管理鍵を持つ作成者だけが確認できます。
          目撃内容を公開ページへ表示しません。
        </p>
        <h2>保存しないもの</h2>
        <p>
          Cookie、氏名、番地、自宅住所、電話番号、メール、SNSアカウント、IPアドレス、
          User-Agent、会話、決済情報は保存しません。写真はブラウザーでWebPへ再生成し、
          EXIF位置情報を除いてから送信します。
        </p>
        <h2>削除と保持期間</h2>
        <p>
          作成者は管理URLから即時削除できます。14・30・60日の選択期限で閉じ、
          期限から35日以内に写真・目撃情報を含めて削除します。匿名利用指標と通報も35日以内に削除します。
        </p>
        <h2>安全のための制限</h2>
        <p>
          住所、連絡先、URL、SNS
          IDを入力できません。3つの異なる匿名セッションから通報されたページは自動で非表示になります。
          捜索代行、保護の仲介、本人確認、金銭の受け渡しは提供しません。
        </p>
      </article>
    </Layout>
  );
}

export function NotFoundPage({ expired = false }: { expired?: boolean }) {
  return (
    <Layout noIndex title={`捜索ページが見つかりません | ${product.name}`}>
      <section class="empty-shell">
        <div class="empty-poster" aria-hidden="true">
          <i></i>
          <i></i>
          <span>⌖</span>
        </div>
        <p class="eyebrow">SEARCH CLOSED</p>
        <h1>{expired ? "この捜索ページは公開を終了しました。" : "ページが見つかりません。"}</h1>
        <p>公開期限を過ぎたか、作成者が終了・削除した可能性があります。</p>
        <a class="button primary" href="/create">
          新しい捜索ページをつくる
        </a>
      </section>
    </Layout>
  );
}
