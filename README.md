# @lp-labs/headless-editor

A bounded plain-text document model with UTF-16-safe replacement transactions, atomic batches,
selection offsets, and bounded undo/redo. This deliberately supports plain text only; it is not a
rich-text DOM editor and does not implement browser input, IME composition, rendering, or plugins.
Runtime and peer dependencies: none.

## Install

```bash
npm install @lp-labs/headless-editor
```

Node 18+, strict TypeScript declarations, ESM and CommonJS builds.

## Quickstart

```js
import { createTextEditor } from '@lp-labs/headless-editor';

const editor = createTextEditor('Hello');
editor.apply({ from: 5, to: 5, insert: ' world' });
if (editor.snapshot().text !== 'Hello world') throw new Error('Edit failed');
editor.undo();
if (editor.snapshot().text !== 'Hello') throw new Error('Undo failed');
```

## Public APIs and types

- `createTextEditor(initialText?, options?)` returns `TextEditor`.
- `TextTransaction` replaces UTF-16 range `[from, to)` with `insert`.
- `EditorOptions.maxLength` defaults to 1,000,000 UTF-16 units; `maxHistory` defaults to 100
  historical states.
- `EditorSnapshot` provides a copied `text`, `{ anchor, head }` selection, monotonic `revision`,
  and `canUndo`/`canRedo`.
- `TextEditor` provides `snapshot`, `setSelection`, `apply`, atomic sequential `applyBatch`, `undo`,
  `redo`, and `clearHistory`. The runtime export is `createTextEditor`.

Each successful `apply` or non-empty batch is one undo step. Batch offsets apply sequentially to
the document produced by preceding batch transactions. An edit collapses selection after inserted
text. Undo/redo restore content and selection but revision continues increasing. No-op history
operations leave revision unchanged.

## Customization

Map your application edit command to transactions and keep rendering/input outside the model:

```js
import { createTextEditor } from '@lp-labs/headless-editor';

const editor = createTextEditor('alpha');
editor.setSelection(5);
editor.applyBatch([
  { from: 5, to: 5, insert: ' ' },
  { from: 6, to: 6, insert: 'beta' },
]);
if (editor.snapshot().text !== 'alpha beta') throw new Error('Batch edit failed');
```

## Limits and errors

All offsets are safe integer UTF-16 positions within the current text and may not split a surrogate
pair. Invalid text/transactions throw `TypeError`; out-of-range offsets, history options, or length
limits throw `RangeError`. A batch is fully validated against a private working state before any
document/history/revision update. Batch size is capped at 10,000. `maxHistory: 0` disables undo.

The model has no markup, block schema, collaborative operations, rich-text formatting, DOM
selection, browser keyboard handling, IME composition, or grapheme-cluster indexing. Applications
requiring those features must supply their own document/input adapter and tests.

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
