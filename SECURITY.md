# Security

## Boundary

- Cloudflare Workers + Hono JSX + D1 + R2
- Cookieとログインなし
- 作成は1匿名セッション1日3件、目撃送信は1日10件まで
- キャンペーンIDは128-bit、管理鍵は256-bit
- 管理鍵はURLフラグメントで渡し、D1にはSHA-256ハッシュだけを保存
- 管理鍵比較は定数時間
- mutationはsame-origin、本文サイズ、Content-Typeを検証
- CSP、HSTS、COOP、CORP、no-referrer、frame denialを有効化

## Photo safety

- ブラウザーのCanvasで最大1600pxのWebPへ再生成し、EXIF位置情報を除く
- Workerは1.8MB以下のWebPだけを受け付け、EXIF/XMP/ICCチャンクを拒否
- 写真は推測不能なキャンペーンID経由でのみ配信し、no-store/noindex

## Content safety

- 番地、自宅住所、連絡先、URL、SNS ID、金銭要求を公開入力と目撃入力で拒否
- 共有ページと管理URLは検索一覧へ掲載しない
- 異なる3匿名セッションの通報で自動非表示
- 管理URLから帰宅・保護済み更新、再公開、即時削除が可能

## Reporting

脆弱性はGitHubのPrivate Vulnerability Reportingから報告してください。公開Issueへ秘密情報や実在の迷子・目撃情報を書かないでください。
