'use client';

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

// 地震ハザード曲線のダミーデータ (PGA vs 年超過頻度)
const seismicData = [
  { pga: 0.05, fractile95: 1.2e-3, mean: 5.5e-4, fractile50: 3.2e-4, fractile5: 8.5e-5 },
  { pga: 0.1, fractile95: 8.5e-4, mean: 3.8e-4, fractile50: 2.1e-4, fractile5: 4.2e-5 },
  { pga: 0.2, fractile95: 4.1e-4, mean: 1.8e-4, fractile50: 9.5e-5, fractile5: 1.8e-5 },
  { pga: 0.3, fractile95: 2.1e-4, mean: 8.5e-5, fractile50: 4.2e-5, fractile5: 7.2e-6 },
  { pga: 0.4, fractile95: 9.8e-5, mean: 4.1e-5, fractile50: 1.8e-5, fractile5: 3.1e-6 },
  { pga: 0.5, fractile95: 5.2e-5, mean: 1.9e-5, fractile50: 8.5e-6, fractile5: 1.2e-6 },
  { pga: 0.6, fractile95: 2.8e-5, mean: 9.5e-6, fractile50: 3.8e-6, fractile5: 4.5e-7 },
  { pga: 0.7, fractile95: 1.4e-5, mean: 4.5e-6, fractile50: 1.6e-6, fractile5: 1.8e-7 },
  { pga: 0.8, fractile95: 7.2e-6, mean: 2.1e-6, fractile50: 7.5e-7, fractile5: 6.2e-8 },
  { pga: 0.9, fractile95: 3.5e-6, mean: 9.8e-7, fractile50: 3.2e-7, fractile5: 2.1e-8 },
  { pga: 1.0, fractile95: 1.8e-6, mean: 4.2e-7, fractile50: 1.3e-7, fractile5: 7.5e-9 }
];

