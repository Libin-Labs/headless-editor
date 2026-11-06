import test from 'node:test';
import assert from 'node:assert/strict';
import { createTextEditor } from '../dist/esm/index.js';

test('transactions, selections, undo, redo, and revision snapshots', () => {
  const editor = createTextEditor('Hello');
  editor.setSelection(5);
  const applied = editor.apply({ from: 5, to: 5, insert: ' world' });
  assert.equal(applied.text, 'Hello world');
  assert.deepEqual(applied.selection, { anchor: 11, head: 11 });
  assert.equal(editor.undo().text, 'Hello');
  assert.equal(editor.redo().text, 'Hello world');
  assert.equal(editor.snapshot().revision, 3);
});

test('batch edits are sequential and form a single undo step', () => {
  const editor = createTextEditor('alpha');
  const result = editor.applyBatch([
    { from: 5, to: 5, insert: ' ' },
    { from: 6, to: 6, insert: 'beta' },
  ]);
  assert.equal(result.text, 'alpha beta');
  assert.equal(editor.undo().text, 'alpha');
  assert.equal(editor.redo().text, 'alpha beta');
});

test('invalid batch is atomic and failed edits preserve history and selection', () => {
  const editor = createTextEditor('abc');
  editor.apply({ from: 3, to: 3, insert: 'd' });
  const before = editor.snapshot();
  assert.throws(
    () =>
      editor.applyBatch([
        { from: 0, to: 0, insert: 'x' },
        { from: 20, to: 20, insert: 'y' },
      ]),
    RangeError,
  );
  assert.deepEqual(editor.snapshot(), before);
  assert.equal(editor.undo().text, 'abc');
});

test('offsets respect UTF-16 surrogate boundaries and history/length are bounded', () => {
  const editor = createTextEditor('A😀B', { maxLength: 6, maxHistory: 1 });
  assert.throws(() => editor.setSelection(2), RangeError);
  assert.throws(() => editor.apply({ from: 2, to: 2, insert: 'x' }), RangeError);
  editor.apply({ from: 0, to: 0, insert: 'x' });
  editor.apply({ from: 0, to: 0, insert: 'y' });
  assert.equal(editor.undo().text, 'xA😀B');
  assert.equal(editor.snapshot().canUndo, false);
  assert.throws(() => createTextEditor('long', { maxLength: 2 }), RangeError);
});

test('clearHistory drops undo/redo without changing document', () => {
  const editor = createTextEditor('a');
  editor.apply({ from: 1, to: 1, insert: 'b' });
  editor.clearHistory();
  assert.equal(editor.snapshot().text, 'ab');
  assert.equal(editor.snapshot().canUndo, false);
  assert.equal(editor.undo().text, 'ab');
});
