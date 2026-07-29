# Metrics

D1には匿名セッションID、操作名、対象キャンペーンID、日付、作成時刻だけを35日保持します。

## Events

- `visited`
- `campaign_created`
- `campaign_viewed`
- `poster_opened`
- `poster_printed`
- `campaign_shared`
- `sighting_submitted`
- `owner_checked`
- `campaign_resolved`
- `returned`

## Funnel

1. 訪問
2. 捜索ページ作成
3. ポスター印刷または共有
4. 共有ページ閲覧
5. 目撃情報送信
6. 作成者確認
7. 帰宅・保護更新
8. 別日再訪

`npm run metrics` でproduction集計をJSON出力します。自動確認セッションは実利用者として数えません。
