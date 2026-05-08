'use client';

import React, { useState, useEffect } from 'react';

export default function SystemDetailPitch() {
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

  // インタラクティブ：メモ帳（キャッシュ）体験デモ
  const [cacheHits, setCacheHits] = useState(0);
  const [calcTimes, setCalcTimes] = useState<string[]>([]);

  const handleCalcClick = (isNew: boolean) => {
    if (isNew) {
      setCalcTimes(prev => [...prev, '⏰ 初回計算：複雑な計算を処理中... 完了！ (所要時間: 18ms)']);
    } else {
      setCacheHits(prev => prev + 1);
      setCalcTimes(prev => [...prev, '⚡ キャッシュヒット！ ノートに書いておいた答えを即時返却 (所要時間: 0.1ms)']);
    }
  };

  const resetDemo = () => {
    setCacheHits(0);
    setCalcTimes([]);
  };

  return (
    <div className="pitch-container">
      <div className="pitch-bg-glow" />

      {/* ヘッダー */}
      <header className="pitch-header">
        <div className="pitch-header__logo">
          <span className="pitch-header__logo-icon" style={{ background: 'linear-gradient(135deg, #EC4899, #8B5CF6)' }}>し</span>
          <span className="pitch-header__logo-text">PRA Nexus システムの裏側探検</span>
          <span className="pitch-header__badge" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#EC4899' }}>やさしいシステム解説</span>
        </div>
        <div className="pitch-header__status">
          スライド {currentSlide + 1} / {totalSlides}
        </div>
      </header>

      {/* スライド viewport */}
      <main className="pitch-viewport">
        {/* スライド1: 表紙 */}
        {currentSlide === 0 && (
          <div className="slide slide--lead fade-in">
            <div className="scratch-badge" style={{ borderColor: 'rgba(236, 72, 153, 0.3)', color: '#EC4899', background: 'rgba(236, 72, 153, 0.1)' }}>IT知識ゼロでも安心</div>
            <h1 className="main-title" style={{ background: 'linear-gradient(135deg, #EC4899, #8B5CF6)', WebkitBackgroundClip: 'text' }}>PRA Nexusシステムのしくみ</h1>
            <h2 className="main-subtitle" style={{ fontSize: '1.4rem', color: '#94A3B8' }}>なぜ、ブラウザなのに大企業の専用アプリよりサクサク動くの？</h2>
            <p className="main-desc">
              「ウェブサイトの中で、何十万通りもの計算を同時に、1秒も待たずにこなす超速アプリ」。<br/>
              その裏側で働く天才的なプログラミングの仕掛けを、お料理やオフィスの例えでやさしく説明します。
            </p>
            <div className="cover-features">
              <span className="feat-chip">💁‍♀️ 司令塔と作業員（Worker）</span>
              <span className="feat-chip">📒 カンニングノート（キャッシュ）</span>
              <span className="feat-chip">🧹 机のまめなお片付け（メモリクリア）</span>
            </div>
            <div className="navigation-hint">
              キーボードの「 <span>→</span> 」または「 <span>Space</span> 」キーでスライドが進みます
            </div>
          </div>
        )}

        {/* スライド2: 司令塔と計算作業員 (Web Worker) */}
        {currentSlide === 1 && (
          <div className="slide fade-in">
            <span className="slide-tag" style={{ color: '#EC4899' }}>WORKER CONCEPT</span>
            <h2 className="slide-title">1. 「司令塔（画面）」と「計算のプロ（Worker）」の分業</h2>
            <p className="slide-subtitle">ボタンを押した瞬間に画面が「フリーズして固まってしまう」ような不満。PRA Nexusには一切ありません。</p>

            <div className="comparison-detail-grid">
              <div className="detail-card">
                <h5>❌ ダメなレストランの例：ワンオペ</h5>
                <p>
                  店主（画面スレッド）が、レジ打ちから調理、皿洗い、1万個の仕込み（計算）をすべて1人でこなす。<br/>
                  料理を一生懸命作っている間はレジ（画面のクリック）が完全に放置され、客がイライラします。
                </p>
              </div>
              <div className="detail-card glow-pink" style={{ borderColor: 'rgba(236, 72, 153, 0.3)' }}>
                <h5>✨ PRA Nexusの例：完璧なコンビ</h5>
                <p>
                  <strong>「レジ専属の笑顔の店員（画面）」</strong>と、<strong>「別室にいるもくもくと超高速で調理する料理長（Web Worker）」</strong>を分けました。<br/>
                  どれだけ大変な調理（1万回の不確かさ計算）をしていても、店員のいる窓口は常に瞬時に応答します。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* スライド3: 答えをメモしておくカンニングノート */}
        {currentSlide === 2 && (
          <div className="slide fade-in">
            <span className="slide-tag" style={{ color: '#EC4899' }}>CACHE MEMOIZATION</span>
            <h2 className="slide-title">2. 計算をサボるための「カンニングノート（キャッシュ）」</h2>
            <p className="slide-subtitle">一番頭の良いコンピュータは「同じ計算を二度としないコンピュータ」です。</p>

            <div className="demo-layout">
              <div className="detail-narrative">
                <h4>一度やった答えをノートに書いておく</h4>
                <p>
                  「298✕456は？」と聞かれて一生懸命計算して「135,888」と出しました。<br/>
                  次に「298✕456は？」と聞かれたら、もう計算しません。ノートに書いてある「135,888」を0.1秒で読み上げるだけです。<br/>
                  PRA Nexusは、計算のあらゆるステップにこの<strong>「カンニングノート（3層キャッシュ戦略）」を配置し、何回も行う同じ計算を100%カット</strong>しています。
                </p>
              </div>

              <div className="interactive-box glow-pink">
                <div className="interactive-header">
                  <span>カンニングノート（キャッシュ）疑似体験</span>
                  <span style={{ fontSize: '11px', color: '#EC4899' }}>ノート参照回数: {cacheHits} 回</span>
                </div>
                <div className="interactive-body">
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <button className="btn btn--primary btn--xs" onClick={() => handleCalcClick(true)}>初めての計算をする</button>
                    <button className="btn btn--secondary btn--xs" onClick={() => handleCalcClick(false)}>2回目の同じ計算をする</button>
                    <button className="btn btn--secondary btn--xs" style={{ background: '#E11D48' }} onClick={resetDemo}>クリア</button>
                  </div>
                  <div className="console-output" style={{ minHeight: '100px', fontSize: '11px', color: '#EC4899', overflowY: 'auto', maxHeight: '120px' }}>
                    {calcTimes.length === 0 ? '【上のボタンをクリックして試してください】' : calcTimes.map((time, idx) => <div key={idx}>{time}</div>)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* スライド4: 机の上の一瞬でのお片付け */}
        {currentSlide === 3 && (
          <div className="slide fade-in">
            <span className="slide-tag" style={{ color: '#EC4899' }}>MEMORY MANAGEMENT</span>
            <h2 className="slide-title">3. 仕事が変わったら「机の上を一瞬できれいに片付ける」</h2>
            <p className="slide-subtitle">ブラウザのメモリ（作業スペース）がゴミで散らかるのをまめに防ぎ、いつでもピカピカに保ちます。</p>

            <div className="detail-narrative">
              <h4>まめな片付けがサクサク感を維持する</h4>
              <p>
                仕事ができる人は、次の作業に移る前に、机の上の書類やゴミ（いらなくなった計算結果）をきれいにゴミ箱（ガベージコレクション）へ捨てます。
                机が散らかったままだと、新しい書類を置くスペース（メモリ）がなくなって仕事が遅くなります。<br/>
                PRA Nexusは、新しい計算をスタートする前に、<strong>自動的に `resetBDD()` という片付け用のホウキを起動し、机の上の余計な情報を一気にゼロクリア</strong>します。これにより、スマホや古いパソコンでもスピードが落ちません。
              </p>
            </div>
          </div>
        )}

        {/* スライド5: 三角形の穴には三角形のブロックしか入らない */}
        {currentSlide === 4 && (
          <div className="slide fade-in">
            <span className="slide-tag" style={{ color: '#EC4899' }}>TYPE SAFETY</span>
            <h2 className="slide-title">4. 間違いを絶対に許さない「ブロックパズルのルール」</h2>
            <p className="slide-subtitle">プログラムに「文字（あいうえお）」を入れるべき場所に「数字（123）」が紛れ込んでしまうと、機械はパニックを起こしてバグを吐きます。</p>

            <div className="demo-layout">
              <div className="detail-narrative">
                <h4>型安全性（TypeScript）というゲートキーパー</h4>
                <p>
                  幼児用のおもちゃで、三角形の穴には三角形の積み木、丸い穴には丸い積み木しか入らない箱がありますよね。<br/>
                  PRA Nexusのプログラム（TypeScript）は、これと全く同じです。<br/>
                  <strong>「基本事象」「確率」「機器ID」などの各データに対して、1ミリの形状の不一致も許さない厳密な『型ルール』</strong>を設けています。これにより、間違ったデータが隙間から入ってシステムが暴走するのを100%ブロックします。
                </p>
              </div>

              <div className="interactive-box glow-purple">
                <div className="interactive-header">ブロックおもちゃのイメージ</div>
                <div className="interactive-body" style={{ display: 'flex', justifyContent: 'space-around', fontSize: '32px' }}>
                  <div style={{ textShadow: '0 0 10px #EC4899' }}>🔺 ➜ 🔺</div>
                  <div style={{ textShadow: '0 0 10px #8B5CF6' }}>🟡 ➜ 🟡</div>
                  <div style={{ textShadow: '0 0 10px #06B6D4' }}>🟦 ➜ 🟦</div>
                </div>
                <div style={{ padding: '0 20px 20px 20px', fontSize: '12px', color: '#94A3B8', textAlign: 'center' }}>
                  別の形のブロック（間違ったデータ）を入れようとすると、コンパイル時点でエラーとなり弾かれます。
                </div>
              </div>
            </div>
          </div>
        )}

        {/* スライド6: 設計図をパズルのようにつなぐ */}
        {currentSlide === 5 && (
          <div className="slide fade-in">
            <span className="slide-tag" style={{ color: '#EC4899' }}>TRANSFER GATES</span>
            <h2 className="slide-title">5. 他の設計図をパズルのようにつなげる「ワープ機能」</h2>
            <p className="slide-subtitle">巨大プラントの設計図を1枚の紙に全部書くのは不可能です。そこで、「ワープの目印（Transfer Gate）」を使って部分図を安全に連結します。</p>

            <div className="detail-narrative">
              <h4>無限ループ（迷路）にはまらないセーフティネット</h4>
              <p>
                「Aの図面の先にはBの図面があり、Bの図面の先にはAの図面がある…」といった不整合な設計ミスがあると、プログラムは無限に図面の間をワープし続け、最終的にクラッシュしてしまいます。<br/>
                PRA Nexusは、<strong>ワープした図面のIDをポケットの「訪問スタンプ帳（visitedTrees）」にまめに記録</strong>しています。<br/>
                「あれ、このスタンプはさっき押したぞ！」と気づいた瞬間にループを自動ストップ。絶対に遭難しない安全装置が備わっています。
              </p>
            </div>
          </div>
        )}

        {/* スライド7: 効率よくサイコロを振る技術 (LHS) */}
        {currentSlide === 6 && (
          <div className="slide fade-in">
            <span className="slide-tag" style={{ color: '#EC4899' }}>LATIN HYPERCUBE SAMPLING</span>
            <h2 className="slide-title">6. 偏りなく公平にサイコロを振る「ラテン超立方（LHS）技術」</h2>
            <p className="slide-subtitle">不確かな可能性を調べるためにサイコロを振るとき、普通に振ると「偶然同じ目（偏り）」が何度も出て、実験が無駄になることがあります。</p>

            <div className="comparison-detail-grid">
              <div className="detail-card">
                <h5>🎲 普通のサイコロ（モンテカルロ）</h5>
                <p>
                  完全にランダムに振るため、偶然「1」が5回連続で出たりして結果にムラができます。<br/>
                  ムラをなくすためには、何万回もサイコロを振り直さなければなりません。
                </p>
              </div>
              <div className="detail-card glow-pink" style={{ borderColor: 'rgba(236, 72, 153, 0.3)' }}>
                <h5>📊 賢いサイコロ（LHSサンプリング）</h5>
                <p>
                  サイコロの目を1〜6のエリア（Strata）に細かく区切ってから、「それぞれのエリアから必ず公平に1回ずつ取り出す」という賢い工夫を行います。<br/>
                  これにより、<strong>普通のサンプリングの数分の一という非常に少ない試行回数で、完璧に偏りのない正確なリスク分布</strong>に素早くたどり着けます。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* スライド8: まとめ */}
        {currentSlide === 7 && (
          <div className="slide slide--lead fade-in">
            <span className="slide-tag" style={{ color: '#EC4899' }}>SYSTEM CONCLUSION</span>
            <h1 className="main-title" style={{ fontSize: '2.5rem', background: 'linear-gradient(135deg, #EC4899, #8B5CF6)', WebkitBackgroundClip: 'text' }}>誰でもどこでも、世界最高水準の計算を</h1>
            <p className="main-desc" style={{ maxWidth: '850px', fontSize: '15px', lineHeight: '1.8' }}>
              PRA Nexus のシステム的な凄さは、難しいコンピュータ用語にあるのではなく、<br/>
              <strong>「いかに使う人を待たせず、安全でサクサクな環境をブラウザで届けるか」</strong>という優しい徹底設計にあります。<br/>
              レストランの司令塔と作業員のチームワーク、ノートに書いた賢いサボり（キャッシュ）、机のまめな片付け。<br/>
              これらの裏方の仕組みが融合して、世界最高水準の安全評価ツールが、誰のブラウザ上でも軽快に動き続けているのです。
            </p>

            <div className="conclusion-cards">
              <div className="conclusion-card" style={{ borderColor: 'rgba(236, 72, 153, 0.2)' }}>
                <h4>💻 インストールは一切不要！</h4>
                <p>お使いのウェブブラウザを立ち上げるだけで、いつでもどこでも、このスーパーコンピュータ級の計算パワーを独り占めできます</p>
              </div>
              <div className="conclusion-card" style={{ borderColor: 'rgba(139, 92, 246, 0.2)' }}>
                <h4>🛡️ クラッシュもフリーズもゼロへ</h4>
                <p>無限ループ防止や型ブロックパズルといった防護バリアが、ユーザーの入力ミスやデータの破損からシステムを完全に保護します</p>
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
              style={{ background: currentSlide === idx ? '#EC4899' : '' }}
              onClick={() => setCurrentSlide(idx)}
            />
          ))}
        </div>

        <button
          className="btn btn--primary btn--sm"
          style={{ background: '#EC4899', color: '#FFF' }}
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
          font-family: 'Inter', 'Noto Sans JP', sans-serif;
          display: flex;
          flex-direction: column;
          z-index: 9999;
          overflow: hidden;
        }
        .pitch-bg-glow {
          position: absolute;
          top: -20%; left: -10%;
          width: 60%; height: 60%;
          background: radial-gradient(circle, rgba(236, 72, 153, 0.08) 0%, transparent 70%);
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
          font-weight: 800; color: #FFF;
        }
        .pitch-header__logo-text {
          font-size: 18px; font-weight: 700;
          background: linear-gradient(90deg, #EC4899, #8B5CF6);
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
        .comparison-detail-grid {
          display: flex; justify-content: space-between; align-items: center; gap: 20px;
          margin-top: 20px;
        }
        .detail-card {
          flex: 1; background: rgba(15, 29, 50, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.15);
          border-radius: 12px; padding: 24px; min-height: 180px;
        }
        .detail-card h5 {
          font-size: 16px; font-weight: 600; color: #F1F5F9; margin-bottom: 12px;
        }
        .detail-card p {
          font-size: 13px; color: #94A3B8; line-height: 1.6;
        }
        .detail-narrative {
          flex: 1;
        }
        .detail-narrative h4 {
          font-size: 18px; font-weight: 600; color: #F1F5F9; margin-bottom: 12px;
        }
        .detail-narrative p {
          font-size: 14px; color: #94A3B8; line-height: 1.7; margin-bottom: 16px;
        }
        .demo-layout {
          display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 32px;
          align-items: center;
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
        .glow-pink { border-color: rgba(236, 72, 153, 0.3); }
        .glow-purple { border-color: rgba(168, 85, 247, 0.3); }
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
          box-shadow: 0 0 10px #EC4899;
        }
        .btn {
          padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; border: none;
        }
        .btn--primary {
          background: #EC4899; color: #FFF;
        }
        .btn--secondary {
          background: rgba(148, 163, 184, 0.15); color: #F1F5F9;
        }
        .btn--xs {
          padding: 4px 10px; font-size: 11px;
        }
        .btn:disabled {
          opacity: 0.4; cursor: not-allowed;
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
