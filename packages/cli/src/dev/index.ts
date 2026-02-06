export {
  analyzeLine,
  analyzeFile,
  analyzeFiles,
  formatWarning,
  formatAnalysisResult,
  shouldAnalyzeFile,
  DETECTION_PATTERNS,
} from "./prevention.js";

export type {
  WarningCategory,
  WarningSeverity,
  PreventionWarning,
  AnalysisResult,
  DetectionPattern,
} from "./prevention.js";
