import type { Child } from "hono/jsx";

import { product } from "../config/product";

type LayoutProps = {
  canonicalUrl?: string;
  children: Child;
  description?: string;
  imageUrl?: string;
  noIndex?: boolean;
  scripts?: string[];
  title?: string;
};

export function Layout({
  canonicalUrl = product.url,
  children,
  description = product.description,
  imageUrl = `${product.url}/og.png`,
  noIndex = false,
  scripts = [],
  title = product.name,
}: LayoutProps) {
  return (
    <html itemscope itemtype="https://schema.org/WebApplication" lang="ja">
      <head>
        <meta charset="utf-8" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <meta content={description} name="description" />
        {noIndex ? <meta content="noindex,nofollow,noarchive" name="robots" /> : null}
        <meta content={product.name} itemProp="name" />
        <meta content={description} itemProp="description" />
        <meta content={product.url} itemProp="url" />
        <meta content={product.applicationCategory} itemProp="applicationCategory" />
        <meta content="Any" itemProp="operatingSystem" />
        <meta content="true" itemProp="isAccessibleForFree" />
        <meta content={description} property="og:description" />
        <meta content={imageUrl} property="og:image" />
        <meta content="ja_JP" property="og:locale" />
        <meta content={title} property="og:title" />
        <meta content="website" property="og:type" />
        <meta content={canonicalUrl} property="og:url" />
        <meta content="summary_large_image" name="twitter:card" />
        <link href={canonicalUrl} rel="canonical" />
        <link href="/styles.css" rel="stylesheet" />
        <script defer src="/common.js"></script>
        {scripts.map((script) => (
          <script defer src={script}></script>
        ))}
        <title>{title}</title>
      </head>
      <body>
        <a class="skip-link" href="#main">
          本文へ移動
        </a>
        <header class="site-header">
          <a class="brand" href="/" aria-label="まいごポスター ホーム">
            <span class="brand-mark" aria-hidden="true">
              <i></i>
              <i></i>
              <i></i>
            </span>
            <span>{product.name}</span>
          </a>
          <nav aria-label="メイン">
            <a href="/">つくる</a>
            <a href="/guide">探し方</a>
            <a class="nav-cta" href="/create">
              捜索ページを作成
            </a>
          </nav>
        </header>
        <main id="main">{children}</main>
        <footer>
          <span>公開するのは、市区町村まで。</span>
          <nav aria-label="フッター">
            <a href="/guide">探し方</a>
            <a href="/privacy">プライバシー</a>
            <a href="/healthz">稼働状態</a>
          </nav>
        </footer>
      </body>
    </html>
  );
}
