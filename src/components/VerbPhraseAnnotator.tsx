import { useState, useEffect, useRef } from 'react';
import type { VerbPhrase } from '../types';
import { analyzeVerbPhrases } from './VerbPhraseAnalyzer';

interface Props {
  text: string;
}

interface Segment {
  type: 'text' | 'verb';
  content: string;
  vp?: VerbPhrase;
}

interface TooltipPos {
  x: number;
  y: number;
  above: boolean;
}

// ─── Colour scheme ────────────────────────────────────────────────────────────
const CATEGORY_STYLE: Record<VerbPhrase['category'], string> = {
  tensed:          'bg-blue-100   text-blue-900   border-b-2 border-blue-500',
  modalised:       'bg-orange-100 text-orange-900 border-b-2 border-orange-500',
  'semi-modalised':'bg-purple-100 text-purple-900 border-b-2 border-purple-500',
};

const CATEGORY_NAME: Record<VerbPhrase['category'], string> = {
  tensed:          'Tensed Verb Phrase',
  modalised:       'Modalised Verb Phrase',
  'semi-modalised':'Semi-Modalised Verb Phrase',
};

const TOOLTIP_COLOR: Record<VerbPhrase['category'], string> = {
  tensed:          'text-blue-300',
  modalised:       'text-orange-300',
  'semi-modalised':'text-purple-300',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function VerbPhraseAnnotator({ text }: Props) {
  const [verbPhrases, setVerbPhrases] = useState<VerbPhrase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<VerbPhrase | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPos | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Async-ready: works for both local (compromise) and SpaCy API calls
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setSelected(null);
    analyzeVerbPhrases(text)
      .then(vps => {
        setVerbPhrases(vps);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Analysis failed. Please check the text and try again.');
        setIsLoading(false);
      });
  }, [text]);

  // Build text segments: interleaved plain text and annotated VP spans
  const segments: Segment[] = [];
  if (verbPhrases.length > 0) {
    let last = 0;
    for (const vp of verbPhrases) {
      if (vp.start > last) segments.push({ type: 'text', content: text.slice(last, vp.start) });
      segments.push({ type: 'verb', content: vp.text, vp });
      last = vp.end;
    }
    if (last < text.length) segments.push({ type: 'text', content: text.slice(last) });
  }

  const handleSpanInteraction = (e: React.MouseEvent | React.TouchEvent, vp: VerbPhrase) => {
    e.preventDefault();
    e.stopPropagation();
    if (selected === vp) {
      setSelected(null);
      setTooltipPos(null);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const above = rect.top > 120; // enough room above?
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: above ? rect.top - 8 : rect.bottom + 8,
      above,
    });
    setSelected(vp);
  };

  const dismiss = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelected(null);
      setTooltipPos(null);
    }
  };

  // ── Loading / error states ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 gap-2">
        <span className="animate-spin inline-block w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full" />
        Analysing…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500 text-sm">
        {error}
      </div>
    );
  }

  // ── Annotated output ────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative h-full" onClick={dismiss}>
      <div className="text-base leading-loose font-serif whitespace-pre-wrap select-text">
        {segments.map((seg, idx) =>
          seg.type === 'text' ? (
            <span key={idx}>{seg.content}</span>
          ) : (
            <span
              key={idx}
              className={`${CATEGORY_STYLE[seg.vp!.category]} cursor-pointer rounded px-0.5 font-medium transition-all ${
                selected === seg.vp ? 'ring-2 ring-offset-1 ring-gray-500' : ''
              }`}
              onClick={e => handleSpanInteraction(e, seg.vp!)}
              onTouchEnd={e => handleSpanInteraction(e, seg.vp!)}
              role="button"
              aria-label={seg.vp!.label}
            >
              {seg.content}
            </span>
          )
        )}
      </div>

      {/* Tooltip — fixed position, above or below the span */}
      {selected && tooltipPos && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.above ? tooltipPos.y : tooltipPos.y}px`,
            transform: tooltipPos.above
              ? 'translate(-50%, -100%)'
              : 'translate(-50%, 0)',
          }}
        >
          <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl max-w-xs text-left">
            <p className="text-xs font-semibold text-gray-400 mb-0.5 uppercase tracking-wide">
              {CATEGORY_NAME[selected.category]}
            </p>
            <p className={`text-sm font-semibold ${TOOLTIP_COLOR[selected.category]} mb-1`}>
              {selected.label}
            </p>
            <p className="text-xs text-gray-300">{selected.fullDescription}</p>
            {/* Arrow */}
            <div
              className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-transparent ${
                tooltipPos.above
                  ? 'bottom-0 translate-y-full border-t-8 border-t-gray-900'
                  : 'top-0 -translate-y-full border-b-8 border-b-gray-900'
              }`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
