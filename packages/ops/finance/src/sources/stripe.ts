/**
 * Stripe Revenue Source
 *
 * Implements RevenueSource for Stripe. Calculates MRR, churn rate, LTV,
 * and subscriber count from Stripe API data.
 */

import type {
  RevenueSource,
  RevenueEntry,
  DateRangeOptions,
  StripeConfig,
} from "../types.js";

// ---------------------------------------------------------------------------
// Stripe API Types (minimal subset)
// ---------------------------------------------------------------------------

interface StripeSubscription {
  readonly id: string;
  readonly status: string;
  readonly current_period_start: number;
  readonly current_period_end: number;
  readonly items: {
    readonly data: Array<{
      readonly price: {
        readonly unit_amount: number;
        readonly recurring: {
          readonly interval: string;
          readonly interval_count: number;
        } | null;
      };
      readonly quantity: number;
    }>;
  };
  readonly canceled_at: number | null;
  readonly created: number;
}

interface StripeCharge {
  readonly id: string;
  readonly amount: number;
  readonly currency: string;
  readonly created: number;
  readonly description: string | null;
  readonly status: string;
}

interface StripeListResponse<T> {
  readonly data: T[];
  readonly has_more: boolean;
}

// ---------------------------------------------------------------------------
// Stripe API Client (abstract for testing)
// ---------------------------------------------------------------------------

export interface StripeApiClient {
  listSubscriptions(
    params?: Record<string, string>,
  ): Promise<StripeListResponse<StripeSubscription>>;
  listCharges(
    params?: Record<string, string>,
  ): Promise<StripeListResponse<StripeCharge>>;
}

/**
 * Create a real Stripe API client using fetch.
 * In production, this calls the Stripe REST API directly.
 */
export function createStripeApiClient(config: StripeConfig): StripeApiClient {
  const baseUrl = "https://api.stripe.com/v1";
  const headers = {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  async function request<T>(
    path: string,
    params?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString(), { headers });
    if (!response.ok) {
      throw new Error(
        `Stripe API error: ${response.status} ${response.statusText}`,
      );
    }
    return response.json() as Promise<T>;
  }

  return {
    async listSubscriptions(params) {
      return request<StripeListResponse<StripeSubscription>>("/subscriptions", {
        status: "active",
        limit: "100",
        ...params,
      });
    },
    async listCharges(params) {
      return request<StripeListResponse<StripeCharge>>("/charges", {
        limit: "100",
        ...params,
      });
    },
  };
}

// ---------------------------------------------------------------------------
// MRR Calculation
// ---------------------------------------------------------------------------

function calculateSubscriptionMRR(subscription: StripeSubscription): number {
  let mrr = 0;

  for (const item of subscription.items.data) {
    const amount = item.price.unit_amount * item.quantity;
    const recurring = item.price.recurring;

    if (!recurring) continue;

    // Normalize to monthly
    switch (recurring.interval) {
      case "month":
        mrr += amount / recurring.interval_count;
        break;
      case "year":
        mrr += amount / (12 * recurring.interval_count);
        break;
      case "week":
        mrr += (amount * 52) / (12 * recurring.interval_count);
        break;
      case "day":
        mrr += (amount * 365) / (12 * recurring.interval_count);
        break;
    }
  }

  return Math.round(mrr);
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createStripeRevenueSource(
  config: StripeConfig,
  apiClient?: StripeApiClient,
): RevenueSource {
  const client = apiClient ?? createStripeApiClient(config);

  return {
    name: "stripe",

    async getMRR(): Promise<number> {
      const subs = await client.listSubscriptions({ status: "active" });
      return subs.data.reduce(
        (total, sub) => total + calculateSubscriptionMRR(sub),
        0,
      );
    },

    async getChurnRate(options?: DateRangeOptions): Promise<number> {
      const now = new Date();
      const startDate =
        options?.startDate ??
        new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endDate = options?.endDate ?? now;

      const startTimestamp = Math.floor(startDate.getTime() / 1000);
      const endTimestamp = Math.floor(endDate.getTime() / 1000);

      // Get canceled subscriptions in period
      const canceled = await client.listSubscriptions({
        status: "canceled",
        "created[gte]": startTimestamp.toString(),
        "created[lte]": endTimestamp.toString(),
      });

      // Get active subscriptions (approximation of total at start)
      const active = await client.listSubscriptions({ status: "active" });
      const totalAtStart = active.data.length + canceled.data.length;

      if (totalAtStart === 0) return 0;
      return Math.round((canceled.data.length / totalAtStart) * 10000) / 100;
    },

    async getLTV(): Promise<number> {
      const mrr = await this.getMRR();
      const churn = await this.getChurnRate();

      if (churn === 0) return 0;
      // LTV = ARPU / churn rate
      const subs = await client.listSubscriptions({ status: "active" });
      const arpu = subs.data.length > 0 ? mrr / subs.data.length : 0;

      return Math.round(arpu / (churn / 100));
    },

    async getSubscriberCount(): Promise<number> {
      const subs = await client.listSubscriptions({ status: "active" });
      return subs.data.length;
    },

    async getRevenue(options: DateRangeOptions): Promise<number> {
      const entries = await this.getRevenueEntries(options);
      return entries.reduce((sum, e) => sum + e.amount, 0);
    },

    async getRevenueEntries(
      options: DateRangeOptions,
    ): Promise<RevenueEntry[]> {
      const startTimestamp = Math.floor(options.startDate.getTime() / 1000);
      const endTimestamp = Math.floor(options.endDate.getTime() / 1000);

      const charges = await client.listCharges({
        "created[gte]": startTimestamp.toString(),
        "created[lte]": endTimestamp.toString(),
      });

      return charges.data
        .filter((c) => c.status === "succeeded")
        .map((charge) => ({
          id: charge.id,
          date: new Date(charge.created * 1000),
          amount: charge.amount,
          description: charge.description ?? "Stripe charge",
          source: "stripe",
          category: "subscription",
        }));
    },
  };
}
