import { useState, useRef } from 'react';
import { Upload, BookOpen } from 'lucide-react';
import { VerbPhraseAnnotator } from './components/VerbPhraseAnnotator';
import { Legend } from './components/Legend';

const SAMPLE_TEXT =
`The students are studying for their exams. They have been working hard all week. The teacher will review their progress tomorrow. The report was written last year, and it has been reviewed by several experts. The findings will be published soon. The data is being analyzed right now. The results will have been examined by then. The proposal had been considered by the committee.

She can speak three languages fluently. You should listen more carefully. They must have finished by now. The door might have been locked. The issue could have been being discussed when we arrived. He should be being questioned right now. The package might have been being tracked.

We are going to finish the project by Friday. They have to submit their reports today. The building is supposed to be completed next month. Students need to understand the basics. You ought to know better. The system is going to be being tested throughout the week.`;

type Mode = 'input' | 'output';

export default function App() {
  const [mode, setMode]           = useState<Mode>('input');
  const [text, setText]           = useState('');
  const [showLegend, setShowLegend] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'text/plain') return;
    const reader = new FileReader();
    reader.onload = ev => setText(ev.target?.result as string);
    reader.readAsText(file);
  };

  const handleAnalyse = () => { if (text.trim()) setMode('output'); };
  const handleEdit    = () => setMode('input');
  const handleClear   = () => { setText(''); setMode('input'); };

  // ── Input mode ────────────────────────────────────────────────────────────────
  if (mode === 'input') {
    return (
      <div className="min-h-full flex items-start justify-center bg-gray-50 p-3 sm:p-6 overflow-y-auto">
        <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-5 sm:p-8 my-4">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <img
              src={`${import.meta.env.BASE_URL}jb_logo_small.jpg`}
              alt="Tense Identifier"
              className="w-11 h-11 shrink-0 rounded"
            />
            <div>
              <h1 className="text-2xl font-bold leading-tight text-gray-900">
                Tense Identifier
              </h1>
              <p className="text-sm text-gray-500">
                Identify and classify verb phrases in English texts
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2 flex-wrap mb-3">
            <label className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white text-sm rounded-lg cursor-pointer hover:bg-blue-600 transition">
              <Upload size={15} />
              Upload .txt
              <input
                ref={fileRef}
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <button
              onClick={() => { setText(SAMPLE_TEXT); }}
              className="px-3 py-2 bg-purple-100 text-purple-700 text-sm rounded-lg hover:bg-purple-200 transition"
            >
              Load sample
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition"
            >
              Clear
            </button>
          </div>

          {/* Textarea */}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type or paste English text here, upload a .txt file, or click 'Load sample'…"
            rows={10}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none text-base font-serif leading-relaxed"
          />

          {/* Analyse button */}
          <button
            onClick={handleAnalyse}
            disabled={!text.trim()}
            className="mt-3 w-full py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition text-base"
          >
            Analyse Text
          </button>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-100 text-center text-xs text-gray-400">
            <p>John Blake, Aston University. Version 4.0.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Output mode ───────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-gray-50">

      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          <div className="flex items-center gap-3">
            <img
              src={`${import.meta.env.BASE_URL}jb_logo_small.jpg`}
              alt="logo"
              className="w-8 h-8 shrink-0 rounded"
            />
            <span className="font-semibold text-gray-900 text-base hidden sm:block">
              Tense Identifier
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLegend(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition"
            >
              <BookOpen size={15} />
              {showLegend ? 'Hide guide' : 'Show guide'}
            </button>
            <button
              onClick={handleAnalyse}
              className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition"
            >
              Re-analyse
            </button>
            <button
              onClick={handleEdit}
              className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition"
            >
              Edit text
            </button>
          </div>
        </div>
      </header>

      {/* Colour key strip */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 shrink-0">
        <div className="flex items-center gap-4 max-w-screen-xl mx-auto">
          <ColorKey color="bg-blue-100 border-blue-500"   label="Tensed" />
          <ColorKey color="bg-orange-100 border-orange-500" label="Modalised" />
          <ColorKey color="bg-purple-100 border-purple-500" label="Semi-modalised" />
          <span className="ml-auto text-xs text-gray-400 hidden sm:block">
            Click any phrase for its label
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden max-w-screen-xl mx-auto w-full">

        {/* Annotated text workspace */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-auto p-5 sm:p-7">
          <VerbPhraseAnnotator text={text} />
        </div>

        {/* Legend panel */}
        {showLegend && (
          <div className="w-72 shrink-0 hidden md:block">
            <Legend />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 px-4 py-2 text-center text-xs text-gray-400 shrink-0">
        John Blake, Aston University. Version 4.0.
      </footer>
    </div>
  );
}

function ColorKey({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border-b-2 ${color}`}>
        {label}
      </span>
    </div>
  );
}
