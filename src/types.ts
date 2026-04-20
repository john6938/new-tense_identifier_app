// Shared type for a detected finite verb phrase.
// Both the compromise.js analyser and the future SpaCy API return this shape.
export interface VerbPhrase {
  text: string;            // original text of the verb phrase (for display)
  start: number;           // character offset in the full input text
  end: number;             // character offset (exclusive)
  category: 'tensed' | 'modalised' | 'semi-modalised';
  label: string;           // e.g. "present perfect passive", "must + perfect active"
  fullDescription: string; // e.g. "Time: present | Aspect: perfect | Voice: passive"
}
