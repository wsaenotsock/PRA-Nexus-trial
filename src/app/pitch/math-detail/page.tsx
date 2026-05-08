'use client';

import React, { useState, useEffect } from 'react';

export default function MathDetailPitch() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 10;
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

  // インタラクティブ：フローチャート体験（BDDの例え）
  const [hasA, setHasA] = useState<boolean | null>(null);
  const [hasB, setHasB] = useState<boolean | null>(null);

  const getFlowResult = () => {
    if (hasA === null) return '【ステップ1】「部品Aは壊れましたか？」を選択してください';
    if (hasA === true) {
      return '⚠️ 部品Aが壊れたため、システムは即時停止（危険状態）になりました！';
    }
    if (hasB === null) return '【ステップ2】部品Aは無事です。「部品Bは壊れましたか？」を選択してください';
    if (hasB === true) {
      return '⚠️ 部品Aは無事ですが、部品Bが壊れたため、システム停止しました！';
    }
    return '🍀 部品AもBも壊れていません。システムは安全に稼働しています！';
  };

  return (
    <div className="pitch-container">
      <div className="pitch-bg-glow" />

      {/* ヘッダー */}
      <header className="pitch-header">
        <div className="pitch-header__logo">
          <span className="pitch-header__logo-icon" style={{ background: 'linear-gradient(135deg, #22C55E, #3B82F6)' }}>ぴ</span>
          <span className="pitch-header__logo-text">PRAの数学をサクッと理解する会</span>
          <span className="pitch-header__badge" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E' }}>一般向けやさしい解説</span>
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
            <div className="scratch-badge" style={{ borderColor: 'rgba(34, 197, 94, 0.3)', color: '#22C55E', background: 'rgba(34, 197, 94, 0.1)' }}>数式なし！図解でわかる</div>
            <h1 className="main-title" style={{ background: 'linear-gradient(135deg, #22C55E, #3B82F6)', WebkitBackgroundClip: 'text' }}>PRA Nexusの数式ロジック</h1>
            <h2 className="main-subtitle" style={{ fontSize: '1.4rem', color: '#94A3B8' }}>巨大プラントや機械の「もしも」を計算する、おもしろい数学のしくみ</h2>
            <p className="main-desc">
              「確率論的安全評価（PRA）」という難しそうな言葉の裏側で動いている、賢いアルゴリズムたちを、クイズや日常のたとえ話で楽しくひも解きます！
            </p>
            <div className="cover-features">
              <span className="feat-chip">💡 フローチャート（BDD）</span>
              <span className="feat-chip">🍟 ドミノ倒し（CCF）</span>
              <span className="feat-chip">🎲 1万回のサイコロ（モンテカルロ）</span>
            </div>
            <div className="navigation-hint">
              キーボードの「 <span>→</span> 」または「 <span>Space</span> 」キーでスライドが進みます
            </div>
          </div>
        )}

        {/* スライド2: そもそもPRAって？ */}
        {currentSlide === 1 && (
          <div className="slide fade-in">
            <span className="slide-tag" style={{ color: '#22C55E' }}>WHAT IS PRA?</span>
            <h2 className="slide-title">1. そもそも「PRA（ピー・アール・エー）」ってなに？</h2>
            <p className="slide-subtitle">機械や設備が「絶対に壊れない」と信じるのではなく、「どんな壊れ方をして、どのくらいの確率で大事故になるか」を事前に予測する技術です。</p>

            <div className="comparison-detail-grid">
              <div className="detail-card">
                <h5>昔の考え方：『絶対安全！』</h5>
                <p>「分厚い鉄板で作ったから壊れません！」と主張する。しかし想定外の大地震やミスが重なると、一発で崩壊する弱点がありました。</p>
              </div>
              <div className="detail-card glow-green">
                <h5>PRAの考え方：『最悪の組み合わせを探せ！』</h5>
                <p>「もしポンプが壊れ、さらに電気も消え、人間の操作も遅れたら？」という、不運が最悪に重なるシナリオを全部ツリー状に書き出し、確率を冷静に掛け算します。</p>
              </div>
            </div>
          </div>
        )}

        {/* スライド3: BDD = イエスノーフローチャート */}
        {currentSlide === 2 && (
          <div className="slide fade-in">
            <span className="slide-tag" style={{ color: '#22C55E' }}>WHAT IS BDD?</span>
            <h2 className="slide-title">2. BDD（二分決定図）＝ 超シンプルなイエスノーツリー</h2>
            <p className="slide-subtitle">複雑にからまった「ジャングルジム」のような電気回路や配管図を、1本道の「はい／いいえ」フローチャートに整頓する魔法です。</p>

            <div className="demo-layout">
              <div className="demo-info">
                <h3>ジャングルジムを一本道にする</h3>
                <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: '1.6' }}>
                  「Aが壊れてBが動き、Cが止まったら…」と考えると、頭がパニックになりますよね。<br/>
                  BDDは、すべての部品に対して順番に「壊れた？（はい/いいえ）」と質問して進んでいくだけで、誰でも迷わずにゴール（事故か安全か）にたどり着ける究極のフローチャートを作ります。
                </p>
              </div>

              <div className="interactive-box glow-green">
                <div className="interactive-header">プチ・フローチャート体験</div>
                <div className="interactive-body">
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                    <button className="btn btn--secondary btn--xs" onClick={() => { setHasA(true); setHasB(null); }}>部品A 壊れた</button>
                    <button className="btn btn--secondary btn--xs" onClick={() => { setHasA(false); setHasB(null); }}>部品A 無事</button>
                  </div>
                  {hasA === false && (
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                      <button className="btn className=btn btn--secondary btn--xs" onClick={() => setHasB(true)}>部品B 壊れた</button>
                      <button className="btn btn--secondary btn--xs" onClick={() => setHasB(false)}>部品B 無事</button>
                    </div>
                  )}
                  <div className="console-output" style={{ color: '#22C55E', minHeight: '60px', fontSize: '12px' }}>
                    {getFlowResult()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* スライド4: 確率の計算 */}
        {currentSlide === 3 && (
          <div className="slide fade-in">
            <span className="slide-tag" style={{ color: '#22C55E' }}>PROBABILITY</span>
            <h2 className="slide-title">3. 確率の計算 ＝ 迷路の「あたりルート」を通る確率</h2>
            <p className="slide-subtitle">部品が壊れる確率は「10日に1回（0.1）」や「100日に1回（0.01）」のように小数で表します。これらを掛け合わせることで、全体の事故確率を計算します。</p>

            <div className="detail-narrative">
              <h4>なぜ、単純な足し算ではダメなの？</h4>
              <p>
                「Aが壊れる確率が10%」「Bが壊れる確率が10%」だからといって、両方壊れる確率を 10% + 10% = 20% と足してはいけません。両方が同時に壊れるのは、0.1 × 0.1 = 0.01（わずか1%）の確率だからです。<br/>
                PRA NexusのBDDは、このように<strong>「独立した事象の掛け算」を正確に自動整理して、絶対に計算ミスをしない仕組み</strong>を持っています。
              </p>
            </div>
          </div>
        )}

        {/* スライド5: 最も危険な不運の組み合わせ (MCS) */}
        {currentSlide === 4 && (
          <div className="slide fade-in">
            <span className="slide-tag" style={{ color: '#22C55E' }}>MINIMAL CUT SETS</span>
            <h2 className="slide-title">4. 最小カットセット（MCS）＝ 「これだけは壊しちゃダメ！」リスト</h2>
            <p className="slide-subtitle">「部品Aと部品Bが同時に壊れたらゲームオーバー（システム完全停止）」という、不運の致命的パターンを洗い出す機能です。</p>

            <div className="demo-layout">
              <div className="detail-narrative">
                <h4>「最小」にするのが大事なワケ</h4>
                <p>
                  「AとBとCとDが壊れたら停止する」と言われても、項目が多すぎて対策できません。<br/>
                  でも、よく調べると「実はCとDが無事でも、AとBが壊れただけで停止する」ということが分かったりします。<br/>
                  このように、余分な条件を削ぎ落として<strong>「これさえ壊れなければ絶対に安全！」という最小限の最重要防衛ポイント</strong>を見つけるのが、MCS（最小カットセット）抽出技術です。
                </p>
              </div>

              <div className="interactive-box glow-cyan">
                <div className="interactive-header">💡 レシピで例えると</div>
                <div className="interactive-body" style={{ fontSize: '13px', lineHeight: '1.6', color: '#94A3B8' }}>
                  「カレーが作れない原因」のリスト：<br/>
                  ❌ 肉がない ＆ 野菜がない ＆ 皿がない<br/>
                  ↓ 整理（最小化）すると…<br/>
                  ❌ <strong>「カレーのルーがない」</strong> これだけで作れません！<br/>
                  このように一番シンプルで致命的な原因をスパッと見つけます。
                </div>
              </div>
            </div>
          </div>
        )}

        {/* スライド6: 部品の重要度ランキング */}
        {currentSlide === 5 && (
          <div className="slide fade-in">
            <span className="slide-tag" style={{ color: '#22C55E' }}>IMPORTANCE</span>
            <h2 className="slide-title">5. 重要度ランキング ＝ 「どの部品を一番大事にする？」</h2>
            <p className="slide-subtitle">全部のネジや配線を完璧に点検するのはお金も時間もかかります。そこで、「一番サボっちゃいけない最重要部品」をランキング付けします。</p>

            <div className="importance-explanation-grid">
              <div className="imp-sub-card">
                <h5>① もしも壊れたときの影響度（RAW）</h5>
                <p>「このボタンが壊れたら、即座に大パニックになるぞ！」という、壊れたときのリスク最悪度。</p>
              </div>
              <div className="imp-sub-card">
                <h5>② 完璧に直したときのお得度（RRW）</h5>
                <p>「この部品を最新の絶対に壊れない高級品に変えたら、全体の危険が半分に減るぞ！」という効果の大きさ。</p>
              </div>
            </div>
          </div>
        )}

        {/* スライド7: CCF = ドミノ倒しのような不運 */}
        {currentSlide === 6 && (
          <div className="slide fade-in">
            <span className="slide-tag" style={{ color: '#22C55E' }}>COMMON CAUSE FAILURE</span>
            <h2 className="slide-title">6. 共通原因故障（CCF）＝ いっぺんに倒れるドミノ不運</h2>
            <p className="slide-subtitle">「予備の発電機を2台置いてあるから安心」と思っていても、大雨で地下室が水没したら、2台とも同時に水浸しで動かなくなります。</p>

            <div className="demo-layout">
              <div className="detail-narrative">
                <h4>「まさか同時に」を計算に入れる</h4>
                <p>
                  1台の故障確率が100分の1（0.01）だとしたら、2台同時に故障するのは「0.01 × 0.01 = 1万分の1」のはずです。しかし、「大地震」「火災」「メンテナンス作業員の同じ勘違い」といった共通の原因があると、100分の1の確率で同時に動かなくなります。<br/>
                  PRA Nexusは、この<strong>「不運な連鎖・同時故障」を最初から考慮にいれて、甘すぎる安全評価をシャットアウト</strong>します。
                </p>
              </div>

              <div className="interactive-box glow-purple">
                <div className="interactive-header">ドミノ倒し（CCF）の身近な例</div>
                <div className="interactive-body" style={{ fontSize: '13px', lineHeight: '1.6', color: '#94A3B8' }}>
                  📱 <strong>スマホを予備含めて2台持っているから安心？</strong><br/>
                  しかし、山奥で「キャリアの電波障害（共通原因）」が起きたら、2台とも完全に圏外になってしまいます。<br/>
                  これが「共通原因故障（CCF）」の恐ろしさです。
                </div>
              </div>
            </div>
          </div>
        )}

        {/* スライド8: 地震と壊れやすさ（地震PRA） */}
        {currentSlide === 7 && (
          <div className="slide fade-in">
            <span className="slide-tag" style={{ color: '#22C55E' }}>SEISMIC PRA</span>
            <h2 className="slide-title">7. 地震の揺れと壊れやすさの掛け算</h2>
            <p className="slide-subtitle">地震のリスクを調べるには、「その地域にどのくらいの地震が来るか（ハザード）」と「揺れに対して機器が耐えられるか（脆性）」を掛け合わせます。</p>

            <div className="seismic-illustration">
              <div className="seismic-box-concept">
                <h5>📊 地震が来る確率 (ハザード)</h5>
                <p>震度5の地震は10年に1回、震度7の地震は500年に1回…という、自然界の厳しさデータ。</p>
              </div>
              <div className="seismic-math-symbol">✕</div>
              <div className="seismic-box-concept">
                <h5>🥛 揺れに対する弱さ (脆性・フラジリティ)</h5>
                <p>震度5でお皿は30%割れる、頑丈なコップは震度7でも5%しか割れない…という、モノの強さデータ。</p>
              </div>
              <div className="seismic-math-symbol">＝</div>
              <div className="seismic-box-concept glow-green">
                <h5>🔥 1年間に壊れる平均確率</h5>
                <p>すべての揺れの強さ（震度1〜7）を細かく区切ってそれぞれ掛け算し、最後にあわせる（積分する）ことで、現実的な年間リスクを割り出します。</p>
              </div>
            </div>
          </div>
        )}

        {/* スライド9: サイコロを振る (モンテカルロ) */}
        {currentSlide === 8 && (
          <div className="slide fade-in">
            <span className="slide-tag" style={{ color: '#22C55E' }}>MONTE CARLO SIMULATION</span>
            <h2 className="slide-title">8. 不確かなら「サイコロを1万回振って確かめる」</h2>
            <p className="slide-subtitle">「部品が壊れる確率はたぶん5%くらいだけど、3%〜8%にぶれるかもしれない」という曖昧さがあるとき、どうやって計算するでしょうか？</p>

            <div className="demo-layout">
              <div className="detail-narrative">
                <h4>シミュレーション（モンテカルロ法）の凄さ</h4>
                <p>
                  頭の中で数式を解くのが難しいなら、<strong>パソコンの中に「仮想の部品」を作って、実際にサイコロを1万回振って壊してみる</strong>のです！<br/>
                  1万回の実験結果を集計すると、「最悪の場合は危険確率が〇%になり、平均すると〇%に収まる」ということが自然と見えてきます。<br/>
                  これが、モンテカルロシミュレーションの力です。
                </p>
              </div>

              <div className="interactive-box glow-purple">
                <div className="interactive-header">🎲 やさしいイメージ</div>
                <div className="interactive-body" style={{ fontSize: '13px', lineHeight: '1.6', color: '#94A3B8' }}>
                  明日、雨が降るか分からない（不確実）。<br/>
                  「1万通りの天気シナリオ」をシミュレーションして、傘が必要だった回数を数える。<br/>
                  9,500回傘が必要だったら「95%の確率で必要」と自信を持って言えますよね！
                </div>
              </div>
            </div>
          </div>
        )}

        {/* スライド10: まとめ */}
        {currentSlide === 9 && (
          <div className="slide slide--lead fade-in">
            <span className="slide-tag" style={{ color: '#22C55E' }}>MATH CONCLUSION</span>
            <h1 className="main-title" style={{ fontSize: '2.5rem', background: 'linear-gradient(135deg, #22C55E, #3B82F6)', WebkitBackgroundClip: 'text' }}>数学は、安全を守るための最強のツール</h1>
            <p className="main-desc" style={{ maxWidth: '850px', fontSize: '15px', lineHeight: '1.8' }}>
              PRA Nexusの中で動いている数理アルゴリズムは、決しておどろおどろしい数式をこねくり回しているわけではありません。<br/>
              <strong>「最悪の事態（不運）を賢くツリー状に並べ」</strong>、<br/>
              <strong>「ドミノ倒しのような連鎖的な故障を先回りして考慮し」</strong>、<br/>
              <strong>「1万回のサイコロを振ってリアルな未来を先取りして予測する」</strong>、<br/>
              私たちのプラントや生活の安全を守るために、最も現実的で役に立つ「知恵」なのです。
            </p>

            <div className="conclusion-cards">
              <div className="conclusion-card" style={{ borderColor: 'rgba(34, 197, 94, 0.2)' }}>
                <h4>🍀 誰でもわかる安心のカタチ</h4>
                <p>数理ロジックをイラストやフローチャートとして見える化することで、安全性をだれでも納得して議論できます</p>
              </div>
              <div className="conclusion-card" style={{ borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                <h4>🚀 ミスをしない完璧な計算力</h4>
                <p>人の頭ではパニックになってしまう何十万通りの不運の組み合わせを、一瞬で、100%正確に計算して答えを出します</p>
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
              style={{ background: currentSlide === idx ? '#22C55E' : '' }}
              onClick={() => setCurrentSlide(idx)}
            />
          ))}
        </div>

        <button
          className="btn btn--primary btn--sm"
          style={{ background: '#22C55E', color: '#0A1628' }}
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
          background: radial-gradient(circle, rgba(34, 197, 94, 0.08) 0%, transparent 70%);
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
          background: linear-gradient(90deg, #22C55E, #3B82F6);
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
          display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
          margin-top: 20px;
        }
        .detail-card {
          background: rgba(15, 29, 50, 0.6);
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
        }
        .interactive-body {
          padding: 20px;
        }
        .glow-green { border-color: rgba(34, 197, 94, 0.3); }
        .glow-cyan { border-color: rgba(6, 182, 212, 0.3); }
        .glow-purple { border-color: rgba(168, 85, 247, 0.3); }
        .console-output {
          background: #050E1A; padding: 12px; border-radius: 6px;
          border: 1px solid rgba(148, 163, 184, 0.05);
        }
        .importance-explanation-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
          margin-top: 20px;
        }
        .imp-sub-card {
          background: rgba(15, 29, 50, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.15);
          border-radius: 12px; padding: 24px; min-height: 180px;
        }
        .imp-sub-card h5 {
          font-size: 16px; font-weight: 600; color: #F1F5F9; margin-bottom: 12px;
        }
        .imp-sub-card p {
          font-size: 13px; color: #94A3B8; line-height: 1.6;
        }
        .seismic-illustration {
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
          margin-top: 30px;
        }
        .seismic-box-concept {
          flex: 1; background: rgba(15, 29, 50, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.15);
          border-radius: 12px; padding: 20px; min-height: 160px;
          text-align: center;
        }
        .seismic-box-concept.glow-green {
          border-color: rgba(34, 197, 94, 0.3);
          background: rgba(15, 29, 50, 0.8);
        }
        .seismic-box-concept h5 {
          font-size: 14px; font-weight: 600; color: #F1F5F9; margin-bottom: 10px;
        }
        .seismic-box-concept p {
          font-size: 12px; color: #94A3B8; line-height: 1.5;
        }
        .seismic-math-symbol {
          font-size: 20px; font-weight: bold; color: #94A3B8; padding: 0 10px;
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
          box-shadow: 0 0 10px #22C55E;
        }
        .btn {
          padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; border: none;
        }
        .btn--primary {
          background: #22C55E; color: #0A1628;
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
