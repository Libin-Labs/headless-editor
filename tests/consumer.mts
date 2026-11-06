import {
  createTextEditor,
  type EditorSnapshot,
  type TextTransaction,
} from '@lp-labs/headless-editor';

const edit: TextTransaction = { from: 0, to: 0, insert: 'hi' };
const snapshot: EditorSnapshot = createTextEditor().apply(edit);
const text: string = snapshot.text;
void text;
