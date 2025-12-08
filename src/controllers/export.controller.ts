import { Controller, Get, Route, Path, Response, Tags } from "tsoa";
import { exportService } from "../services/export.service";
import { ClassProgressExportDTO, LearnerReportExportDTO } from "../dtos/export.dto";

/**
 * Export Controller
 * Generates and exports reports in various formats
 *
 * Routes:
 * - GET /api/exports/classes/{classId}/progress - Get class progress report data
 * - GET /api/exports/classes/{classId}/csv - Export class progress as CSV
 * - GET /api/exports/learner/{learnerId}/report - Get learner report data
 * - GET /api/exports/learner/{learnerId}/csv - Export learner report as CSV
 */
@Route("/exports")
@Tags("Export")
export class ExportController extends Controller {
  /**
   * Get class progress report (as JSON)
   * Returns structured data for classroom progress with all learner statistics
   */
  @Get("classes/{classId}/progress")
  @Response(200, "Class progress report generated")
  @Response(404, "Class not found")
  async getClassProgressReport(@Path() classId: string): Promise<ClassProgressExportDTO> {
    return await exportService.generateClassProgressReport(classId);
  }

  /**
   * Export class progress as CSV file
   * Returns CSV string that can be downloaded
   *
   * Includes:
   * - Learner name and email
   * - Attempt statistics (total, submitted, scored)
   * - Average scores by skill type
   * - Last attempt date
   * - Completion status
   *
   * Note: Content-Type will be text/csv
   */
  @Get("classes/{classId}/csv")
  @Response(200, "CSV file generated")
  @Response(404, "Class not found")
  async exportClassProgressAsCSV(@Path() classId: string): Promise<string> {
    return await exportService.exportClassProgressAsCSV(classId);
  }

  /**
   * Get learner report (as JSON)
   * Returns complete learner progress with all attempts and scores
   */
  @Get("learner/{learnerId}/report")
  @Response(200, "Learner report generated")
  @Response(404, "Learner not found")
  async getLearnerReport(@Path() learnerId: string): Promise<LearnerReportExportDTO> {
    return await exportService.generateLearnerReport(learnerId);
  }

  /**
   * Export learner report as CSV file
   * Returns CSV string with learner attempt details
   *
   * Includes:
   * - Summary statistics (attempts, scores, averages)
   * - Detailed attempt history
   * - Individual skill scores
   * - Dates for tracking progress over time
   *
   * Note: Content-Type will be text/csv
   */
  @Get("learner/{learnerId}/csv")
  @Response(200, "CSV file generated")
  @Response(404, "Learner not found")
  async exportLearnerReportAsCSV(@Path() learnerId: string): Promise<string> {
    return await exportService.exportLearnerReportAsCSV(learnerId);
  }
}

/**
 * NOTES:
 *
 * CSV Export Format:
 * - Headers describe each column
 * - Scores formatted to 2 decimal places
 * - Dates in ISO format (YYYY-MM-DD)
 * - Empty cells for missing data
 * - File naming: class-progress-{classId}.csv, learner-report-{learnerId}.csv
 *
 * Future Enhancements:
 * - PDF export with formatting and charts
 * - Email report delivery
 * - Scheduled automated exports
 * - Multiple format support (Excel, JSON)
 * - Custom field selection
 * - Date range filtering
 * - Comparative analysis reports
 *
 * Usage:
 * GET /api/exports/classes/abc123/csv -> Downloads class-progress-abc123.csv
 * GET /api/exports/learner/xyz789/csv -> Downloads learner-report-xyz789.csv
 */
