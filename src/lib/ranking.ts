/**
 * ベイズ平均（Bayesian average）で「評価点×件数」の信頼度込みスコアを計算する。
 *
 * 目的：
 * - レビュー件数(v)が少ない店が、たまたま高評価(R)だけで上位に来るのを防ぐ。
 * - 件数が増えるほど、その店の評価(R)をより強く反映する。
 *
 * パラメータ：
 * - R: 店の平均評価（例：Google rating、0〜5）
 * - v: 店のレビュー件数（例：userRatingCount）
 * - C: 全体の平均評価（全店舗の平均 rating）
 * - m: 信頼度の閾値（「最低これくらいの件数があると信用する」という基準件数）
 */
export function bayesScore(R: number, v: number, C: number, m: number) {
  // v が小さいほど C（全体平均）寄り、v が大きいほど R（店の平均）寄りになる
  const weightR = v / (v + m);
  const weightC = m / (v + m);
  return weightR * R + weightC * C;
}
