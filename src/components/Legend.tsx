import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

type Section = 'tensed' | 'modalised' | 'semi-modalised';

export function Legend() {
  const [open, setOpen] = useState<Section | null>('tensed');
  const toggle = (s: Section) => setOpen(open === s ? null : s);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 bg-blue-50 border-b border-gray-200 shrink-0">
        <h2 className="font-semibold text-gray-900 text-sm">Classification Guide</h2>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">

        {/* Tensed */}
        <AccordionSection
          id="tensed"
          title="Tensed Verb Phrases"
          color="blue"
          isOpen={open === 'tensed'}
          onToggle={() => toggle('tensed')}
        >
          <Note>12-category system: time × aspect × voice</Note>
          <Group title="Present">
            <Row label="present simple active" ex="walks, writes" />
            <Row label="present progressive active" ex="is walking" />
            <Row label="present perfect active" ex="has walked" />
            <Row label="present perfect progressive active" ex="has been walking" />
            <Row label="present simple passive" ex="is seen, are taken" />
            <Row label="present progressive passive" ex="is being watched" />
            <Row label="present perfect passive" ex="has been taken" />
          </Group>
          <Group title="Past">
            <Row label="past simple active" ex="walked, saw" />
            <Row label="past progressive active" ex="was walking" />
            <Row label="past perfect active" ex="had walked" />
            <Row label="past perfect progressive active" ex="had been walking" />
            <Row label="past simple passive" ex="was seen" />
            <Row label="past progressive passive" ex="was being watched" />
            <Row label="past perfect passive" ex="had been taken" />
          </Group>
          <Group title='Future (with "will")'>
            <Row label="future simple active" ex="will walk" />
            <Row label="future progressive active" ex="will be walking" />
            <Row label="future perfect active" ex="will have walked" />
            <Row label="future perfect progressive active" ex="will have been walking" />
            <Row label="future simple passive" ex="will be seen" />
            <Row label="future progressive passive" ex="will be being watched" />
            <Row label="future perfect passive" ex="will have been taken" />
            <Row label="future perfect progressive passive" ex="will have been being taken" />
          </Group>
        </AccordionSection>

        {/* Modalised */}
        <AccordionSection
          id="modalised"
          title="Modalised Verb Phrases"
          color="orange"
          isOpen={open === 'modalised'}
          onToggle={() => toggle('modalised')}
        >
          <Note>can · could · may · might · must · shall · should · would</Note>
          <Row label="modal + base form active" ex="can walk, must go" />
          <Row label="modal + progressive active" ex="should be working" />
          <Row label="modal + perfect active" ex="could have seen" />
          <Row label="modal + perfect progressive active" ex="should have been working" />
          <Row label="modal + base form passive" ex="can be seen" />
          <Row label="modal + progressive passive" ex="should be being questioned" />
          <Row label="modal + perfect passive" ex="might have been seen" />
          <Row label="modal + perfect progressive passive" ex="might have been being monitored" />
        </AccordionSection>

        {/* Semi-modalised */}
        <AccordionSection
          id="semi-modalised"
          title="Semi-Modalised Verb Phrases"
          color="purple"
          isOpen={open === 'semi-modalised'}
          onToggle={() => toggle('semi-modalised')}
        >
          <Note>have to · need to · ought to · be able to · be supposed to · be going to</Note>
          <Row label="have to + base form active" ex="have to leave, has to go" />
          <Row label="be going to + base form active" ex="is going to see" />
          <Row label="be going to + passive" ex="is going to be taken" />
          <Row label="be going to + progressive passive" ex="is going to be being examined" />
          <Row label="be supposed to + passive" ex="is supposed to be reviewed" />
          <Row label="ought to + perfect passive" ex="ought to have been completed" />
          <Note italic>
            "be going to" is a semi-modal, not part of the future tense system
          </Note>
        </AccordionSection>

        {/* How to use */}
        <div className="p-3 bg-gray-50 shrink-0">
          <p className="text-xs font-semibold text-gray-700 mb-1.5">How to use</p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Type or upload a .txt file, then click <strong>Analyse</strong></li>
            <li>• Click any coloured phrase to see its label</li>
            <li>• Click <strong>Edit Text</strong> to revise and re-run</li>
          </ul>
        </div>

      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const BG: Record<string, { header: string; body: string; dot: string }> = {
  blue:   { header: 'bg-blue-50 hover:bg-blue-100',   body: 'bg-blue-50/40',   dot: 'bg-blue-500' },
  orange: { header: 'bg-orange-50 hover:bg-orange-100', body: 'bg-orange-50/40', dot: 'bg-orange-500' },
  purple: { header: 'bg-purple-50 hover:bg-purple-100', body: 'bg-purple-50/40', dot: 'bg-purple-500' },
};

function AccordionSection({
  title, color, isOpen, onToggle, children,
}: {
  title: string;
  color: string;
  isOpen: boolean;
  onToggle: () => void;
  id: string;
  children: React.ReactNode;
}) {
  const c = BG[color];
  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-4 py-2.5 ${c.header} transition-colors`}
      >
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded ${c.dot} shrink-0`} />
          <span className="text-xs font-semibold text-gray-900 text-left">{title}</span>
        </div>
        {isOpen
          ? <ChevronUp className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          : <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />}
      </button>
      {isOpen && (
        <div className={`px-3 py-2 space-y-1 ${c.body}`}>{children}</div>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-1.5">
      <p className="text-xs font-semibold text-gray-600 mb-0.5">{title}</p>
      <div className="pl-2 space-y-0.5">{children}</div>
    </div>
  );
}

function Row({ label, ex }: { label: string; ex: string }) {
  return (
    <div className="text-xs text-gray-700 leading-relaxed">
      <span className="font-medium">{label}:</span>{' '}
      <span className="text-gray-500 italic">{ex}</span>
    </div>
  );
}

function Note({ children, italic }: { children: React.ReactNode; italic?: boolean }) {
  return (
    <p className={`text-xs text-gray-500 mb-1 ${italic ? 'italic' : ''}`}>{children}</p>
  );
}
