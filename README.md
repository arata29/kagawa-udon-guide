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
- `sync:places` : Google Places Text Search で店舗候補を取得しDBに upsert
- `sync:details` : Place Details を取得して評価・レビュー・営業時間などを更新
- `export:places` : `places_kagawa_udon.csv` に店舗情報を出力
- `delete:places` : Place / PlaceCache の全件削除（確認プロンプトあり）

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
```

## 注意点

- Places API のデータは変更されるため、営業時間や評価は最新ではない場合があります。
- `sync:details` はAPIクレジットを消費します。必要に応じて件数やスリープ時間を調整してください。
- `delete:places` は全件削除です。実行時は確認プロンプトがあります。
