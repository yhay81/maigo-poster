# まいごポスター

迷子ペットの捜索ページ、QRポスター、SNS用共有文、匿名の目撃フォームを一度に作る日本語Webサービスです。

- 本番: https://maigo-poster.yhay81.com
- 所有者: yhay81
- 公開範囲: 個人プロジェクトとして公開

## Product

作成者はペットの写真、種類、迷子になった日、市区町村、色・特徴を入力し、期限付き共有URLとQRポスターを作ります。閲覧者は連絡先を入力せず、見かけた日時・おおよその場所・移動方向・様子を送れます。目撃内容は管理鍵を持つ作成者だけが確認します。

写真はブラウザーでWebPへ再生成してEXIF位置情報を除きます。氏名、番地、自宅住所、電話、メール、SNS ID、IPアドレス、決済情報は保存しません。共有ページは検索一覧へ掲載しません。

## Development

```powershell
npm ci
npx wrangler d1 migrations apply maigo-poster --local
npm run dev
npm run check
npm test
npm run build
```

本番移行と配信:

```powershell
npx wrangler d1 migrations apply maigo-poster --remote
npm run deploy
```
