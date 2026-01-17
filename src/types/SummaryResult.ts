export interface SummaryResult {
  summary: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  rawResponse?: any;
}
