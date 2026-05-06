import React, { useState, useMemo, useRef } from 'react';
import { useModelStore } from '@/store/modelStore';
import { useResultsStore, runWorkerCommand } from '@/store/resultsStore';

interface EventTreeCanvasProps {
  onNodeSelect: (nodeId: string | null, nodeType: string | null) => void;
  onHeaderAddRequest: (index?: number) => void;
  onQuantifySuccess?: () => void;
  onJumpToFT?: (ftId: string) => void;
  locale: 'ja' | 'en';
}

export default function EventTreeCanvas({ 
  onNodeSelect, 
  onHeaderAddRequest, 
  onQuantifySuccess,
  onJumpToFT,
  locale 
}: EventTreeCanvasProps) {
  const model = useModelStore((s) => s.model);
  const selectedEventTreeId = useModelStore((s) => s.selectedEventTreeId);
  const selectEventTree = useModelStore((s) => s.selectEventTree);
  const branchSequence = useModelStore((s) => s.branchSequence);
  const unbranchSequence = useModelStore((s) => s.unbranchSequence);
  const removeFunctionalEvent = useModelStore((s) => s.removeFunctionalEvent);

  const setComputing = useResultsStore(s => s.setComputing);
  const setResult = useResultsStore(s => s.setResult);
  const setError = useResultsStore(s => s.setError);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, sequenceId: string, feId: string, hasBranch: boolean } | null>(null);
  const [headerContextMenu, setHeaderContextMenu] = useState<{ x: number, y: number, index: number, feId?: string } | null>(null);
  
  const [hoveredHeader, setHoveredHeader] = useState<string | null>(null);
  const [hoveredLineKey, setHoveredLineKey] = useState<string | null>(null);

  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const et = model.eventTrees?.find((t) => t.id === selectedEventTreeId);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(transform.scale * delta, 0.1), 2);
    setTransform(t => ({ ...t, scale: newScale }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Start dragging on left click (0) or middle click (1)
    if (e.button === 0 || e.button === 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setTransform(t => ({
        ...t,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }));
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const COL_WIDTH = 180;
  const ROW_HEIGHT = 50;
  const HEADER_HEIGHT = 60;
  const INIT_EVENT_COL_WIDTH = 120;
  const END_STATE_COL_WIDTH = 150;
  const SEQ_ID_COL_WIDTH = 100;

  const feList = et?.functionalEvents || [];
  const sequences = et?.sequences || [];
  const totalWidth = INIT_EVENT_COL_WIDTH + feList.length * COL_WIDTH + END_STATE_COL_WIDTH + SEQ_ID_COL_WIDTH;
  const totalHeight = Math.max(sequences.length * ROW_HEIGHT + HEADER_HEIGHT + 40, 400);

  const handleFitView = () => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const padding = 40;
    const scaleX = (width - padding) / totalWidth;
    const scaleY = (height - padding) / totalHeight;
    const scale = Math.min(scaleX, scaleY, 1);
    setTransform({ scale, x: (width - totalWidth * scale) / 2, y: (height - totalHeight * scale) / 2 });
  };

  const handleExportImage = async () => {
    try {
      if (!svgRef.current) return;
      
      // Create a copy of the SVG
      const svg = svgRef.current.cloneNode(true) as SVGSVGElement;
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      
      // Set dimensions to full tree size
      svg.setAttribute('width', totalWidth.toString());
      svg.setAttribute('height', totalHeight.toString());
      svg.setAttribute('viewBox', `0 0 ${totalWidth} ${totalHeight}`);
      
      // Find the content group and remove its transform to export at 1:1 scale
      const contentGroup = svg.querySelector('g');
      if (contentGroup) {
        contentGroup.removeAttribute('transform');
      }

      // Inline computed styles for CSS variables to ensure the SVG looks correct when opened externally
      const style = getComputedStyle(document.body);
      const getVar = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
      
      const theme = {
        '--bg-primary': getVar('--bg-primary', '#ffffff'),
        '--bg-secondary': getVar('--bg-secondary', '#f8fafc'),
        '--bg-canvas': getVar('--bg-canvas', '#f1f5f9'),
        '--text-primary': getVar('--text-primary', '#0f172a'),
        '--text-secondary': getVar('--text-secondary', '#475569'),
        '--text-muted': getVar('--text-muted', '#94a3b8'),
        '--accent-blue': getVar('--accent-blue', '#3b82f6'),
        '--accent-red': getVar('--accent-red', '#ef4444'),
        '--border-default': getVar('--border-default', '#e2e8f0'),
      };
      
      svg.style.backgroundColor = theme['--bg-canvas'];
      
      let svgData = new XMLSerializer().serializeToString(svg);
      
      // Replace all variable occurrences with their computed hex/rgb values
      Object.entries(theme).forEach(([key, val]) => {
        const regex = new RegExp(`var\\(${key}\\)`, 'g');
        svgData = svgData.replace(regex, val);
      });

      const preamble = '<?xml version="1.0" standalone="no"?>\r\n';
      const svgBlob = new Blob([preamble + svgData], { type: 'image/svg+xml;charset=utf-8' });
      
      // Sanitize filename: replace illegal characters and spaces with underscores
      const safeName = (et?.name || 'export')
        .replace(/[/\\?%*:|"<>]/g, '-')
        .replace(/\s+/g, '_');
      const filename = `${safeName}.svg`;

      // Try using File System Access API first (allows folder selection/Save As dialog)
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: 'SVG Image',
              accept: { 'image/svg+xml': ['.svg'] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(svgBlob);
          await writable.close();
          return; // Success
        } catch (err: any) {
          if (err.name === 'AbortError') return; // User cancelled
          console.warn('showSaveFilePicker failed, falling back to traditional download', err);
        }
      }

      // Fallback: Traditional download link
      const url = URL.createObjectURL(svgBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      a.click();
      
      console.log(`Download triggered (fallback): ${filename}`);
      
      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        URL.revokeObjectURL(url);
      }, 30000);
      
      alert(`書き出しを開始しました: ${filename}\nダウンロードフォルダを確認してください。`);
    } catch (err) {
      console.error('Failed to export SVG:', err);
      alert('SVGの書き出しに失敗しました。詳細: ' + err);
    }
  };

  const getY = (index: number) => HEADER_HEIGHT + 20 + index * ROW_HEIGHT + ROW_HEIGHT / 2;
  const getColStartX = (colIndex: number) => colIndex === -1 ? 0 : INIT_EVENT_COL_WIDTH + colIndex * COL_WIDTH;
  const getColCenterX = (colIndex: number) => getColStartX(colIndex) + COL_WIDTH / 2;

  const handleLineClick = (e: React.MouseEvent, sequenceId: string, feId: string, hasBranch: boolean) => {
    e.stopPropagation();
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, sequenceId, feId, hasBranch });
  };

  const linesToDraw: React.ReactNode[] = [];
  const interactiveAreas: React.ReactNode[] = [];

  if (et && sequences.length > 0) {
    for (let c = 0; c <= feList.length; c++) {
      const isLastCol = c === feList.length;
      const currentFe = feList[c];
      const paths = new Map<string, number[]>();
      
      sequences.forEach((s, idx) => {
        const prefix = s.path.filter((p: any) => feList.slice(0, c).some(f => f.id === p.functionalEventId));
        const key = prefix.map((p: any) => `${p.functionalEventId}:${p.branchId}`).join('|');
        if (!paths.has(key)) paths.set(key, []);
        paths.get(key)!.push(idx);
      });

      paths.forEach((seqIndices, prefixKey) => {
        const topSeqIndex = seqIndices[0];
        const topY = getY(topSeqIndex);
        const startX = c === 0 ? 0 : getColCenterX(c - 1);
        const endX = isLastCol ? INIT_EVENT_COL_WIDTH + feList.length * COL_WIDTH : getColCenterX(c);

        const lineKey = `line-${c}-${prefixKey}`;
        const isHovered = hoveredLineKey === lineKey;

        // Draw Glow Underneath
        if (isHovered) {
          const glowStartX = getColStartX(c);
          const glowEndX = glowStartX + (isLastCol ? END_STATE_COL_WIDTH : COL_WIDTH);
          
          linesToDraw.push(
            <line key={`${lineKey}-glow`} x1={glowStartX} y1={topY} x2={glowEndX} y2={topY} stroke="var(--accent-blue)" strokeWidth="12" strokeOpacity="0.2" strokeLinecap="round" style={{ transition: 'all 0.2s' }} />
          );
          linesToDraw.push(
            <line key={`${lineKey}-glow2`} x1={glowStartX} y1={topY} x2={glowEndX} y2={topY} stroke="var(--accent-blue)" strokeWidth="8" strokeOpacity="0.3" strokeLinecap="round" style={{ transition: 'all 0.2s' }} />
          );
        }

        linesToDraw.push(
          <line 
            key={lineKey} 
            x1={startX} y1={topY} x2={endX} y2={topY} 
            stroke={isHovered ? 'var(--accent-blue)' : 'var(--text-primary)'} 
            strokeWidth={isHovered ? 3 : 2}
            style={{ transition: 'all 0.2s' }}
          />
        );

        if (!isLastCol && currentFe) {
          const subgroups = new Map<string, number[]>();
          seqIndices.forEach(idx => {
            const seq = sequences[idx];
            const d = seq.path.find((p: any) => p.functionalEventId === currentFe.id);
            const bId = d ? d.branchId : 'bypass';
            if (!subgroups.has(bId)) subgroups.set(bId, []);
            subgroups.get(bId)!.push(idx);
          });

          if (subgroups.size > 1 || (subgroups.size === 1 && !subgroups.has('bypass'))) {
            const yPositions = Array.from(subgroups.values()).map(indices => getY(indices[0]));
            const vLineKey = `v-${c}-${prefixKey}`;
            
            if (isHovered) {
              linesToDraw.push(
                <line key={`${vLineKey}-glow`} x1={endX} y1={Math.min(...yPositions)} x2={endX} y2={Math.max(...yPositions)} stroke="var(--accent-blue)" strokeWidth="12" strokeOpacity="0.2" strokeLinecap="round" />
              );
            }

            linesToDraw.push(
              <line 
                key={vLineKey} 
                x1={endX} y1={Math.min(...yPositions)} x2={endX} y2={Math.max(...yPositions)} 
                stroke={isHovered ? 'var(--accent-blue)' : 'var(--text-primary)'} 
                strokeWidth={isHovered ? 3 : 2} 
              />
            );

            subgroups.forEach((subIndices, bId) => {
              const subTopY = getY(subIndices[0]);
              const subLineKey = `h-out-${c}-${prefixKey}-${bId}`;
              const isSubHovered = hoveredLineKey === subLineKey;

              if (isSubHovered) {
                linesToDraw.push(
                  <line key={`${subLineKey}-glow`} x1={endX} y1={subTopY} x2={getColStartX(c + 1)} y2={subTopY} stroke="var(--accent-blue)" strokeWidth="12" strokeOpacity="0.2" strokeLinecap="round" />
                );
              }

              linesToDraw.push(
                <line 
                  key={subLineKey} 
                  x1={endX} y1={subTopY} x2={getColStartX(c + 1)} y2={subTopY} 
                  stroke={isSubHovered ? 'var(--accent-blue)' : 'var(--text-primary)'} 
                  strokeWidth={isSubHovered ? 3 : 2} 
                />
              );
              
              const branch = currentFe.branches.find(b => b.id === bId);
              const label = branch ? branch.label : (bId === 'bypass' ? '' : bId);
              if (label) {
                linesToDraw.push(<text key={`label-${subLineKey}`} x={endX + 5} y={subTopY - 5} fontSize="10px" fill="var(--text-secondary)" style={{ pointerEvents: 'none' }}>{label}</text>);
              }

              interactiveAreas.push(
                <rect 
                  key={`ia-${subLineKey}`} x={getColStartX(c)} y={subTopY - 15} width={COL_WIDTH} height={30} fill="transparent" cursor="pointer" 
                  onMouseEnter={() => {
                    setHoveredLineKey(subLineKey);
                    if (currentFe) setHoveredHeader(currentFe.id);
                  }}
                  onMouseLeave={() => {
                    setHoveredLineKey(null);
                    setHoveredHeader(null);
                  }}
                  onClick={(e) => { onNodeSelect(currentFe.id, 'functionalEvent'); handleLineClick(e, sequences[subIndices[0]].id, currentFe.id, true); }}
                  onContextMenu={(e) => { onNodeSelect(currentFe.id, 'functionalEvent'); handleLineClick(e, sequences[subIndices[0]].id, currentFe.id, true); }}
                />
              );
            });
          } else {
            interactiveAreas.push(
              <rect 
                key={`ia-${lineKey}`} x={getColStartX(c)} y={topY - 15} width={COL_WIDTH} height={30} fill="transparent" cursor="pointer" 
                onMouseEnter={() => {
                  setHoveredLineKey(lineKey);
                  if (currentFe) setHoveredHeader(currentFe.id);
                  else if (c === 0) setHoveredHeader('init');
                }}
                onMouseLeave={() => {
                  setHoveredLineKey(null);
                  setHoveredHeader(null);
                }}
                onClick={(e) => { onNodeSelect(currentFe.id, 'functionalEvent'); handleLineClick(e, sequences[topSeqIndex].id, currentFe.id, false); }}
                onContextMenu={(e) => { onNodeSelect(currentFe.id, 'functionalEvent'); handleLineClick(e, sequences[topSeqIndex].id, currentFe.id, false); }}
              />
            );
          }
        }
      });
    }
  }

  return (
    <div ref={containerRef} className="event-tree-canvas" style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', cursor: isDragging ? 'grabbing' : 'default' }} onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <svg 
        ref={svgRef}
        width="100%" 
        height="100%" 
        style={{ display: 'block', background: 'var(--bg-canvas)' }}
      >
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          <rect x={0} y={0} width={totalWidth} height={HEADER_HEIGHT} fill="var(--bg-secondary)" />
          
          {feList.map((fe, i) => (
            <g 
              key={fe.id} 
              onClick={(e) => { 
                e.stopPropagation(); 
                onNodeSelect(fe.id, 'functionalEvent'); 
                setHeaderContextMenu({ x: e.clientX, y: e.clientY, index: i + 1, feId: fe.id });
              }}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setHeaderContextMenu({ x: e.clientX, y: e.clientY, index: i + 1, feId: fe.id }); }}
              onMouseEnter={() => setHoveredHeader(fe.id)}
              onMouseLeave={() => setHoveredHeader(null)}
              style={{ cursor: 'pointer' }}
            >
              {hoveredHeader === fe.id && (
                <rect x={getColStartX(i) - 5} y={-5} width={COL_WIDTH + 10} height={HEADER_HEIGHT + 10} fill="var(--accent-blue)" opacity="0.1" rx="8" style={{ transition: 'all 0.2s' }} />
              )}
              <rect 
                x={getColStartX(i)} y={0} width={COL_WIDTH} height={HEADER_HEIGHT} 
                fill={hoveredHeader === fe.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent'} 
                style={{ transition: 'all 0.2s' }}
              />
              <rect x={getColStartX(i)} y={0} width={COL_WIDTH} height={HEADER_HEIGHT} fill="none" stroke={hoveredHeader === fe.id ? 'var(--accent-blue)' : 'var(--border-default)'} strokeWidth={hoveredHeader === fe.id ? 2 : 1} />
              <text x={getColStartX(i) + COL_WIDTH / 2} y={HEADER_HEIGHT / 2 + 5} textAnchor="middle" fill="var(--text-primary)" style={{ fontWeight: 600, fontSize: '12px' }}>{fe.name}</text>
              
              {fe.linkedFaultTreeId && (
                <g 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onJumpToFT && fe.linkedFaultTreeId) onJumpToFT(fe.linkedFaultTreeId);
                  }}
                  style={{ cursor: 'alias' }}
                >
                  <rect x={getColStartX(i) + COL_WIDTH - 25} y={HEADER_HEIGHT - 22} width={22} height={18} rx={4} fill="var(--accent-blue)" opacity={0.15} />
                  <text x={getColStartX(i) + COL_WIDTH - 14} y={HEADER_HEIGHT - 9} textAnchor="middle" fill="var(--accent-blue)" style={{ fontSize: '10px', fontWeight: 700 }}>FT</text>
                </g>
              )}
            </g>
          ))}

          <g 
            onClick={(e) => { 
              e.stopPropagation(); 
              if (et?.initiatingEventId) {
                onNodeSelect(et.initiatingEventId, 'initiatingEvent');
                setHeaderContextMenu({ x: e.clientX, y: e.clientY, index: 0 });
              }
            }}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setHeaderContextMenu({ x: e.clientX, y: e.clientY, index: 0 }); }}
            onMouseEnter={() => setHoveredHeader('init')}
            onMouseLeave={() => setHoveredHeader(null)}
            style={{ cursor: 'pointer' }}
          >
            {hoveredHeader === 'init' && (
              <rect x={-5} y={-5} width={INIT_EVENT_COL_WIDTH + 10} height={HEADER_HEIGHT + 10} fill="var(--accent-blue)" opacity="0.1" rx="8" style={{ transition: 'all 0.2s' }} />
            )}
            <rect 
              x={0} y={0} width={INIT_EVENT_COL_WIDTH} height={HEADER_HEIGHT} 
              fill={hoveredHeader === 'init' ? 'rgba(59, 130, 246, 0.1)' : 'transparent'} 
              style={{ transition: 'all 0.2s' }} 
            />
            <rect x={0} y={0} width={INIT_EVENT_COL_WIDTH} height={HEADER_HEIGHT} fill="none" stroke={hoveredHeader === 'init' ? 'var(--accent-blue)' : 'var(--border-default)'} strokeWidth={hoveredHeader === 'init' ? 2 : 1} />
            <text x={INIT_EVENT_COL_WIDTH / 2} y={HEADER_HEIGHT / 2 + 5} textAnchor="middle" fill="var(--accent-green)" style={{ fontWeight: 600, fontSize: '11px' }}>INIT EVENT</text>

            {et?.initiatingEventId && (
              (() => {
                const ie = model.initiatingEvents?.find(x => x.id === et.initiatingEventId);
                if (ie?.linkedFaultTreeId) {
                  return (
                    <g 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onJumpToFT && ie.linkedFaultTreeId) onJumpToFT(ie.linkedFaultTreeId);
                      }}
                      style={{ cursor: 'alias' }}
                    >
                      <rect x={INIT_EVENT_COL_WIDTH - 25} y={HEADER_HEIGHT - 22} width={22} height={18} rx={4} fill="var(--accent-blue)" opacity={0.15} />
                      <text x={INIT_EVENT_COL_WIDTH - 14} y={HEADER_HEIGHT - 9} textAnchor="middle" fill="var(--accent-blue)" style={{ fontSize: '10px', fontWeight: 700 }}>FT</text>
                    </g>
                  );
                }
                return null;
              })()
            )}
          </g>

          <rect x={INIT_EVENT_COL_WIDTH + feList.length * COL_WIDTH} y={0} width={END_STATE_COL_WIDTH} height={HEADER_HEIGHT} fill="none" stroke="var(--border-default)" />
          <text x={INIT_EVENT_COL_WIDTH + feList.length * COL_WIDTH + END_STATE_COL_WIDTH / 2} y={HEADER_HEIGHT / 2 + 5} textAnchor="middle" fill="var(--text-primary)" style={{ fontWeight: 600, fontSize: '12px' }}>
            {locale === 'ja' ? '終状態' : 'END STATE'}
          </text>

          {linesToDraw}
          {interactiveAreas}

          {sequences.map((seq, i) => {
            const es = model.endStates.find(e => e.id === seq.endStateId);
            const isHovered = hoveredHeader === `seq-${seq.id}`;
            const transferET = seq.transferETId ? model.eventTrees?.find(t => t.id === seq.transferETId) : null;

            return (
              <g 
                key={`es-label-${seq.id}`} 
                transform={`translate(${INIT_EVENT_COL_WIDTH + feList.length * COL_WIDTH}, ${getY(i) - 15})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onNodeSelect(seq.id, 'sequence');
                }}
                onMouseEnter={() => setHoveredHeader(`seq-${seq.id}`)}
                onMouseLeave={() => setHoveredHeader(null)}
                style={{ cursor: 'pointer' }}
              >
                {isHovered && (
                  <rect x={-5} y={-5} width={END_STATE_COL_WIDTH + (transferET ? 120 : 0) + 10} height={40} fill="var(--accent-blue)" opacity="0.1" rx="8" />
                )}
                <rect width={END_STATE_COL_WIDTH} height={30} fill={es?.color || 'var(--bg-secondary)'} rx="4" opacity="0.2" stroke={isHovered ? 'var(--accent-blue)' : 'none'} strokeWidth="1" />
                <text x={10} y={20} fontSize="11px" fill="var(--text-primary)" style={{ fontWeight: isHovered ? 600 : 400 }}>{es?.name || 'Undefined'}</text>
                <text x={totalWidth - (INIT_EVENT_COL_WIDTH + feList.length * COL_WIDTH) - SEQ_ID_COL_WIDTH - 10} y={20} textAnchor="end" fontSize="10px" fill="var(--text-muted)">{seq.name}</text>

                {/* Transfer Indicator */}
                {transferET && (
                  <g 
                    transform={`translate(${END_STATE_COL_WIDTH + 10}, 0)`}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectEventTree(transferET.id);
                    }}
                  >
                    <rect width={100} height={30} rx="15" fill="var(--accent-blue)" opacity="0.1" stroke="var(--accent-blue)" strokeWidth="1" />
                    <text x={10} y={20} fontSize="10px" fill="var(--accent-blue)" style={{ fontWeight: 600 }}>➡ {transferET.name}</text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <div style={{ position: 'absolute', bottom: 20, left: 20, display: 'flex', gap: 4, padding: 4, background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 10 }}>
        <button className="btn btn--ghost btn--sm" onClick={() => setTransform(t => ({ ...t, scale: Math.max(t.scale - 0.1, 0.1) }))} title={locale === 'ja' ? 'ズームアウト' : 'Zoom Out'}>−</button>
        <div style={{ width: 45, textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{Math.round(transform.scale * 100)}%</div>
        <button className="btn btn--ghost btn--sm" onClick={() => setTransform(t => ({ ...t, scale: Math.min(t.scale + 0.1, 2) }))} title={locale === 'ja' ? 'ズームイン' : 'Zoom In'}>+</button>
        <button className="btn btn--ghost btn--sm" onClick={() => setTransform({ scale: 1, x: 0, y: 0 })} title={locale === 'ja' ? '100%にリセット' : 'Reset to 100%'}>Reset</button>
        <button className="btn btn--ghost btn--sm" onClick={handleFitView} style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }} title={locale === 'ja' ? '全体表示' : 'Fit to Screen'}>Fit</button>
      </div>

      <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 8, zIndex: 10 }}>
        <button 
          className="btn btn--primary btn--sm" 
          onClick={async () => {
            if (!selectedEventTreeId) return;
            setComputing(true);
            try {
              const result = await runWorkerCommand<any>('QUANTIFY_ET', { model, targetId: selectedEventTreeId });
              setResult(selectedEventTreeId, result);
              if (onQuantifySuccess) onQuantifySuccess();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'ET Quantification failed');
            } finally {
              setComputing(false);
            }
          }}
          style={{ 
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            padding: '6px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 600
          }}
        >
          <span style={{ fontSize: '14px' }}>⚛</span>
          {locale === 'ja' ? '定量化実行' : 'Quantify'}
        </button>
        <button 
          className="btn btn--secondary btn--sm" 
          onClick={handleExportImage}
          title={locale === 'ja' ? 'SVGとして保存' : 'Save as SVG'}
          style={{ 
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          📸 {locale === 'ja' ? 'SVGとして保存' : 'Save as SVG'}
        </button>
      </div>



      {headerContextMenu && (
        <div className="context-menu" style={{ position: 'fixed', left: headerContextMenu.x, top: headerContextMenu.y, zIndex: 1000 }} onClick={(e) => e.stopPropagation()}>
          <button className="context-menu__item" onClick={() => { onHeaderAddRequest(headerContextMenu.index); setHeaderContextMenu(null); }}>➕ {locale === 'ja' ? '右側にヘッダーを挿入' : 'Insert Header to the Right'}</button>
          
          {headerContextMenu.feId && (
            <>
              <div className="context-menu__divider" />
              <button 
                className="context-menu__item" 
                style={{ color: 'var(--accent-red)' }}
                onClick={() => {
                  if (selectedEventTreeId && headerContextMenu.feId) {
                    removeFunctionalEvent(selectedEventTreeId, headerContextMenu.feId);
                  }
                  setHeaderContextMenu(null);
                }}
              >
                🗑 {locale === 'ja' ? 'このヘッダーを削除' : 'Delete This Header'}
              </button>
            </>
          )}

          <div className="context-menu__divider" />
          <button className="context-menu__item" onClick={() => setHeaderContextMenu(null)}>{locale === 'ja' ? 'キャンセル' : 'Cancel'}</button>
        </div>
      )}
      {headerContextMenu && <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} onClick={() => setHeaderContextMenu(null)} />}

      {contextMenu && (
        <div className="context-menu" style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 1000 }} onClick={(e) => e.stopPropagation()}>
          {contextMenu.hasBranch ? (
            <button className="context-menu__item" onClick={() => { unbranchSequence(selectedEventTreeId!, contextMenu.sequenceId, contextMenu.feId); setContextMenu(null); }}>✖ {locale === 'ja' ? '分岐を解除 (Bypass)' : 'Bypass'}</button>
          ) : (
            <button className="context-menu__item" onClick={() => { branchSequence(selectedEventTreeId!, contextMenu.sequenceId, contextMenu.feId); setContextMenu(null); }}>➕ {locale === 'ja' ? 'ここで分岐する' : 'Branch Here'}</button>
          )}
          <div className="context-menu__divider" />
          <button className="context-menu__item" onClick={() => setContextMenu(null)}>{locale === 'ja' ? 'キャンセル' : 'Cancel'}</button>
        </div>
      )}
      {contextMenu && <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} onClick={() => setContextMenu(null)} />}
    </div>
  );
}
