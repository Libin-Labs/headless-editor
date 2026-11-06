export interface TextTransaction {
  from: number;
  to: number;
  insert: string;
}

export interface EditorSnapshot {
  text: string;
  selection: { anchor: number; head: number };
  revision: number;
  canUndo: boolean;
  canRedo: boolean;
}

export interface EditorOptions {
  maxLength?: number;
  maxHistory?: number;
}

export interface TextEditor {
  snapshot(): EditorSnapshot;
  setSelection(anchor: number, head?: number): EditorSnapshot;
  apply(transaction: TextTransaction): EditorSnapshot;
  applyBatch(transactions: Iterable<TextTransaction>): EditorSnapshot;
  undo(): EditorSnapshot;
  redo(): EditorSnapshot;
  clearHistory(): void;
}

interface State {
  text: string;
  selection: { anchor: number; head: number };
}

function validText(value: string, name: string): void {
  if (typeof value !== 'string') throw new TypeError(`${name} must be a string.`);
}

function offset(value: number, text: string, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > text.length)
    throw new RangeError(`${name} must be a UTF-16 offset inside the document.`);
  if (value > 0 && value < text.length) {
    const before = text.charCodeAt(value - 1);
    const after = text.charCodeAt(value);
    if (before >= 0xd800 && before <= 0xdbff && after >= 0xdc00 && after <= 0xdfff)
      throw new RangeError(`${name} cannot split a surrogate pair.`);
  }
}

function copy(state: State): State {
  return { text: state.text, selection: { ...state.selection } };
}

export function createTextEditor(initialText = '', options: EditorOptions = {}): TextEditor {
  validText(initialText, 'Initial text');
  const maxLength = options.maxLength ?? 1_000_000;
  const maxHistory = options.maxHistory ?? 100;
  if (!Number.isSafeInteger(maxLength) || maxLength < 0)
    throw new RangeError('maxLength must be a non-negative safe integer.');
  if (!Number.isSafeInteger(maxHistory) || maxHistory < 0)
    throw new RangeError('maxHistory must be a non-negative safe integer.');
  if (initialText.length > maxLength) throw new RangeError('Initial document exceeds maxLength.');
  let current: State = {
    text: initialText,
    selection: { anchor: 0, head: 0 },
  };
  let revision = 0;
  const undoStack: State[] = [];
  const redoStack: State[] = [];
  const remember = (stack: State[], state: State) => {
    if (!maxHistory) return;
    stack.push(copy(state));
    if (stack.length > maxHistory) stack.shift();
  };
  const snapshot = (): EditorSnapshot => ({
    text: current.text,
    selection: { ...current.selection },
    revision,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  });
  const validateTransaction = (transaction: TextTransaction, state: State) => {
    if (!transaction || typeof transaction !== 'object')
      throw new TypeError('Expected a text transaction.');
    validText(transaction.insert, 'Inserted text');
    offset(transaction.from, state.text, 'from');
    offset(transaction.to, state.text, 'to');
    if (transaction.to < transaction.from) throw new RangeError('to must not precede from.');
    const length =
      state.text.length - (transaction.to - transaction.from) + transaction.insert.length;
    if (length > maxLength) throw new RangeError('Transaction exceeds maxLength.');
    return {
      text:
        state.text.slice(0, transaction.from) +
        transaction.insert +
        state.text.slice(transaction.to),
      selection: {
        anchor: transaction.from + transaction.insert.length,
        head: transaction.from + transaction.insert.length,
      },
    };
  };
  return {
    snapshot,
    setSelection(anchor, head = anchor) {
      offset(anchor, current.text, 'anchor');
      offset(head, current.text, 'head');
      current = { ...current, selection: { anchor, head } };
      return snapshot();
    },
    apply(transaction) {
      const next = validateTransaction(transaction, current);
      remember(undoStack, current);
      current = next;
      redoStack.length = 0;
      revision++;
      return snapshot();
    },
    applyBatch(input) {
      if (input == null || typeof input[Symbol.iterator] !== 'function')
        throw new TypeError('Transactions must be iterable.');
      const transactions: TextTransaction[] = [];
      for (const transaction of input) {
        if (transactions.length >= 10_000)
          throw new RangeError('Transaction batch capacity exceeded.');
        transactions.push(transaction);
      }
      if (!transactions.length) return snapshot();
      let next = copy(current);
      for (const transaction of transactions) next = validateTransaction(transaction, next);
      remember(undoStack, current);
      current = next;
      redoStack.length = 0;
      revision++;
      return snapshot();
    },
    undo() {
      const previous = undoStack.pop();
      if (!previous) return snapshot();
      remember(redoStack, current);
      current = previous;
      revision++;
      return snapshot();
    },
    redo() {
      const next = redoStack.pop();
      if (!next) return snapshot();
      remember(undoStack, current);
      current = next;
      revision++;
      return snapshot();
    },
    clearHistory() {
      undoStack.length = 0;
      redoStack.length = 0;
    },
  };
}
