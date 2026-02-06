export {
  undoCommand,
  loadStack,
  saveStack,
  pushEntry,
  popEntry,
  peekEntry,
  stackDepth,
  clearStack,
  recordGenerate,
  recordAdd,
  recordRemove,
  executeUndo,
  generateEntryId,
  getStackPath,
} from "./stack.js";

export type {
  OperationType,
  ReverseAction,
  UndoEntry,
  UndoStack,
} from "./stack.js";
