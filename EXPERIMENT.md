# Experiment

## User and job

- Target user: 日本国内で犬、猫、鳥、小動物を迷子にし、捜索情報を急いで広げたい飼い主
- Job to be done: 同じ情報から捜索ページ、ポスター、共有文を作り、安全に目撃情報を集め、帰宅・保護まで更新する
- Current workaround: 複数掲示板、SNS投稿、手作りポスター、電話・DM、メモで別々に管理する

## Hypothesis

写真と特徴を一度入力して、匿名目撃フォーム付きの共有ページとQRポスターを同時に作れれば、迷子案件の初動を早め、連絡先を公開せず実際の捜索に使われる。

## Method

- Recruitment channel: Tool Shelf、検索流入。実案件投稿者への個別連絡は別途明示承認後
- Participants: 実案件または直近案件の作成者5人以上、共有ページ閲覧者50人以上
- Duration: 公開から30日
- Comparison: ページ作成、ポスター印刷、共有、目撃送信、管理画面確認、帰宅・保護更新

## Decision

- Success signal: 実案件5件、作成者5人、ポスター印刷または共有3件、目撃情報3件、帰宅・保護更新1件
- Failure signal: 30日で実案件2件未満、またはポスター印刷・共有が0件
- Stop signal: 虚偽・個人情報・危険な投稿が作成数の10%を超える、または匿名目撃フォームを安全に運用できない
- Deadline: 公開30日後
- Maximum build time: 2日
- Maximum monthly infrastructure cost: 5 USD

## Guardrails

- 番地、自宅住所、氏名、電話、メール、SNS ID、金銭情報を扱わない。
- 写真は端末内でWebPへ再生成し、位置情報を除く。
- 目撃情報は公開せず、256-bit管理鍵を持つ作成者だけが確認する。
- 公的窓口への届出や実地捜索を代替すると表示しない。
- 成功条件を途中で変更しない。
