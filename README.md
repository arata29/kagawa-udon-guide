# 香川県うどんランキング

香川県の讃岐うどん店をランキング・一覧・地図で比較できるサイトです。
Google Maps の評価・レビュー件数を利用してランキングを作成しています。

## 主要ページ

- `/` : 総合ランキング
- `/rankings` : ランキング一覧（総合/エリア別）
- `/rankings/area/[area]` : エリア別ランキング
- `/list` : 一覧検索
- `/map` : 地図検索
- `/shops/[placeId]` : 店舗詳細
- `/about` `/contact` `/privacy` `/terms` : 運営者情報・問い合わせ・ポリシー

## ソース構成（概要）

- `src/app` : Next.js App Router のページ群
- `src/components` : 共通コンポーネント
- `src/lib` : Prisma クライアント・ランキング計算・営業時間判定などのユーティリティ
- `scripts` : データ同期やエクスポートなどのバッチ処理
- `prisma` : Prisma スキーマとマイグレーション
- `config` : 判定用 CSV
- `public` : 画像・ads.txt などの静的ファイル

## スクリプト

すべて `npm run <script>` で実行します。

- `dev` : 開発サーバー起動（Next.js）
- `build` : 本番ビルド
- `start` : 本番起動
- `lint` : ESLint
- `audit:prod` : 本番依存のみの脆弱性監査（推奨）
- `audit:all` : 開発依存を含む脆弱性監査
- `audit:fix:safe` : 非破壊的な範囲で自動修正
- `sync:places` : Google Places Text Search で店舗候補を取得（新規のみ追加）
- `sync:details` : Place Details を取得して評価・レビュー・営業時間などを更新（直近更新はスキップ）
- `delete:places` : Place / PlaceCache の全件削除（確認プロンプトあり）
- `test:e2e:smoke` : スモークE2E（主要ページ・sitemap/robots・contact API検証）
- `release:check` : 公開前チェック一式（`lint`→`build`→本番起動→`test:e2e:smoke`）

## 公開前最終チェック

```
npm run release:check
```

`release:check` は以下を自動実行します。

- `lint`
- `build`
- 本番サーバー起動（デフォルト `3100` ポート）
- `test:e2e:smoke`
  - `sitemap.xml` / `robots.txt` の確認
  - 主要ページのHTTP応答と本文キーワード確認
  - `sitemap.xml` 内URLの全件HTTP確認
  - `contact` APIの入力バリデーションとレート制限確認
- サーバー停止

### オプション環境変数

- `RELEASE_CHECK_PORT` : `release:check` で使う起動ポート（既定: `3100`）
- `E2E_BASE_URL` : E2E接続先URL（通常は未指定でOK）
- `E2E_CONCURRENCY` : sitemap URL確認の並列数（既定: `8`）

## セキュリティ監査ポリシー

- まず `npm run audit:prod` を基準に確認します（本番影響のある依存を優先）。
- `npm run audit:all` で出る開発依存の警告は、破壊的更新の必要有無を見て別途判断します。
- `npm audit fix --force` は破壊的変更を含むため、通常運用では使わず検証ブランチでのみ実施します。

## DB（Prisma）

- `prisma/schema.prisma` がDB定義
- `src/lib/prisma.ts` がPrismaクライアント
- マイグレーションは `prisma/migrations` に保存
- 代表的なモデル
  - `Place` : Place ID のマスタ
  - `PlaceCache` : Places API から取得した表示用データ

### マイグレーションの例

```
npx prisma migrate dev -n <migration-name>
npx prisma generate
```

本番適用は以下を使用します。

```
npx prisma migrate deploy
```

## 判定CSV

- `config/udon-include.csv` : うどん店の判定キーワード
- `config/udon-exclude.csv` : うどん店から除外するキーワード

## 環境変数（例）

```
GOOGLE_MAPS_API_KEY=...
NEXT_PUBLIC_SITE_URL=...
SYNC_DETAILS_MIN_AGE_DAYS=14
SYNC_DETAILS_TAKE=1000
SYNC_DETAILS_SLEEP_MS=120
SYNC_PLACES_FULL=0
```

## 注意点

- Places API のデータは変更されるため、営業時間や評価は最新ではない場合があります。
- `sync:details` はAPIクレジットを消費します。必要に応じて件数やスリープ時間を調整してください。
- `SYNC_DETAILS_MIN_AGE_DAYS` を短くすると更新頻度は上がりますが、API使用量も増えます。
- `sync:places` は通常は新規のみ追加です。月1回などで `SYNC_PLACES_FULL=1` にすると既存の住所/種別も更新できます。
- `delete:places` は全件削除です。実行時は確認プロンプトがあります。
