import { createTextEditor, type TextEditor } from '@lp-labs/headless-editor';

const editor: TextEditor = createTextEditor('text');
const undoable: boolean = editor.snapshot().canUndo;
void undoable;