export default function PitchPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 10;
  const [isMounted, setIsMounted] = useState(false);

  // SSR時のハイドレーション及び描画崩れ防止
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // --- 特徴2: 共同編集デモステート ---
  const [collabLogs, setCollabLogs] = useState<Array<{ id: number; user: string; action: string; color: string }>>([
    { id: 1, user: 'User A (東京)', action: 'モデリングセッションに参加しました', color: 'var(--accent-green)' },
    { id: 2, user: 'User B (大阪)', action: 'モデリングセッションに参加しました', color: 'var(--accent-cyan)' }
  ]);
  const [collabStep, setCollabStep] = useState(0);

  // --- 特徴3: Diff & マージデモステート ---
  const [diffMerged, setDiffMerged] = useState(false);

  // --- 特徴4: 地震PRAステート ---
  const [pga, setPga] = useState(0.4);

  // キーボードナビゲーション
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        e.preventDefault();
        setCurrentSlide((prev) => Math.min(prev + 1, totalSlides - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentSlide((prev) => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 共同編集デモステップ進行
  const triggerCollabAction = () => {
    const steps = [
      { user: 'User A (東京)', action: '基本事象「DG-A (非常用ディーゼル発電機A) 起動失敗」の確率を 3.0e-3 に変更', color: 'var(--accent-green)' },
      { user: 'User B (大阪)', action: 'ゲート「G-01 (非常用電源喪失)」の下に新しく「G-02 (DG-B系統失敗)」を追加 (ANDゲート)', color: 'var(--accent-cyan)' },
      { user: 'CRDT同期エンジン', action: 'コンフリクトをミリ秒で自動解決。モデル整合性を100%維持', color: 'var(--accent-purple)' },
      { user: '全員の画面', action: '定量化結果が自動再計算され、トップ事象確率が 4.12e-4 に瞬時に同期！', color: 'var(--accent-amber)' }
    ];

    if (collabStep < steps.length) {
      const nextLog = steps[collabStep];
      setCollabLogs((prev) => [...prev, { id: Date.now(), ...nextLog }]);
      setCollabStep((prev) => prev + 1);
    } else {
      setCollabLogs([
        { id: 1, user: 'User A (東京)', action: 'モデリングセッションに参加しました', color: 'var(--accent-green)' },
        { id: 2, user: 'User B (大阪)', action: 'モデリングセッションに参加しました', color: 'var(--accent-cyan)' }
      ]);
      setCollabStep(0);
    }
  };

  // 地震PGAに基づく計算値算出
  const getSeismicRiskMetric = () => {
    const baseFreq = 1.8e-4;
    const fragilityValue = 1 / (1 + Math.exp(-10 * (pga - 0.4)));
    const cdf = (baseFreq * fragilityValue).toExponential(4);
    return cdf;
  };

  return (
    <div className="pitch-container">
      {/* 画面全体の動的背景グラデーション */}
      <div className="pitch-bg-glow" />

      {/* ヘッダーエリア */}
      <header className="pitch-header">
        <div className="pitch-header__logo">
          <span className="pitch-header__logo-icon">N</span>
          <span className="pitch-header__logo-text">PRA Nexus</span>
          <span className="pitch-header__badge">PITCH DECK</span>
        </div>
        <div className="pitch-header__status">
          Slide {currentSlide + 1} / {totalSlides}
        </div>
      </header>

      {/* スライド本体エリア */}
      <main className="pitch-viewport">
        {/* スライド1: 表紙 */}
        {currentSlide === 0 && (
          <div className="slide slide--lead fade-in">
            <div className="scratch-badge">100% インハウス・フルスクラッチ開発</div>
            <h1 className="main-title">
              PRA Nexus
            </h1>
            <h2 className="main-subtitle">
              次世代 静的・協調型 確率論的安全評価（PRA）プラットフォーム
            </h2>
            <p className="main-desc">
              解析の厳密化、計算の超高速化、そしてチーム・コラボレーションの革新
            </p>
            <div className="cover-features">
              <span className="feat-chip">⚡ 自社製WASMコア (ミリ秒演算)</span>
              <span className="feat-chip">🤝 複数人リアルタイム同時編集</span>
              <span className="feat-chip">🛡️ SaaS・オンプレミス併用対応</span>
            </div>
            <div className="navigation-hint">
              キーボードの「 <span>→</span> 」または「 <span>Space</span> 」キー、または右下のボタンでスライドを進めます
            </div>
          </div>
        )}

        {/* スライド2: 背景と課題 */}
        {currentSlide === 1 && (
          <div className="slide fade-in">
            <span className="slide-tag">BACKGROUND & CHALLENGE</span>
            <h2 className="slide-title">背景：既存レガシーPRAツールの限界</h2>
            <p className="slide-subtitle">安全性評価の重要性が増す中、従来の設計ツールは深刻なボトルネックに直面しています。</p>

            <div className="cards-grid">
              <div className="challenge-card">
                <div className="card-icon red">📁</div>
                <h3>解析の「孤立化」とバージョン崩壊</h3>
                <p>ファイルベース管理のため、並行編集が一切不可。古いモデルデータへの上書きや、ファイルの散逸が常に発生。</p>
              </div>
              <div className="challenge-card">
                <div className="card-icon red">⏳</div>
                <h3>計算パフォーマンスの限界</h3>
                <p>巨大なフォルトツリーの定量化や不確かさ計算に、数分〜数十分を要する。試行錯誤による検証サイクルが停止。</p>
              </div>
              <div className="challenge-card">
                <div className="card-icon red">📦</div>
                <h3>ブラックボックスな計算処理、ツール改良不可</h3>
                <p>サードパーティ製のため、内部計算のカスタマイズが極めて困難。またツールの改良がボトルネックとなり、発展性に支障（統合モデル、SaaS化、AI活用など）が生じます。</p>
              </div>
            </div>
          </div>
        )}

        {/* スライド3: フルスクラッチ／インハウスコード */}
        {currentSlide === 2 && (
          <div className="slide fade-in">
            <span className="slide-tag">TECHNICAL ADVANTAGE</span>
            <h2 className="slide-title">技術的真価：完全インハウス・フルスクラッチ開発</h2>
            <p className="slide-subtitle">PRA Nexusは、一切の外部ブラックボックスに依存しない、自社設計のコードベースで構築されています。</p>

            <div className="fullscratch-comparison">
              <div className="comp-panel legacy">
                <h4>レガシーツール</h4>
                <ul>
                  <li>ソースが非公開で内部ロジックの説明が不可</li>
                  <li>契約や規約に縛られ、展開自由度が低い</li>
                  <li><strong>exe型の制約</strong>: 個々の顧客PCのスペックや実行環境依存、OS等の環境差異による不具合リスク</li>
                  <li>ファイルベース管理のため、バージョン管理や共同作業が困難</li>
                </ul>
              </div>
              <div className="comp-panel nexus glow-cyan">
                <div className="nexus-highlight-tag">100% IN-HOUSE CODE</div>
                <h4>PRA Nexus (フルスクラッチ)</h4>
                <ul>
                  <li><strong>自社独自アルゴリズム</strong>: BDD演算・不確かさ・マージロジックを独自実装</li>
                  <li><strong>完全な透明性と説明責任</strong>: 全計算ステップを追跡・監査可能</li>
                  <li><strong>ブラウザベースの利便性</strong>: 個々のPCへのインストール作業が不要。常に全員が最新バージョンを即時利用可能で、アップデートやバージョン不一致の負担をゼロ化</li>
                  <li><strong>無限の拡張性</strong>: 固有システムや最新理論への即応はもちろん、AIエージェント/LLM統合による「自動モデリング」等への拡張将来性</li>
                  <li><strong>依存ゼロ・セキュア</strong>: 外部の規約やセキュリティ脆弱性の影響を受けない</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* スライド4: 計算パフォーマンス（演算工夫） */}
        {currentSlide === 3 && (
          <div className="slide fade-in">
            <span className="slide-tag">PERFORMANCE OPTIMIZATION</span>
            <h2 className="slide-title">特徴1：最新コアによる極限の計算パフォーマンス</h2>
            <p className="slide-subtitle">自社インハウス開発だからこそ実現できた、数理アルゴリズムとシステム実装の両面における徹底的な高速化設計。</p>

            <div className="fullscratch-comparison">
              <div className="comp-panel nexus glow-green" style={{ borderColor: 'rgba(0, 214, 143, 0.3)' }}>
                <h4 style={{ color: 'var(--accent-green)', fontSize: '18px', fontWeight: 700 }}>💡 数理・アルゴリズム上の最適化</h4>
                <ul className="styled-list" style={{ marginTop: '16px' }}>
                  <li><strong>BDD変数の動的順序決定</strong>: 構築負荷とノード数爆発を抑え込むため、DFS/MCS重み付き探索による変数順序付けを自動最適化。</li>
                  <li><strong>階層的計算キャッシュ (Memoization)</strong>: 重複する部分ツリーや同一基本事象パターンの定量化値を記憶し、重複処理を100%排除。</li>
                  <li><strong>適応型近似アルゴリズム</strong>: 厳密解の構築が困難な超巨大ツリーに対してのみ、MCUB近似計算へ適応的に自動切り替え。フリーズや計算破綻を完全防止。</li>
                </ul>
              </div>

              <div className="comp-panel nexus glow-cyan" style={{ borderColor: 'rgba(6, 182, 212, 0.3)' }}>
                <h4 style={{ color: 'var(--accent-cyan)', fontSize: '18px', fontWeight: 700 }}>⚙️ システム・実装上の最適化</h4>
                <ul className="styled-list" style={{ marginTop: '16px' }}>
                  <li><strong>Web Workers 並行分散処理</strong>: 負荷が極めて高いモンテカルロ不確かさ解析などをサブスレッドに逃がし、計算中もUIスレッドの完全応答性を保証。</li>
                  <li><strong>超軽量 WebAssembly (WASM) コア</strong>: ボトルネックとなる行列・数理演算部分をWASMバイナリでネイティブ実行し、JS単体比で圧倒的スピードを記録。</li>
                  <li><strong>ゼロコピー・メモリアロケーション</strong>: 解析処理時のオブジェクト作成とGC負荷を極限まで低減し、数百万ノードのモデルでも軽快にブラウザ上で動作可能。</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* スライド5: 複数人共同編集（同期シミュレータ付き） */}
        {currentSlide === 4 && (
          <div className="slide fade-in">
            <span className="slide-tag">COLLABORATION (DEMO)</span>
            <h2 className="slide-title">特徴2：複数人リアルタイム同時編集機能</h2>
            <p className="slide-subtitle">CRDT（無衝突データ同期）をベースとしたリアルタイムモデリングにより、チーム全員が同一モデルで並行作業できます。</p>

            <div className="demo-layout">
              <div className="demo-info">
                <h3>リアルタイム協調編集の技術的意義</h3>
                <ul className="styled-list">
                  <li><strong>完全コンフリクトフリー</strong>: 地理的に離れた場所にいるメンバーが、同時に変更を加えてもデータが壊れない。</li>
                  <li><strong>ユーザープレゼンス</strong>: 誰がどの部分を編集しているかが一瞬でわかるため、手戻りや意思疎通のミスを排除。</li>
                  <li><strong>即時合意形成</strong>: 一人が変更した内容や定量化結果は、全員のディスプレイへ即時同期されます。</li>
                </ul>
              </div>

              <div className="interactive-box glow-purple">
                <div className="interactive-header">
                  <span>複数人同時編集・リアルタイム同期シミュレータ</span>
                  <span className="badge badge--success">WebSocket ONLINE</span>
                </div>
                <div className="interactive-body">
                  <div className="sim-collab-viewport">
                    {collabLogs.map((log) => (
                      <div key={log.id} className="collab-log-entry" style={{ borderLeftColor: log.color }}>
                        <span className="collab-user" style={{ color: log.color }}>{log.user}:</span>
                        <span className="collab-action">{log.action}</span>
                      </div>
                    ))}
                  </div>
                  <div className="collab-btn-group">
                    <button className="btn btn--secondary btn--sm" onClick={triggerCollabAction}>
                      {collabStep === 4 ? 'シミュレーションをリセット' : '次の協調アクションを実行'}
                    </button>
                    <span className="collab-step-indicator">
                      ステップ {collabStep} / 4
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* スライド6: 差分マージ（ビジュアルマージ付き） */}
        {currentSlide === 5 && (
          <div className="slide fade-in">
            <span className="slide-tag">MODEL INTEGRITY (DEMO)</span>
            <h2 className="slide-title">特徴3：高度なモデル差分比較（Diff）とマージ</h2>
            <p className="slide-subtitle">複数の解析プランをビジュアルに比較し、確実な差分マージアルゴリズムによってモデルを安全に統合します。</p>

            <div className="demo-layout">
              <div className="demo-info">
                <h3>差分管理 & マージ（`modelMerge`）の仕組み</h3>
                <ul className="styled-list">
                  <li><strong>視覚的Diff表示</strong>: 追加された要素（緑）、変更された要素（黄）、削除された要素（赤）をスマートに色分け。</li>
                  <li><strong>ワンクリック統合</strong>: 改良モデルの提案をメインモデルに自動競合解決しつつ、整合性を維持して一括マージ。</li>
                  <li><strong>セッションの保護</strong>: 全ての編集ステップは履歴に保存され、いつでもロールバックが可能。</li>
                </ul>
              </div>

              <div className="interactive-box glow-amber">
                <div className="interactive-header">モデルDiff & マージ・インタラクティブ体験</div>
                <div className="interactive-body">
                  <div className="diff-view-demo">
                    <div className="diff-item diff-item--unchanged">
                      <span className="diff-status">[ ]</span>
                      <span>Gate: G-01 (非常用交流電源喪失)</span>
                    </div>
                    {diffMerged ? (
                      <div className="diff-item diff-item--merged fade-in">
                        <span className="diff-status">[M]</span>
                        <span>BasicEvent: DG-A-START (非常用ディーゼル発電機A起動失敗)</span>
                        <span className="diff-badge merged">マージ完了</span>
                        <span className="diff-prob">P = 3.0e-3</span>
                      </div>
                    ) : (
                      <div className="diff-item diff-item--changed">
                        <span className="diff-status">[*]</span>
                        <span>BasicEvent: DG-A-START (起動失敗確率変更)</span>
                        <span className="diff-badge changed">差分あり</span>
                        <span className="diff-prob-compare">
                          <span className="old-val">1.2e-3</span> → <span className="new-val">3.0e-3</span>
                        </span>
                      </div>
                    )}
                    <div className={diffMerged ? "diff-item diff-item--unchanged" : "diff-item diff-item--added"}>
                      <span className="diff-status">{diffMerged ? "[ ]" : "[+]"}</span>
                      <span>Gate: G-02 (非常用電源DG-B系統失敗)</span>
                      {!diffMerged && <span className="diff-badge added">新規追加</span>}
                    </div>
                  </div>

                  <div className="collab-btn-group" style={{ marginTop: '16px' }}>
                    <button className="btn btn--primary btn--sm" onClick={() => setDiffMerged(!diffMerged)}>
                      {diffMerged ? 'マージを解除 (差分表示)' : 'モデルをマージ (modelMerge 実行)'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* スライド7: 地震不確かさハザード解析（インタラクティブグラフ） */}
        {currentSlide === 6 && (
          <div className="slide fade-in">
            <span className="slide-tag">EXTERIOR HAZARDS (SEISMIC)</span>
            <h2 className="slide-title">特徴4：高度な外的事象対応とプロフェッショナル解析</h2>
            <p className="slide-subtitle">地震PRAなどの極めて複雑な不確かさ評価に対しても、ハザードと脆性（フラジリティ）の統合演算をその場で実行できます。</p>

            <div className="demo-layout">
              <div className="demo-info">
                <h3>外的事象（地震・その他）解析の特徴</h3>
                <ul className="styled-list">
                  <li><strong>ハザード曲線の不確かさ統合</strong>: 5%, 50%, Mean, 95% などの複数フラクタイルハザード曲線を処理。</li>
                  <li><strong>積分演算処理</strong>: 自社フルスクラッチの積分解析により、加速度区間ごとの炉心損傷頻度（CDF）を即座に算出。</li>
                  <li><strong>重要度の動的再計算</strong>: コンポーネント損傷度から重要事象を自動選定。</li>
                  <li><strong>他外的事象への拡張（予定）</strong>: 独自の積分演算アーキテクチャにより、津波、洪水、竜巻など地震以外の様々な外的事象ハザードへの対応拡張を予定。</li>
                </ul>
              </div>

              <div className="interactive-box glow-cyan" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="interactive-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>インタラクティブ地震ハザード曲線 & リスク評価</span>
                  <span className="text-cyan font-bold" style={{ fontFamily: 'var(--font-mono)' }}>PGA: {pga} G</span>
                </div>
                <div className="interactive-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '220px' }}>
                  <div style={{ flex: 1, width: '100%', height: '170px', position: 'relative' }}>
                    {isMounted ? (
                      <ResponsiveContainer width="100%" height={170}>
                        <LineChart data={seismicData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1E3454" />
                          <XAxis dataKey="pga" stroke="#94A3B8" tickFormatter={(v) => `${v}G`} />
                          <YAxis stroke="#94A3B8" scale="log" domain={[1e-8, 1e-2]} tickFormatter={(v) => v.toExponential(0)} />
                          <Tooltip contentStyle={{ backgroundColor: '#0F1D32', borderColor: '#1E3454', color: '#F1F5F9' }} />
                          <Line type="monotone" dataKey="fractile95" stroke="var(--accent-red)" name="95%" dot={false} strokeWidth={1} />
                          <Line type="monotone" dataKey="mean" stroke="var(--accent-green)" name="Mean" dot={false} strokeWidth={2} />
                          <Line type="monotone" dataKey="fractile50" stroke="var(--accent-cyan)" name="50%" dot={false} strokeWidth={1} />
                          <Line type="monotone" dataKey="fractile5" stroke="var(--accent-amber)" name="5%" dot={false} strokeWidth={1} />
                          <ReferenceLine x={pga} stroke="white" strokeDasharray="3 3" label={{ value: `${pga}G`, position: 'top', fill: '#F1F5F9', fontSize: 10 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="chart-loading-placeholder">ハザードグラフ描画中...</div>
                    )}
                  </div>

                  <div className="pga-slider-panel" style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="range"
                        min="0.05"
                        max="1.0"
                        step="0.05"
                        value={pga}
                        onChange={(e) => setPga(Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                    </div>
                    <div className="seismic-output-metrics" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px' }}>
                      <span>&gt; 炉心損傷頻度 (CDF 平均値): <strong className="text-green">{getSeismicRiskMetric()} / 年</strong></span>
                      <span>&gt; 積分手法: <strong>Reed-McCann 離散積分 (フルスクラッチ)</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* スライド8: 柔軟な運用（SaaS / オンプレミス併用） */}
        {currentSlide === 7 && (
          <div className="slide fade-in">
            <span className="slide-tag">DEPLOYMENT FLEXIBILITY</span>
            <h2 className="slide-title">柔軟な運用環境：SaaS と オンプレミスの併用</h2>
            <p className="slide-subtitle">セキュリティ要件や運用の手軽さに応じて、クラウド環境と社内クローズド環境をシームレスに選択・併用可能です。</p>

            <div className="deployment-grid">
              <div className="deploy-card">
                <div className="deploy-badge cloud">SaaS / クラウド</div>
                <h3>スピーディな即時導入</h3>
                <ul>
                  <li>環境構築ゼロで、即日モデリングを開始</li>
                  <li>ブラウザを立ち上げるだけで世界中からアクセス</li>
                  <li>メンテナンスフリー、自動パッチアップデート</li>
                  <li>Stripe決済・チームアカウント管理標準統合</li>
                </ul>
              </div>

              <div className="deploy-card border-cyan">
                <div className="deploy-badge hybrid">SaaS/オンプレ併用 (ハイブリッド)</div>
                <h3>安全性と利便性の最適解</h3>
                <ul>
                  <li><strong>機密モデルはローカル</strong>、共有モデルはクラウドで</li>
                  <li>同じ100%インハウス・ソースコードを利用しているため、データ互換は完全シームレス</li>
                  <li>プロジェクト毎のセキュアなエクスポート機能</li>
                </ul>
              </div>

              <div className="deploy-card">
                <div className="deploy-badge onprem">完全オンプレミス</div>
                <h3>極限の機密・セキュリティ確保</h3>
                <ul>
                  <li>プラント社内の完全オフライン環境へデプロイ</li>
                  <li>外部ネットワーク通信を一切遮断した構成に対応</li>
                  <li>インハウス開発コードであるため、セキュリティ検査、監査のクリアが非常に迅速</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* スライド9: 将来展望・マスターロードマップ */}
        {currentSlide === 8 && (
          <div className="slide fade-in">
            <span className="slide-tag">PRA NEXUS MASTER ROADMAP</span>
            <h2 className="slide-title">将来の展望とロードマップ</h2>
            <p className="slide-subtitle" style={{ marginBottom: '16px' }}>静的な解析の枠組みを完全に超越する、一貫したアーキテクチャロードマップ（Phase 1 〜 Phase 7）。</p>

            <div className="fullscratch-comparison" style={{ gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-green)', borderBottom: '1px solid rgba(0,214,143,0.2)', paddingBottom: '4px', marginBottom: '4px' }}>🟢 実装完了フェーズ</h3>
                
                <div className="timeline-item" style={{ padding: '8px 14px' }}>
                  <div className="time-badge" style={{ color: 'var(--accent-green)', fontSize: '9px' }}>Phase 1</div>
                  <h4 style={{ fontSize: '12px', margin: '2px 0', color: '#F1F5F9' }}>基礎PF ＆ FT/ET 双方向エディタ</h4>
                  <p style={{ fontSize: '10px', color: '#94A3B8', margin: 0, lineShift: 0 }}>カスタムFTNode、緩和設備分岐ETBranch、プレミアムUI設計システム構築。</p>
                </div>

                <div className="timeline-item" style={{ padding: '8px 14px' }}>
                  <div className="time-badge" style={{ color: 'var(--accent-green)', fontSize: '9px' }}>Phase 2</div>
                  <h4 style={{ fontSize: '12px', margin: '2px 0', color: '#F1F5F9' }}>高性能解析エンジン（BDD）</h4>
                  <p style={{ fontSize: '10px', color: '#94A3B8', margin: 0 }}>自社製BDD厳密確率計算、MCSパス自動抽出、Web Workerマルチスレッド計算処理。</p>
                </div>

                <div className="timeline-item" style={{ padding: '8px 14px' }}>
                  <div className="time-badge" style={{ color: 'var(--accent-green)', fontSize: '9px' }}>Phase 3</div>
                  <h4 style={{ fontSize: '12px', margin: '2px 0', color: '#F1F5F9' }}>差分衝突管理（modelMerge）</h4>
                  <p style={{ fontSize: '10px', color: '#94A3B8', margin: 0 }}>ET/FT移行遷移復元、DiffViewerによる視覚的差分表示、パッチ自動安全結合機能。</p>
                </div>

                <div className="timeline-item" style={{ padding: '8px 14px' }}>
                  <div className="time-badge" style={{ color: 'var(--accent-green)', fontSize: '9px' }}>Phase 4</div>
                  <h4 style={{ fontSize: '12px', margin: '2px 0', color: '#F1F5F9' }}>外的事象（地震PRA）対応 ＆ CCF拡張</h4>
                  <p style={{ fontSize: '10px', color: '#94A3B8', margin: 0 }}>PGA離散積分炉心損傷頻度（CDF）評価、LHS不確かさ解析、多重CCF自動変数展開。</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-cyan)', borderBottom: '1px solid rgba(6,182,212,0.2)', paddingBottom: '4px', marginBottom: '4px' }}>🔵 現在 ＆ 今後のマイルストーン</h3>

                <div className="timeline-item active" style={{ padding: '8px 14px', borderColor: 'rgba(6,182,212,0.4)' }}>
                  <div className="time-badge" style={{ color: 'var(--accent-cyan)', fontSize: '9px' }}>Phase 5（最新完了・洗練）</div>
                  <h4 style={{ fontSize: '12px', margin: '2px 0', color: '#F1F5F9' }}>極限のユーザビリティ ＆ エディタの洗練</h4>
                  <p style={{ fontSize: '10px', color: '#94A3B8', margin: 0 }}>スマート接続安全切替、直上ORゲート瞬間挟み込み、事象ID完全デコード、高解像SVGエクスポート。</p>
                </div>

                <div className="timeline-item" style={{ padding: '8px 14px', borderColor: 'rgba(168, 85, 247, 0.25)' }}>
                  <div className="time-badge" style={{ color: 'var(--accent-purple)', fontSize: '9px' }}>Phase 6（次期予定）</div>
                  <h4 style={{ fontSize: '12px', margin: '2px 0', color: '#F1F5F9' }}>クラウド型リアルタイム複数人同時編集</h4>
                  <p style={{ fontSize: '10px', color: '#94A3B8', margin: 0 }}>CRDT・WebSocketミリ秒競合フリー編集。共通プラント信頼性DB同期、ライブ履歴ログ。</p>
                </div>

                <div className="timeline-item" style={{ padding: '8px 14px', borderColor: 'rgba(236, 72, 153, 0.25)' }}>
                  <div className="time-badge" style={{ color: '#EC4899', fontSize: '9px' }}>Phase 7（最終到達）</div>
                  <h4 style={{ fontSize: '12px', margin: '2px 0', color: '#F1F5F9' }}>Living PRA ＆ AI自動レポート（動的ツイン）</h4>
                  <p style={{ fontSize: '10px', color: '#94A3B8', margin: 0 }}>実機 SCADA 連動動的リスクメーター。LLMによる事故ET整合性検証（AI監査）、DETシミュレータ、AI報告書生成。</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* スライド10: 結び（デジタル変革） */}
        {currentSlide === 9 && (
          <div className="slide slide--lead fade-in">
            <span className="slide-tag" style={{ alignSelf: 'center' }}>CONCLUSION</span>
            <h1 className="main-title" style={{ fontSize: '2.2em', marginTop: '20px' }}>
              PRA Nexus が安全性評価のプロセスを革新する
            </h1>
            <p className="main-desc" style={{ maxWidth: '800px', margin: '20px auto', fontSize: '15px' }}>
              100% インハウス・フルスクラッチ開発の高度な技術が支える「極限の演算速度」、「完全なデータ透明性」、精度と保守の「ローカル・オンプレ併用」。
            </p>

            <div className="conclusion-cards">
              <div className="conclusion-card">
                <h4>🚀 圧倒的な業務効率化</h4>
                <p>待ち時間ゼロ of WASM計算と共同編集が工数を劇的に削減</p>
              </div>
              <div className="conclusion-card">
                <h4>🛡️ 完全なるセキュリティと独立性</h4>
                <p>サードパーティ不使用のコードによる高い監査信頼性とオンプレ対応</p>
              </div>
              <div className="conclusion-card">
                <h4>📊 試行錯誤による解析品質の最大化</h4>
                <p>リアルタイムでパラメータを変更・比較し、より深いリスク洞察を獲得</p>
              </div>
            </div>

            <h3 style={{ color: 'var(--accent-green)', fontWeight: 600, marginTop: '24px' }}>
              安全性評価のその先へ、PRA Nexus を是非ご体験ください。
            </h3>
          </div>
        )}
      </main>

      {/* ナビゲーションコントロール */}
      <footer className="pitch-controls">
        <button
          className="btn btn--secondary btn--sm"
          onClick={() => setCurrentSlide((prev) => Math.max(prev - 1, 0))}
          disabled={currentSlide === 0}
        >
          ← 前へ
        </button>

        <div className="pitch-progress-dots">
          {Array.from({ length: totalSlides }).map((_, idx) => (
            <button
              key={idx}
              className={`dot ${currentSlide === idx ? 'dot--active' : ''}`}
              onClick={() => setCurrentSlide(idx)}
              aria-label={`スライド ${idx + 1} に移動`}
            />
          ))}
        </div>

        <button
          className="btn btn--primary btn--sm"
          onClick={() => setCurrentSlide((prev) => Math.min(prev + 1, totalSlides - 1))}
          disabled={currentSlide === totalSlides - 1}
        >
          次へ →
        </button>
      </footer>

      {/* スライド専用CSSスタイル */}
      <style jsx global>{`
        /* ピッチスライド全体のスタイル設定 */
        .pitch-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #0A1628;
          color: #F1F5F9;
          font-family: 'Inter', 'Noto Sans JP', sans-serif;
          display: flex;
          flex-direction: column;
          z-index: 9999;
          overflow: hidden;
        }

        .pitch-bg-glow {
          position: absolute;
          top: -20%;
          left: -10%;
          width: 60%;
          height: 60%;
          background: radial-gradient(circle, rgba(0, 214, 143, 0.08) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .pitch-header {
          height: 60px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 40px;
          z-index: 10;
          background: rgba(10, 22, 40, 0.8);
          backdrop-filter: blur(8px);
        }

        .pitch-header__logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .pitch-header__logo-icon {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, var(--accent-green), var(--accent-cyan));
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: #0A1628;
          font-size: 16px;
        }

        .pitch-header__logo-text {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.01em;
          background: linear-gradient(90deg, #00D68F, #06B6D4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .pitch-header__badge {
          background: rgba(6, 182, 212, 0.15);
          color: var(--accent-cyan);
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.05em;
        }

        .pitch-header__status {
          font-size: 12px;
          color: #94A3B8;
          font-family: var(--font-mono);
        }

        /* スライドビューポート */
        .pitch-viewport {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          z-index: 5;
        }

        .slide {
          width: 100%;
          max-width: 1100px;
          display: flex;
          flex-direction: column;
          height: 100%;
          justify-content: center;
        }

        .slide--lead {
          align-items: center;
          text-align: center;
        }

        .slide-tag {
          font-size: 10px;
          font-weight: 700;
          color: var(--accent-cyan);
          text-transform: uppercase;
          letter-spacing: 0.15em;
          margin-bottom: 8px;
        }

        .slide-title {
          font-size: 32px;
          font-weight: 700;
          color: #F1F5F9;
          margin-bottom: 8px;
          background: linear-gradient(90deg, #F1F5F9, #94A3B8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .slide-subtitle {
          font-size: 15px;
          color: #94A3B8;
          margin-bottom: 30px;
          max-width: 800px;
        }

        /* 表紙スライド */
        .scratch-badge {
          background: linear-gradient(135deg, rgba(0, 214, 143, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%);
          border: 1px solid rgba(0, 214, 143, 0.3);
          color: var(--accent-green);
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.05em;
          margin-bottom: 24px;
          box-shadow: 0 0 15px rgba(0, 214, 143, 0.1);
        }

        .main-title {
          font-size: 64px;
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 16px;
          background: linear-gradient(135deg, #00D68F 0%, #06B6D4 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .main-subtitle {
          font-size: 24px;
          font-weight: 500;
          color: #F1F5F9;
          margin-bottom: 16px;
        }

        .main-desc {
          font-size: 16px;
          color: #94A3B8;
          max-width: 650px;
          margin-bottom: 40px;
        }

        .cover-features {
          display: flex;
          gap: 16px;
          margin-bottom: 40px;
        }

        .feat-chip {
          background: rgba(30, 52, 84, 0.4);
          border: 1px solid rgba(148, 163, 184, 0.15);
          color: #F1F5F9;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
        }

        .navigation-hint {
          font-size: 11px;
          color: #64748B;
        }

        .navigation-hint span {
          background: #1E3454;
          color: #F1F5F9;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: var(--font-mono);
          margin: 0 2px;
        }

        /* スライド2: グリッドカード */
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .challenge-card {
          background: rgba(15, 29, 50, 0.5);
          border: 1px solid rgba(255, 71, 87, 0.15);
          border-radius: 12px;
          padding: 24px;
          transition: all 0.3s ease;
        }

        .challenge-card:hover {
          border-color: rgba(255, 71, 87, 0.4);
          box-shadow: 0 0 20px rgba(255, 71, 87, 0.1);
          transform: translateY(-2px);
        }

        .card-icon {
          font-size: 32px;
          margin-bottom: 16px;
        }

        .challenge-card h3 {
          font-size: 18px;
          font-weight: 600;
          color: #F1F5F9;
          margin-bottom: 12px;
        }

        .challenge-card p {
          font-size: 13px;
          color: #94A3B8;
          line-height: 1.6;
        }

        /* スライド3: フルスクラッチ比較 */
        .fullscratch-comparison {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }

        .comp-panel {
          background: rgba(15, 29, 50, 0.4);
          border: 1px solid rgba(148, 163, 184, 0.15);
          border-radius: 12px;
          padding: 30px;
          position: relative;
        }

        .comp-panel h4 {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 20px;
          color: #F1F5F9;
        }

        .comp-panel ul {
          list-style-type: none;
        }

        .comp-panel li {
          font-size: 14px;
          line-height: 1.8;
          margin-bottom: 12px;
          padding-left: 20px;
          position: relative;
        }

        .comp-panel.legacy li::before {
          content: '×';
          position: absolute;
          left: 0;
          color: var(--accent-red);
          font-weight: bold;
        }

        .comp-panel.nexus li::before {
          content: '✓';
          position: absolute;
          left: 0;
          color: var(--accent-green);
          font-weight: bold;
        }

        .comp-panel.nexus {
          background: rgba(15, 29, 50, 0.7);
        }

        .glow-cyan {
          border-color: rgba(6, 182, 212, 0.3);
          box-shadow: 0 0 25px rgba(6, 182, 212, 0.08);
        }

        .nexus-highlight-tag {
          position: absolute;
          top: -12px;
          right: 20px;
          background: linear-gradient(135deg, var(--accent-cyan), var(--accent-green));
          color: #0A1628;
          font-size: 10px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
          letter-spacing: 0.05em;
        }

        /* スライド4-7: デモレイアウト共通 */
        .demo-layout {
          display: grid;
          grid-template-columns: 1fr 1.1fr;
          gap: 32px;
          align-items: center;
        }

        .demo-info h3 {
          font-size: 22px;
          font-weight: 600;
          color: #F1F5F9;
          margin-bottom: 16px;
        }

        .styled-list {
          list-style: none;
        }

        .styled-list li {
          font-size: 14px;
          margin-bottom: 16px;
          line-height: 1.6;
          padding-left: 20px;
          position: relative;
          color: #94A3B8;
        }

        .styled-list li strong {
          color: #F1F5F9;
        }

        .styled-list li::before {
          content: '⚡';
          position: absolute;
          left: 0;
          color: var(--accent-green);
        }

        .interactive-box {
          background: rgba(15, 29, 50, 0.8);
          border: 1px solid rgba(148, 163, 184, 0.15);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }

        .interactive-header {
          background: rgba(30, 52, 84, 0.5);
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          padding: 12px 20px;
          font-size: 13px;
          font-weight: 600;
          color: #F1F5F9;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .interactive-body {
          padding: 20px;
        }

        .glow-green { border-color: rgba(0, 214, 143, 0.3); }
        .glow-purple { border-color: rgba(168, 85, 247, 0.3); }
        .glow-amber { border-color: rgba(255, 176, 32, 0.3); }
        .glow-cyan { border-color: rgba(6, 182, 212, 0.3); }

        /* スライダー */
        .slider-input {
          width: 100%;
          background: #162540;
          height: 6px;
          border-radius: var(--radius-full);
          outline: none;
          margin-top: 8px;
        }

        .slider-value {
          font-size: 12px;
          color: var(--accent-green);
          font-weight: 600;
          font-family: var(--font-mono);
          margin-top: 4px;
          text-align: right;
        }

        .progress-bar-container {
          background: #162540;
          height: 4px;
          border-radius: 2px;
          margin-top: 16px;
          overflow: hidden;
        }

        .progress-bar {
          background: linear-gradient(90deg, var(--accent-green), var(--accent-cyan));
          height: 100%;
          transition: width 0.1s ease;
        }

        .console-output {
          background: #050E1A;
          border-radius: 6px;
          padding: 12px;
          margin-top: 12px;
          font-family: var(--font-mono);
          font-size: 11px;
          min-height: 100px;
          border: 1px solid rgba(148, 163, 184, 0.05);
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .wasm-results p {
          margin-bottom: 4px;
        }

        /* 複数人同期デモ */
        .sim-collab-viewport {
          background: #050E1A;
          border-radius: 6px;
          padding: 12px;
          font-family: var(--font-mono);
          font-size: 11px;
          min-height: 140px;
          border: 1px solid rgba(148, 163, 184, 0.05);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .collab-log-entry {
          border-left: 2px solid #ccc;
          padding-left: 8px;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-5px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .collab-user {
          font-weight: 600;
          margin-right: 6px;
        }

        .collab-action {
          color: #F1F5F9;
        }

        .collab-btn-group {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
        }

        .collab-step-indicator {
          font-size: 11px;
          color: #64748B;
        }

        /* 差分ビューデモ */
        .diff-view-demo {
          background: #050E1A;
          border-radius: 6px;
          padding: 16px;
          font-family: var(--font-mono);
          font-size: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          border: 1px solid rgba(148, 163, 184, 0.05);
        }

        .diff-item {
          padding: 8px 12px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .diff-item--unchanged {
          color: #94A3B8;
        }

        .diff-item--changed {
          background: rgba(255, 176, 32, 0.08);
          border: 1px solid rgba(255, 176, 32, 0.2);
          color: var(--accent-amber);
        }

        .diff-item--added {
          background: rgba(0, 214, 143, 0.08);
          border: 1px solid rgba(0, 214, 143, 0.2);
          color: var(--accent-green);
        }

        .diff-item--merged {
          background: rgba(6, 182, 212, 0.08);
          border: 1px solid rgba(6, 182, 212, 0.2);
          color: var(--accent-cyan);
        }

        .diff-badge {
          font-size: 9px;
          font-weight: 600;
          padding: 1px 4px;
          border-radius: 2px;
          text-transform: uppercase;
        }

        .diff-badge.changed { background: var(--accent-amber); color: #0A1628; }
        .diff-badge.added { background: var(--accent-green); color: #0A1628; }
        .diff-badge.merged { background: var(--accent-cyan); color: #0A1628; }

        .diff-prob-compare {
          margin-left: auto;
          font-size: 11px;
        }

        .old-val { text-decoration: line-through; color: #64748B; }
        .new-val { font-weight: 600; color: var(--accent-green); }
        .diff-prob { margin-left: auto; font-weight: 600; }

        /* スライド8: デプロイメントグリッド */
        .deployment-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr 1fr;
          gap: 20px;
        }

        .deploy-card {
          background: rgba(15, 29, 50, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.15);
          border-radius: 12px;
          padding: 24px;
          display: flex;
          flex-direction: column;
        }

        .deploy-card.border-cyan {
          border-color: rgba(6, 182, 212, 0.4);
          background: rgba(15, 29, 50, 0.8);
          box-shadow: 0 0 20px rgba(6, 182, 212, 0.08);
        }

        .deploy-badge {
          font-size: 9px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 4px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          align-self: flex-start;
          margin-bottom: 16px;
        }

        .deploy-badge.cloud { background: rgba(59, 130, 246, 0.15); color: var(--accent-blue); }
        .deploy-badge.hybrid { background: rgba(6, 182, 212, 0.15); color: var(--accent-cyan); }
        .deploy-badge.onprem { background: rgba(168, 85, 247, 0.15); color: var(--accent-purple); }

        .deploy-card h3 {
          font-size: 18px;
          margin-bottom: 16px;
          color: #F1F5F9;
        }

        .deploy-card ul {
          list-style: none;
        }

        .deploy-card li {
          font-size: 12px;
          color: #94A3B8;
          margin-bottom: 10px;
          line-height: 1.5;
          padding-left: 16px;
          position: relative;
        }

        .deploy-card li::before {
          content: '•';
          position: absolute;
          left: 0;
          color: var(--accent-green);
        }

        .deploy-card.border-cyan li::before {
          color: var(--accent-cyan);
        }

        /* スライド9: ロードマップタイムライン */
        .roadmap-timeline {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .timeline-item {
          background: rgba(15, 29, 50, 0.4);
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 8px;
          padding: 16px 24px;
          position: relative;
        }

        .timeline-item.active {
          border-color: rgba(0, 214, 143, 0.3);
          background: rgba(15, 29, 50, 0.7);
          box-shadow: 0 0 15px rgba(0, 214, 143, 0.05);
        }

        .time-badge {
          font-size: 10px;
          font-weight: 700;
          color: var(--accent-cyan);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }

        .timeline-item.active .time-badge {
          color: var(--accent-green);
        }

        .timeline-item h4 {
          font-size: 16px;
          margin-bottom: 6px;
          color: #F1F5F9;
        }

        .timeline-item p {
          font-size: 13px;
          color: #94A3B8;
        }

        /* スライド10: 結び */
        .conclusion-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          width: 100%;
          margin-top: 32px;
        }

        .conclusion-card {
          background: rgba(15, 29, 50, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 8px;
          padding: 20px;
          text-align: left;
        }

        .conclusion-card h4 {
          font-size: 14px;
          font-weight: 600;
          color: #F1F5F9;
          margin-bottom: 10px;
        }

        .conclusion-card p {
          font-size: 12px;
          color: #94A3B8;
          line-height: 1.5;
        }

        /* スライドコントロール & ドット */
        .pitch-controls {
          height: 60px;
          border-top: 1px solid rgba(148, 163, 184, 0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 40px;
          background: rgba(10, 22, 40, 0.8);
          backdrop-filter: blur(8px);
          z-index: 10;
        }

        .pitch-progress-dots {
          display: flex;
          gap: 10px;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(148, 163, 184, 0.3);
          border: none;
          cursor: pointer;
          padding: 0;
          transition: all var(--transition-fast);
        }

        .dot:hover {
          background: rgba(148, 163, 184, 0.6);
        }

        .dot--active {
          background: var(--accent-green);
          transform: scale(1.3);
          box-shadow: 0 0 10px var(--accent-green);
        }

        .chart-loading-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          color: var(--text-secondary);
          font-size: 12px;
          background: rgba(5, 14, 26, 0.3);
          border-radius: 6px;
          border: 1px dashed rgba(148, 163, 184, 0.1);
        }

        /* アニメーション用クラス */
        .fade-in {
          animation: fadeInSlide 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
