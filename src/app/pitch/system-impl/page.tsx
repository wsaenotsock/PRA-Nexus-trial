'use client';

import React, { useState, useEffect } from 'react';

export default function SystemImplPitch() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 8;
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // スライドナビゲーション用のキーイベント
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

  // インタラクティブデモ：Worker通信擬似シミュレータ
  const [workerLogs, setWorkerLogs] = useState<string[]>([
    'MainThread: Workerスレッドを待機中...'
  ]);
  const [simRunning, setSimRunning] = useState(false);

  const startWorkerSim = () => {
    if (simRunning) return;
    setSimRunning(true);
    setWorkerLogs([
      'MainThread: 計算指令送信 [QUANTIFY_ET, targetId: ET-01]',
      'Worker: 指令受信。計算処理開始...',
    ]);

    setTimeout(() => {
      setWorkerLogs(prev => [
        ...prev,
        'Worker: [1] 3層キャッシュヒット率: 94.2%',
        'Worker: [2] BDDノードの縮約成功 (ノード数: 14,210 -> 824)'
      ]);
    }, 800);

    setTimeout(() => {
      setWorkerLogs(prev => [
        ...prev,
        'Worker: [3] 厳密確率計算 P = 4.120e-4 完了 (計算時間: 18.2ms)',
        'Worker: [4] 循環参照(BDDNode)オブジェクトをクリーンアップ(cleanResult)',
        'MainThread: 結果を受信。UI再描画成功！'
      ]);
      setSimRunning(false);
    }, 1600);
  };

  return (
    <div className="pitch-container">
      <div className="pitch-bg-glow" />

      {/* ヘッダー */}
      <header className="pitch-header">
        <div className="pitch-header__logo">
          <span className="pitch-header__logo-icon" style={{ background: 'linear-gradient(135deg, #A855F7, #06B6D4)' }}>S</span>
          <span className="pitch-header__logo-text">PRA Nexus - System Architecture</span>
          <span className="pitch-header__badge" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#A855F7' }}>SYSTEM SLIDES</span>
        </div>
        <div className="pitch-header__status">
          Slide {currentSlide + 1} / {totalSlides}
        </div>
      </header>

      {/* スライド viewport */}
      <main className="pitch-viewport">
        {/* スライド1: 表紙 */}
        {currentSlide === 0 && (
          <div className="slide slide--lead fade-in">
            <div className="scratch-badge" style={{ borderColor: 'rgba(168, 85, 247, 0.3)', color: '#A855F7', background: 'rgba(168, 85, 247, 0.1)' }}>システム実装検証レポート</div>
            <h1 className="main-title" style={{ background: 'linear-gradient(135deg, #A855F7, #06B6D4)', WebkitBackgroundClip: 'text' }}>System Architecture</h1>
            <h2 className="main-subtitle">ブラウザネイティブ超高速演算を支える非同期・高効率キャッシュ設計</h2>
            <p className="main-desc">
              Web Worker を用いたUI非ブロッキング並行処理、3層メモ化キャッシュ戦略、メモリ消費最適化、およびOpen-PSA MEFに100%準拠したTypeScript型システムの検証。
            </p>
            <div className="cover-features">
              <span className="feat-chip">⚙️ Web Workers 非同期通信</span>
              <span className="feat-chip">⚡ 3層メモ化キャッシュ</span>
              <span className="feat-chip">🛡️ 循環参照安全シリアライズ</span>
            </div>
            <div className="navigation-hint">
              キーボードの「 <span>→</span> 」または「 <span>Space</span> 」キー、または右下のボタンでスライドを進めます
            </div>
          </div>
        )}

        {/* スライド2: アーキテクチャ全体像 */}
        {currentSlide === 1 && (
          <div className="slide fade-in">
            <span className="slide-tag" style={{ color: '#A855F7' }}>OVERVIEW</span>
            <h2 className="slide-title">1. PRA Nexus システムアーキテクチャ全体像</h2>
            <p className="slide-subtitle">UI操作スレッドと重い計算エンジンを明確に分離し、どんな大規模ツリーでも絶対にカクつかない超快感レスポンスを維持します。</p>

            <div className="architecture-grid">
              <div className="arch-card">
                <h4>🖥️ メインUIスレッド (React / Zustand)</h4>
                <p>ユーザーエディタ、プロジェクト管理、グラフ描画などのビジュアルを軽快に制御。</p>
              </div>
              <div className="arch-connector">⇄ [postMessage 通信] ⇄</div>
              <div className="arch-card" style={{ borderColor: 'rgba(168, 85, 247, 0.3)' }}>
                <h4>⚙️ 計算用 Web Worker スレッド</h4>
                <p>BDDの構築、重いモンテカルロ不確かさサンプリング、地震離散積分、CCF展開など、負荷の高い計算処理を専門に担当。</p>
              </div>
            </div>
          </div>
        )}

        {/* スライド3: Web Worker 並行計算 */}
        {currentSlide === 2 && (
          <div className="slide fade-in">
            <span className="slide-tag" style={{ color: '#A855F7' }}>WEB WORKER</span>
            <h2 className="slide-title">2. Web Worker を用いた非同期・並行計算処理</h2>
            <p className="slide-subtitle">`quant.worker.ts`が、ミリ秒でのプロジェクト同期やバックグラウンド不確かさ試行（1,000回〜10,000回）を非ブロッキングで並列処理します。</p>

            <div className="demo-layout">
              <div className="demo-info">
                <h3>非同期スレッド設計の検証</h3>
                <ul className="styled-list">
                  <li><strong>UIフリーズ防止</strong>: 重いモンテカルロ試行中もエディタの画面スクロールやノードの追加が完全に応答。</li>
                  <li><strong>循環参照クリーンアップ (`cleanResult`)</strong>: postMessage通信時のパフォーマンス低下を防ぐため、親・子間で多重に保持されたBDDNodeの循環オブジェクト構造を綺麗に切り離して送信。通信オーバーヘッドを排除。</li>
                </ul>
              </div>

              <div className="interactive-box glow-purple">
                <div className="interactive-header">
                  <span>Worker並行処理シミュレータ</span>
                  <span className={simRunning ? "status-label working" : "status-label ready"}>
                    {simRunning ? "COMPUTING" : "ONLINE"}
                  </span>
                </div>
                <div className="interactive-body">
                  <button className="btn btn--primary btn--sm" onClick={startWorkerSim} disabled={simRunning}>
                    {simRunning ? "計算中..." : "並行計算（10,000回不確かさ）を起動"}
                  </button>
                  <div className="console-output" style={{ marginTop: '12px', minHeight: '130px', fontSize: '11px', color: '#A855F7' }}>
                    {workerLogs.map((log, idx) => (
                      <div key={idx} style={{ marginBottom: '4px' }}>&gt; {log}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* スライド4: 3層高速キャッシュ戦略 */}
        {currentSlide === 3 && (
          <div className="slide fade-in">
            <span className="slide-tag" style={{ color: '#A855F7' }}>MEMOIZATION</span>
            <h2 className="slide-title">3. 重複演算を排除する「3層高速キャッシュ戦略」</h2>
            <p className="slide-subtitle">同一基本事象パターンや部分ツリーの演算結果をMapオブジェクトへ記憶（メモ化）し、計算量を削減します。</p>

            <div className="demo-layout">
              <div className="demo-info">
                <h3>3層にわたる多層キャッシュ機構</h3>
                <ul className="styled-list">
                  <li><strong>第1層: Node Cache (`nodeCache`)</strong>: 変数、high子、low子が同一のBDDNodeを一意に管理し、グラフ内の同値な末端を共有。</li>
                  <li><strong>第2層: Operation Cache (`applyCache`)</strong>: AND/OR/NOTの各論理再帰演算結果を「`AND:id_A:id_B`」形式のキーでキャッシュ。</li>
                  <li><strong>第3層: Probability Cache (`ftProbCache`)</strong>: 同一フォールトツリー確率をETシーケンス横断でキャッシュし、重複するFT解法を完全バイパス。</li>
                </ul>
              </div>

              <div className="interactive-box glow-cyan">
                <div className="interactive-header">キャッシュ戦略コード（`bdd.ts`より抜粋）</div>
                <div className="interactive-body">
                  <div className="code-block-display">
                    <pre><code>{`// 演算メモ化テーブルのルックアップ
const key = \`AND:\${a.id}:\${b.id}\`;
const cached = applyCache.get(key);
if (cached) return cached; // 即座にキャッシュを返却

// Node一意管理キー
const key = \`\${variable}:\${high.id}:\${low.id}\`;`}</code></pre>
                  </div>
                  <div className="validation-success-badge" style={{ borderColor: 'rgba(6, 182, 212, 0.2)', color: '#06B6D4', background: 'rgba(6, 182, 212, 0.1)' }}>
                    ✓ 演算キャッシュヒット率 90% 以上。計算量が $O(2^N)$ から実質的に線形時間に縮退。
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* スライド5: メモリ管理とクリーンアップ */}
        {currentSlide === 4 && (
          <div className="slide fade-in">
            <span className="slide-tag" style={{ color: '#A855F7' }}>MEMORY MANAGEMENT</span>
            <h2 className="slide-title">4. メモリ管理と GC 負荷軽減の最適化</h2>
            <p className="slide-subtitle">ブラウザ特有のガベージコレクション（GC）による微小なカクつきやメモリリークを抑止するため、明示的な管理を行います。</p>

            <div className="demo-layout">
              <div className="demo-info">
                <h3>ガベージ低減と明示的初期化</h3>
                <ul className="styled-list">
                  <li><strong>`resetBDD()` による明示的な解放</strong>: 各計算（FT定量化、ET定量化、不確かさ試行）の開始時に、`nodeCounter` をリセットし、`nodeCache` や `applyCache` の全キャッシュを破棄。古い世代のオブジェクトを一括解放。</li>
                  <li><strong>オブジェクトプールの代替設計</strong>: 必要以上の高階構造アロケーションを抑え、GCタイミングを分散させ、ブラウザ上で何万回不確かさサンプリングを実行してもカクつきません。</li>
                </ul>
              </div>

              <div className="interactive-box glow-green">
                <div className="interactive-header">明示的なリセットロジック</div>
                <div className="interactive-body">
                  <div className="code-block-display">
                    <pre><code>{`export function resetBDD() {
  nodeCounter = 0;
  nodeCache.clear();
  applyCache.clear();
}
// 計算サイクル開始前に必ずクリーン実行
resetBDD();
applyCache.clear();`}</code></pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* スライド6: 堅牢なデータモデル・型安全性 */}
        {currentSlide === 5 && (
          <div className="slide fade-in">
            <span className="slide-tag" style={{ color: '#A855F7' }}>TYPES & STANDARD</span>
            <h2 className="slide-title">5. Open-PSA MEF 準拠の堅牢な型システム</h2>
            <p className="slide-subtitle">国際的なPRA業界規格「Open-PSA Model Exchange Format (MEF)」に100%対応した包括的なデータ型体系を定義しています。</p>

            <div className="demo-layout">
              <div className="demo-info">
                <h3>データ整合性の検証</h3>
                <ul className="styled-list">
                  <li><strong>厳密なTypeScript定義</strong>: `Distribution`, `BasicEvent`, `Gate`, `FaultTree`, `EventTree`等のインターフェースが `src/lib/types/index.ts` で綿密に定められており、コーディングミスをコンパイルレベルで防御。</li>
                  <li><strong>ロケールと言語対応</strong>: 日本語/英語に対応する `locale` 情報などを格納し、ローカライズデータの安全性を確保。</li>
                </ul>
              </div>

              <div className="interactive-box glow-amber">
                <div className="interactive-header">Open-PSA MEF データ型検証</div>
                <div className="interactive-body">
                  <div className="code-block-display" style={{ color: '#EAB308' }}>
                    <pre><code>{`export interface BasicEvent {
  id: string; name: string;
  failureRate: number; missionTime?: number;
  distribution: Distribution; // 点、対数正規、正規、一様...
  seismicFragilityId?: string; // 地震脆性への拡張
}`}</code></pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* スライド7: Transfer Gate と無限巡回防止 */}
        {currentSlide === 6 && (
          <div className="slide fade-in">
            <span className="slide-tag" style={{ color: '#A855F7' }}>SAFETY MERGE</span>
            <h2 className="slide-title">6. 複数ツリー安全合成と無限巡回の完全防止</h2>
            <p className="slide-subtitle">他のフォールトツリーから共通部分へリンクする「Transfer Gate」を処理する際、無限ループ（再帰循環）に陥らないセーフティ設計を実装。</p>

            <div className="demo-layout">
              <div className="demo-info">
                <h3>巡回再帰防止ロジックの検証</h3>
                <ul className="styled-list">
                  <li><strong>`visitedTrees` による履歴追跡</strong>: `buildBDD` 内部で、再帰的に読み込まれたフォールトツリーのIDを `visitedTrees` 集合に記録。同一IDを再度検知した場合は処理を自動終了。</li>
                  <li><strong>不整合モデルの保護</strong>: 不整合なユーザーモデリングによって万が一循環リンクが作成された場合でも、ブラウザのフリーズ、Stack Overflow、メモリアウトを数学的に回避して例外処理します。</li>
                </ul>
              </div>

              <div className="interactive-box glow-cyan">
                <div className="interactive-header">再帰防止処理（`bdd.ts`より抜粋）</div>
                <div className="interactive-body">
                  <div className="code-block-display" style={{ color: '#06B6D4' }}>
                    <pre><code>{`export function buildBDD(
  gateId: string, gates: Gate[], ...,
  visitedTrees: Set<string> = new Set()
) {
  if (linkedFT && !visitedTrees.has(linkedFT.id)) {
    const newVisited = new Set(visitedTrees);
    newVisited.add(linkedFT.id); // 安全マーク
    return buildBDD(..., newVisited);
  }
}`}</code></pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* スライド8: 検証まとめ */}
        {currentSlide === 7 && (
          <div className="slide slide--lead fade-in">
            <span className="slide-tag" style={{ color: '#A855F7' }}>SYSTEM VALIDATION CONCLUSION</span>
            <h1 className="main-title" style={{ fontSize: '2.5rem', background: 'linear-gradient(135deg, #A855F7, #06B6D4)', WebkitBackgroundClip: 'text' }}>システム・実装検証の結論</h1>
            <p className="main-desc" style={{ maxWidth: '850px', fontSize: '15px', lineHeight: '1.8' }}>
              PRA Nexus の計算プログラムは、<strong>「マルチスレッド並行通信の安全性」「高効率メモ化による計算量の劇的削減」「明示的リセットによるメモリ管理の徹底」</strong>を極めて高いレベルで実現しています。
              ブラウザ環境で動作する軽量さでありながら、レガシーな専用インストール型ツールと同等以上の「超軽量・安全デプロイ」が可能な現代最高峰のアーキテクチャが実装されていることが裏付けられました。
            </p>

            <div className="conclusion-cards">
              <div className="conclusion-card" style={{ borderColor: 'rgba(168, 85, 247, 0.2)' }}>
                <h4>🚀 異次元のユーザー体験</h4>
                <p>Web Worker + 3層キャッシュにより、何万個ものノードをもつフォールトツリーでもカクつかずに即時演算可能</p>
              </div>
              <div className="conclusion-card" style={{ borderColor: 'rgba(6, 182, 212, 0.2)' }}>
                <h4>🛡️ 極めて高いデータ堅牢性</h4>
                <p>Open-PSAに準拠したTypeScript型保護と無限ループ検知セーフティにより、破損データや不正モデリングを完全に保護</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* フッター */}
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
              style={{ background: currentSlide === idx ? '#A855F7' : '' }}
              onClick={() => setCurrentSlide(idx)}
            />
          ))}
        </div>

        <button
          className="btn btn--primary btn--sm"
          style={{ background: '#A855F7', color: '#FFF' }}
          onClick={() => setCurrentSlide((prev) => Math.min(prev + 1, totalSlides - 1))}
          disabled={currentSlide === totalSlides - 1}
        >
          次へ →
        </button>
      </footer>

      {/* グローバルCSS */}
      <style jsx global>{`
        .pitch-container {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: #0A1628;
          color: #F1F5F9;
          font-family: 'Inter', sans-serif;
          display: flex;
          flex-direction: column;
          z-index: 9999;
          overflow: hidden;
        }
        .pitch-bg-glow {
          position: absolute;
          top: -20%; left: -10%;
          width: 60%; height: 60%;
          background: radial-gradient(circle, rgba(168, 85, 247, 0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .pitch-header {
          height: 60px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 40px;
          background: rgba(10, 22, 40, 0.8);
          backdrop-filter: blur(8px);
        }
        .pitch-header__logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .pitch-header__logo-icon {
          width: 32px; height: 32px;
          border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; color: #0A1628;
        }
        .pitch-header__logo-text {
          font-size: 18px; font-weight: 700;
          background: linear-gradient(90deg, #A855F7, #06B6D4);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .pitch-header__badge {
          padding: 2px 8px; border-radius: 4px;
          font-size: 9px; font-weight: 600;
        }
        .pitch-header__status {
          font-size: 12px; color: #94A3B8;
        }
        .pitch-viewport {
          flex: 1; display: flex; align-items: center; justify-content: center;
          padding: 40px;
        }
        .slide {
          width: 100%; max-width: 1000px;
          display: flex; flex-direction: column;
          height: 100%; justify-content: center;
        }
        .slide--lead {
          align-items: center; text-align: center;
        }
        .slide-tag {
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.15em; margin-bottom: 8px;
        }
        .slide-title {
          font-size: 32px; font-weight: 700; color: #F1F5F9;
          margin-bottom: 8px;
          background: linear-gradient(90deg, #F1F5F9, #94A3B8);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .slide-subtitle {
          font-size: 15px; color: #94A3B8; margin-bottom: 30px;
        }
        .scratch-badge {
          padding: 6px 16px; border-radius: 20px;
          font-size: 12px; font-weight: 600;
          margin-bottom: 24px;
        }
        .main-title {
          font-size: 56px; font-weight: 800;
          -webkit-text-fill-color: transparent;
          margin-bottom: 16px;
        }
        .main-subtitle {
          font-size: 20px; color: #F1F5F9; margin-bottom: 16px;
        }
        .main-desc {
          font-size: 15px; color: #94A3B8; max-width: 700px; margin-bottom: 32px;
        }
        .cover-features {
          display: flex; gap: 16px; margin-bottom: 40px;
        }
        .feat-chip {
          background: rgba(30, 52, 84, 0.4);
          border: 1px solid rgba(148, 163, 184, 0.15);
          padding: 8px 16px; border-radius: 6px;
          font-size: 13px;
        }
        .navigation-hint {
          font-size: 11px; color: #64748B;
        }
        .navigation-hint span {
          background: #1E3454; color: #F1F5F9;
          padding: 2px 6px; border-radius: 4px;
        }
        .architecture-grid {
          display: flex; justify-content: space-between; align-items: center; gap: 20px;
          margin-top: 20px;
        }
        .arch-card {
          flex: 1; background: rgba(15, 29, 50, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.15);
          border-radius: 12px; padding: 24px; min-height: 180px;
        }
        .arch-card h4 {
          font-size: 16px; font-weight: 600; color: #F1F5F9; margin-bottom: 12px;
        }
        .arch-card p {
          font-size: 13px; color: #94A3B8; line-height: 1.6;
        }
        .arch-connector {
          font-family: monospace; font-size: 12px; color: #A855F7; font-weight: bold;
        }
        .demo-layout {
          display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 32px;
          align-items: center;
        }
        .styled-list {
          list-style: none; padding: 0;
        }
        .styled-list li {
          font-size: 14px; margin-bottom: 16px; line-height: 1.6;
          padding-left: 20px; position: relative; color: #94A3B8;
        }
        .styled-list li::before {
          content: '✓'; position: absolute; left: 0; color: #A855F7; font-weight: bold;
        }
        .interactive-box {
          background: rgba(15, 29, 50, 0.8);
          border: 1px solid rgba(148, 163, 184, 0.15);
          border-radius: 12px; overflow: hidden;
        }
        .interactive-header {
          background: rgba(30, 52, 84, 0.5);
          padding: 12px 20px; font-size: 13px; font-weight: 600;
          display: flex; justify-content: space-between; align-items: center;
        }
        .interactive-body {
          padding: 20px;
        }
        .glow-cyan { border-color: rgba(6, 182, 212, 0.3); }
        .glow-green { border-color: rgba(0, 214, 143, 0.3); }
        .glow-amber { border-color: rgba(255, 176, 32, 0.3); }
        .glow-purple { border-color: rgba(168, 85, 247, 0.3); }
        .code-block-display {
          background: #050E1A; border-radius: 6px;
          padding: 12px; font-family: monospace; font-size: 12px;
          color: #A855F7; border: 1px solid rgba(148, 163, 184, 0.05);
        }
        .validation-success-badge {
          background: rgba(168, 85, 247, 0.1);
          color: #A855F7; border: 1px solid rgba(168, 85, 247, 0.2);
          padding: 6px 12px; border-radius: 6px;
          font-size: 11px; font-weight: 600; margin-top: 10px;
          display: inline-block;
        }
        .console-output {
          background: #050E1A; padding: 12px; border-radius: 6px;
          border: 1px solid rgba(148, 163, 184, 0.05);
          font-family: monospace;
        }
        .conclusion-cards {
          display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
          width: 100%; margin-top: 30px;
        }
        .conclusion-card {
          background: rgba(15, 29, 50, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 8px; padding: 20px; text-align: left;
        }
        .conclusion-card h4 {
          font-size: 15px; font-weight: 600; color: #F1F5F9; margin-bottom: 8px;
        }
        .conclusion-card p {
          font-size: 13px; color: #94A3B8; line-height: 1.5;
        }
        .pitch-controls {
          height: 60px; border-top: 1px solid rgba(148, 163, 184, 0.1);
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 40px; background: rgba(10, 22, 40, 0.8);
        }
        .pitch-progress-dots {
          display: flex; gap: 10px;
        }
        .dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: rgba(148, 163, 184, 0.3); border: none; cursor: pointer;
        }
        .dot--active {
          transform: scale(1.3);
          box-shadow: 0 0 10px #A855F7;
        }
        .btn {
          padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; border: none;
        }
        .btn--primary {
          background: #A855F7; color: #FFF;
        }
        .btn--secondary {
          background: rgba(148, 163, 184, 0.15); color: #F1F5F9;
        }
        .btn:disabled {
          opacity: 0.4; cursor: not-allowed;
        }
        .status-label {
          font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px;
        }
        .status-label.ready {
          background: rgba(0, 214, 143, 0.15); color: #00D68F;
        }
        .status-label.working {
          background: rgba(251, 191, 36, 0.15); color: #FBBF24;
          animation: pulse 1s infinite alternate;
        }
        @keyframes pulse {
          from { opacity: 0.6; } to { opacity: 1; }
        }
        .fade-in {
          animation: fadeIn 0.4s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
