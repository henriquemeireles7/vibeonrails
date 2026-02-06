/**
 * Finance Report Aggregator
 *
 * Aggregates all RevenueSource and CostSource data into unified reports.
 * Supports weekly, monthly, quarterly, and yearly periods.
 */

import type {
  ReportAggregatorConfig,
  RevenueSource,
  CostSource,
  FinanceReport,
  MRRMetrics,
  DateRangeOptions,
  ReportPeriod,
  RevenueEntry,
  CostEntry,
} from "./types.js";

// ---------------------------------------------------------------------------
// Date Range Helpers
// ---------------------------------------------------------------------------

function getDateRange(
  period: ReportPeriod,
  startDate?: Date,
  endDate?: Date,
): DateRangeOptions {
  const now = new Date();

  if (startDate && endDate) {
    return { startDate, endDate };
  }

  switch (period) {
    case "weekly": {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { startDate: start, endDate: now };
    }
    case "monthly": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { startDate: start, endDate: end };
    }
    case "quarterly": {
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), quarter * 3, 1);
      const end = new Date(now.getFullYear(), quarter * 3 + 3, 0);
      return { startDate: start, endDate: end };
    }
    case "yearly": {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return { startDate: start, endDate: end };
    }
  }
}

function getPreviousDateRange(range: DateRangeOptions): DateRangeOptions {
  const duration = range.endDate.getTime() - range.startDate.getTime();
  return {
    startDate: new Date(range.startDate.getTime() - duration),
    endDate: new Date(range.startDate.getTime() - 1),
  };
}

// ---------------------------------------------------------------------------
// Report Aggregator
// ---------------------------------------------------------------------------

export interface ReportAggregator {
  /** Generate a financial report for a given period */
  generateReport(options: {
    period: ReportPeriod;
    startDate?: Date;
    endDate?: Date;
  }): Promise<FinanceReport>;

  /** Get MRR metrics across all subscription revenue sources */
  getMRRMetrics(): Promise<MRRMetrics>;

  /** Get total revenue across all sources for a period */
  getTotalRevenue(options: DateRangeOptions): Promise<number>;

  /** Get total costs across all sources for a period */
  getTotalCosts(options: DateRangeOptions): Promise<number>;

  /** Get all revenue entries across all sources */
  getAllRevenueEntries(options: DateRangeOptions): Promise<RevenueEntry[]>;

  /** Get all cost entries across all sources */
  getAllCostEntries(options: DateRangeOptions): Promise<CostEntry[]>;
}

export function createReportAggregator(
  config: ReportAggregatorConfig,
): ReportAggregator {
  const { revenueSources, costSources } = config;

  async function aggregateRevenue(
    sources: RevenueSource[],
    options: DateRangeOptions,
  ): Promise<Array<{ source: string; amount: number }>> {
    const results = await Promise.all(
      sources.map(async (source) => ({
        source: source.name,
        amount: await source.getRevenue(options),
      })),
    );
    return results;
  }

  async function aggregateCosts(
    sources: CostSource[],
    options: DateRangeOptions,
  ): Promise<Array<{ source: string; amount: number }>> {
    const results = await Promise.all(
      sources.map(async (source) => ({
        source: source.name,
        amount: await source.getCost(options),
      })),
    );
    return results;
  }

  return {
    async generateReport(options): Promise<FinanceReport> {
      const dateRange = getDateRange(
        options.period,
        options.startDate,
        options.endDate,
      );

      const [revenueBySource, costsBySource] = await Promise.all([
        aggregateRevenue(revenueSources, dateRange),
        aggregateCosts(costSources, dateRange),
      ]);

      const totalRevenue = revenueBySource.reduce(
        (sum, r) => sum + r.amount,
        0,
      );
      const totalCosts = costsBySource.reduce((sum, c) => sum + c.amount, 0);
      const profit = totalRevenue - totalCosts;
      const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

      // MRR metrics (only if there are subscription-based sources)
      let mrr: MRRMetrics | undefined;
      let churnRate: number | undefined;
      let ltv: number | undefined;

      if (revenueSources.length > 0) {
        try {
          mrr = await this.getMRRMetrics();
          // Average churn rate across sources
          const churnRates = await Promise.all(
            revenueSources.map((s) => s.getChurnRate(dateRange)),
          );
          const nonZeroChurn = churnRates.filter((r) => r > 0);
          churnRate =
            nonZeroChurn.length > 0
              ? nonZeroChurn.reduce((sum, r) => sum + r, 0) /
                nonZeroChurn.length
              : undefined;

          // Average LTV across sources
          const ltvValues = await Promise.all(
            revenueSources.map((s) => s.getLTV()),
          );
          const nonZeroLtv = ltvValues.filter((v) => v > 0);
          ltv =
            nonZeroLtv.length > 0
              ? Math.round(
                  nonZeroLtv.reduce((sum, v) => sum + v, 0) / nonZeroLtv.length,
                )
              : undefined;
        } catch {
          // MRR metrics are optional; ignore failures
        }
      }

      return {
        period: options.period,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        generatedAt: new Date(),
        totalRevenue,
        totalCosts,
        profit,
        profitMargin: Math.round(profitMargin * 100) / 100,
        revenueBySource,
        costsBySource,
        mrr,
        churnRate,
        ltv,
      };
    },

    async getMRRMetrics(): Promise<MRRMetrics> {
      // Current MRR
      const currentMRRs = await Promise.all(
        revenueSources.map((s) => s.getMRR()),
      );
      const current = currentMRRs.reduce((sum, m) => sum + m, 0);

      // Previous period MRR (last month)
      const now = new Date();
      const prevRange: DateRangeOptions = {
        startDate: new Date(now.getFullYear(), now.getMonth() - 2, 1),
        endDate: new Date(now.getFullYear(), now.getMonth() - 1, 0),
      };

      const previousMRRs = await Promise.all(
        revenueSources.map((s) => s.getMRR(prevRange)),
      );
      const previous = previousMRRs.reduce((sum, m) => sum + m, 0);

      const growthRate =
        previous > 0 ? ((current - previous) / previous) * 100 : 0;
      const newMRR = Math.max(0, current - previous);
      const churnedMRR = Math.max(0, previous - current);
      const netNewMRR = current - previous;

      return {
        current,
        previous,
        growthRate: Math.round(growthRate * 100) / 100,
        newMRR,
        churnedMRR,
        netNewMRR,
      };
    },

    async getTotalRevenue(options: DateRangeOptions): Promise<number> {
      const results = await Promise.all(
        revenueSources.map((s) => s.getRevenue(options)),
      );
      return results.reduce((sum, r) => sum + r, 0);
    },

    async getTotalCosts(options: DateRangeOptions): Promise<number> {
      const results = await Promise.all(
        costSources.map((s) => s.getCost(options)),
      );
      return results.reduce((sum, c) => sum + c, 0);
    },

    async getAllRevenueEntries(
      options: DateRangeOptions,
    ): Promise<RevenueEntry[]> {
      const results = await Promise.all(
        revenueSources.map((s) => s.getRevenueEntries(options)),
      );
      return results.flat().sort((a, b) => b.date.getTime() - a.date.getTime());
    },

    async getAllCostEntries(options: DateRangeOptions): Promise<CostEntry[]> {
      const results = await Promise.all(
        costSources.map((s) => s.getCostEntries(options)),
      );
      return results.flat().sort((a, b) => b.date.getTime() - a.date.getTime());
    },
  };
}
