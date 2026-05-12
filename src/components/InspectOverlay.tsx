import React, { useState, useEffect, useCallback } from 'react';

interface ElementInfo {
  tagName: string;
  className: string;
  id: string;
  textContent: string;
  iconName: string;
  rect: DOMRect;
  outerHTML: string;
}

const InspectOverlay: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [hoveredInfo, setHoveredInfo] = useState<ElementInfo | null>(null);
  const [selectedInfo, setSelectedInfo] = useState<ElementInfo | null>(null);
  const [copiedMsg, setCopiedMsg] = useState('');

  const getElementInfo = useCallback((el: HTMLElement): ElementInfo => {
    // Try to find icon info
    let iconName = '';
    const svgEl = el.closest('svg') || el.querySelector('svg');
    if (svgEl) {
      // lucide icons have data-lucide or class names
      const parentBtn = svgEl.closest('button') || svgEl.parentElement;
      const lucideClass = svgEl.classList.value;
      iconName = `SVG Icon (${lucideClass || 'unknown'})`;
      if (parentBtn && parentBtn !== (svgEl as unknown as HTMLElement)) {
        const btnText = parentBtn.textContent?.trim().slice(0, 40) || '';
        if (btnText) iconName += ` → "${btnText}"`;
      }
    }
    const ionIcon = el.closest('ion-icon') || el.querySelector('ion-icon');
    if (ionIcon) {
      iconName = `ion-icon: ${ionIcon.getAttribute('name') || 'unknown'}`;
    }

    // Get short outer HTML (first 300 chars)
    let outerHTML = el.outerHTML;
    if (outerHTML.length > 300) outerHTML = outerHTML.slice(0, 300) + '...';

    return {
      tagName: el.tagName.toLowerCase(),
      className: el.className?.toString?.()?.slice(0, 120) || '',
      id: el.id || '',
      textContent: el.textContent?.trim().slice(0, 60) || '',
      iconName,
      rect: el.getBoundingClientRect(),
      outerHTML,
    };
  }, []);

  useEffect(() => {
    if (!isActive) {
      setHoveredInfo(null);
      return;
    }

    const onMouseOver = (e: MouseEvent) => {
      e.stopPropagation();
      const target = e.target as HTMLElement;
      // Ignore our own overlay elements
      if (target.closest('#inspect-overlay-root')) return;
      setHoveredInfo(getElementInfo(target));
    };

    const onClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.target as HTMLElement;
      if (target.closest('#inspect-overlay-root')) return;
      setSelectedInfo(getElementInfo(target));
    };

    document.addEventListener('mouseover', onMouseOver, true);
    document.addEventListener('click', onClick, true);

    return () => {
      document.removeEventListener('mouseover', onMouseOver, true);
      document.removeEventListener('click', onClick, true);
    };
  }, [isActive, getElementInfo]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsg('Copied!');
    setTimeout(() => setCopiedMsg(''), 1500);
  };

  return (
    <div id="inspect-overlay-root" style={{ fontFamily: 'monospace' }}>
      {/* Toggle Button */}
      <button
        onClick={() => {
          setIsActive(!isActive);
          setSelectedInfo(null);
          setHoveredInfo(null);
        }}
        style={{
          position: 'fixed',
          bottom: '80px',
          right: '16px',
          zIndex: 99999,
          background: isActive ? '#ef4444' : '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: '12px',
          padding: '10px 16px',
          fontSize: '12px',
          fontWeight: 900,
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          letterSpacing: '0.5px',
          transition: 'all 0.2s',
        }}
      >
        <span style={{ fontSize: '16px' }}>{isActive ? '✕' : '🔍'}</span>
        {isActive ? 'EXIT INSPECT' : 'INSPECT'}
      </button>

      {/* Hover Highlight Box */}
      {isActive && hoveredInfo && (
        <div
          style={{
            position: 'fixed',
            top: hoveredInfo.rect.top - 2,
            left: hoveredInfo.rect.left - 2,
            width: hoveredInfo.rect.width + 4,
            height: hoveredInfo.rect.height + 4,
            border: '2px solid #3b82f6',
            background: 'rgba(59,130,246,0.08)',
            borderRadius: '4px',
            pointerEvents: 'none',
            zIndex: 99997,
            transition: 'all 0.1s ease',
          }}
        />
      )}

      {/* Hover Tooltip */}
      {isActive && hoveredInfo && (
        <div
          style={{
            position: 'fixed',
            top: Math.min(hoveredInfo.rect.bottom + 8, window.innerHeight - 60),
            left: Math.min(hoveredInfo.rect.left, window.innerWidth - 300),
            zIndex: 99998,
            background: '#1e293b',
            color: '#e2e8f0',
            padding: '6px 10px',
            borderRadius: '8px',
            fontSize: '10px',
            maxWidth: '290px',
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            lineHeight: '1.4',
          }}
        >
          <span style={{ color: '#60a5fa', fontWeight: 700 }}>&lt;{hoveredInfo.tagName}&gt;</span>
          {hoveredInfo.iconName && (
            <span style={{ color: '#fbbf24', marginLeft: '6px' }}>🎨 {hoveredInfo.iconName}</span>
          )}
          {hoveredInfo.textContent && (
            <div style={{ color: '#94a3b8', marginTop: '2px' }}>"{hoveredInfo.textContent}"</div>
          )}
        </div>
      )}

      {/* Selected Element Panel */}
      {selectedInfo && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 99999,
            background: '#0f172a',
            color: '#e2e8f0',
            padding: '16px',
            borderTop: '3px solid #3b82f6',
            maxHeight: '45vh',
            overflowY: 'auto',
            boxShadow: '0 -8px 30px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 900, color: '#60a5fa', letterSpacing: '1px' }}>
              📋 ELEMENT SELECTED
            </span>
            <button
              onClick={() => setSelectedInfo(null)}
              style={{
                background: '#334155',
                color: '#94a3b8',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              ✕ TUTUP
            </button>
          </div>

          <div style={{ display: 'grid', gap: '8px', fontSize: '11px' }}>
            <div>
              <span style={{ color: '#94a3b8' }}>Tag: </span>
              <span style={{ color: '#fbbf24', fontWeight: 700 }}>&lt;{selectedInfo.tagName}&gt;</span>
            </div>

            {selectedInfo.id && (
              <div>
                <span style={{ color: '#94a3b8' }}>ID: </span>
                <span style={{ color: '#34d399' }}>#{selectedInfo.id}</span>
              </div>
            )}

            {selectedInfo.iconName && (
              <div>
                <span style={{ color: '#94a3b8' }}>Icon: </span>
                <span style={{ color: '#f472b6', fontWeight: 700 }}>🎨 {selectedInfo.iconName}</span>
              </div>
            )}

            {selectedInfo.textContent && (
              <div>
                <span style={{ color: '#94a3b8' }}>Text: </span>
                <span style={{ color: '#a78bfa' }}>"{selectedInfo.textContent}"</span>
              </div>
            )}

            {selectedInfo.className && (
              <div>
                <span style={{ color: '#94a3b8' }}>Class: </span>
                <span style={{ color: '#67e8f9', fontSize: '10px', wordBreak: 'break-all' }}>{selectedInfo.className}</span>
              </div>
            )}

            <div style={{ marginTop: '6px', padding: '8px', background: '#1e293b', borderRadius: '6px', fontSize: '10px', wordBreak: 'break-all', color: '#cbd5e1', maxHeight: '100px', overflow: 'auto' }}>
              <div style={{ color: '#64748b', marginBottom: '4px', fontWeight: 700 }}>HTML:</div>
              {selectedInfo.outerHTML}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                onClick={() => {
                  const summary = [
                    `Tag: <${selectedInfo.tagName}>`,
                    selectedInfo.id ? `ID: #${selectedInfo.id}` : '',
                    selectedInfo.iconName ? `Icon: ${selectedInfo.iconName}` : '',
                    selectedInfo.textContent ? `Text: "${selectedInfo.textContent}"` : '',
                    selectedInfo.className ? `Class: ${selectedInfo.className}` : '',
                  ].filter(Boolean).join('\n');
                  handleCopy(summary);
                }}
                style={{
                  flex: 1,
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px',
                  fontSize: '11px',
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                📋 COPY INFO
              </button>
              <button
                onClick={() => handleCopy(selectedInfo.outerHTML)}
                style={{
                  flex: 1,
                  background: '#334155',
                  color: '#e2e8f0',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px',
                  fontSize: '11px',
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                📄 COPY HTML
              </button>
            </div>

            {copiedMsg && (
              <div style={{ textAlign: 'center', color: '#4ade80', fontSize: '11px', fontWeight: 700 }}>
                ✅ {copiedMsg}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InspectOverlay;
