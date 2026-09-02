import { Parser } from '../parser/Parser.js';
import { AnalysisResult, Issue } from '../types.js';
import { N1Detector } from './detectors/N1Detector.js';
import { MissingIndexDetector } from './detectors/MissingIndexDetector.js';
import { InefficientJoinDetector } from './detectors/InefficientJoinDetector.js';

export class QueryAnalyzer {
  private parser: Parser;
  private n1Detector: N1Detector;
  private indexDetector: MissingIndexDetector;
  private joinDetector: InefficientJoinDetector;

  constructor() {
    this.parser = new Parser();
    this.n1Detector = new N1Detector();
    this.indexDetector = new MissingIndexDetector();
    this.joinDetector = new InefficientJoinDetector();
  }

  analyze(query: string): AnalysisResult {
    try {
      const context = this.parser.parse(query);
      const issues: Issue[] = [];

      issues.push(...this.n1Detector.detect(query, context));
      issues.push(...this.indexDetector.detect(query, context));
      issues.push(...this.joinDetector.detect(query, context));

      return {
        query,
        issues: this.sortByServerity(issues),
        isValid: true,
      };
    } catch (error) {
      return {
        query,
        issues: [],
        isValid: false,
        parseError: error instanceof Error ? error.message : 'Unknown parsing error',
      };
    }
  }

  private sortByServerity(issues: Issue[]): Issue[] {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }
}
