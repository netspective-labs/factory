import * as id from "../identity/mod.ts";

export interface StrategyIdentitySupplier<Namespace extends string> {
  readonly UUID: id.NamespacedIdentity<id.UUID, Namespace>;
  readonly humanFriendlyID?: id.HumanFriendlyIdentity;
}

export type Iterables<T> = {
  readonly [P in keyof T as `${string & P}s`]: Iterable<T[P]>;
};

/**
 * Concepts such as mission, goals, strategies, and objectives are considered
 * intentions.
 */
export interface Intention<Namespace extends string> {
  readonly identity: StrategyIdentitySupplier<Namespace>;
}

export type IntentionsSupplier<T> = Iterables<T>;

/**
 * Concepts such as metrics, measurements, and KPIs are considered expectations.
 * Expectations may be targeted towards humans, machines, or both. If an
 * expectation can be captured or managed by machines those are instrumentable.
 */
export interface Expectation<Namespace extends string> {
  readonly identity: StrategyIdentitySupplier<Namespace>;
}

export type ExpectationsSupplier<T> = Iterables<T>;

/**
 * Measurable is something that can be quantified but may have differences of
 * opinions.
 */
export interface Measurable<Namespace extends string> {
  readonly identity: StrategyIdentitySupplier<Namespace>;
}

/**
 * Instrumentable is most often used for expecations which can be measured but
 * could also be used for anything whose value can be derived from a machine or
 * other calculation. The difference between measurable and instrumentable is
 * that instrumentables can be machine probe-able and should not have human
 * opinions injected.
 */
export interface Instrumentable<Namespace extends string>
  extends Measurable<Namespace> {
  readonly identity: StrategyIdentitySupplier<Namespace>;
}

/**
 * InstrumentableExpectation is an easy to understand business metrics, KPIs
 * or related measurements tied to an expectation. Key Results for OKRs are a
 * good use case.
 *
 * For example, using [Kumar's KPIs](https://www.linkedin.com/pulse/customer-lifetime-value-clv-calculation-sanjoy-kumar-malik):
 * - Average Order Value (AOV). Average dollar amount spent per customer order.
 *   AOV = Total Revenue / Total Number of Orders
 * - Purchase Frequency (PF). Number of times a customer buys within a given period.
 *   PF = Number of Orders / Number of Unique Customers
 * - Customer Value. Average dollar amount each customer brings within a given period.
 *   Customer Value = Average Order Value * Purchase Frequency
 * - Retention Rate (RR). Percentage of customers who stay after a given time period.
 *   Retention Rate = ((Customers at the end of period - Customers acquired during the period) / Customers at the beginning of period) * 100 %
 * - Churn Rate (CR). Percentage of customers that stop using over a given period.
 *   Churn Rate = ((Customers at the beginning of period – Customers at the end of period) / Customers at the beginning of period) * 100%
 * - Discount Rate (DR). Interest rate used to calculate the present value of the future cash flow
 * - Average Customer Lifetime (ACL).
 *   ACL = 1 / Churn Rate
 * - Cost of Goods Sold (COGS). Cost of labor, materials etc.
 * - Gross Margin  (GM)
 *   GM = (Total Revenue – COGS) / Total Revenue
 * - Gross Margin Per Customer Lifespan (GML). Gross profit per customer during their lifespan.
 *   GML = AOV * ACL * Gross Margin
 * - Customer Lifetime Value (CLV). Projected net profit from one customer over the entire relationship.
 *   CLV = AOV * PF * ACL
 *   CLV = R * D * CAC
 *   CLV = GML * (RR / (1 + DR + RR)) - Traditional CLV Calculation
 *   CLV = AOV * PF * GM * (1 / CR) - Predictive CLV Calculation
 *   CLV = (T1 + T2 + ... + Tn) * AGM - Historical CLV Calculation
 *
 * These are other business-style metrics tied to utilization measurements:
 * - [Lighthouse](https://lighthouse-dot-webdotdevsite.appspot.com/) score
 * - [PageSpeed](https://pagespeed.web.dev) score
 * - [GTmetrix](https://gtmetrix.com) score
 * - [WepageTest](https://webpagetest.org) score
 * - [SecurityHeaders](https://securityheaders.com) score
 * - [HSTS score](https://hstspreload.org)
 * - Domain Authority (DA) [can come from multiple sources so we need agreement]
 * - Traffic sources
 * - Bounce rate
 * - Conversion rate
 * - Landing pages
 * - Exit pages
 * - Network referrals
 * - Average time on site
 *
 * These are some metrics used by [Y Combinator](https://ycombinator.june.so/):
 * - Revenue
 * - Active users
 * - Letters of Interest
 * - Milestones
 */
export interface InstrumentableExpectation<Namespace extends string>
  extends Instrumentable<Namespace>, Expectation<Namespace> {
}

/**
 * Concepts such as Jobs to Be Done (JTBDs), Problems to be Solved (PTBSs),
 * customer pains, and potential relievers are considered demands. Demands
 * should not be confused with intentions - intentions are self-discovered but
 * demands can be traced to customers or users directly.
 */
export interface Demand<Namespace extends string> {
  readonly identity: StrategyIdentitySupplier<Namespace>;
}

export type DemandsSupplier<T> = Iterables<T>;

/**
 * An initiative is a set of tasks or steps that are undertaken to achieve an
 * intention or fulfill a demand.
 */
export interface Initiative<Namespace extends string> {
  readonly identity: StrategyIdentitySupplier<Namespace>;
}

export type InitiativesSupplier<T> = Iterables<T>;

/**
 * When an initiative can be delivered as a software feature, document, item
 * or anything that can be used by a customer or internal user it is considered
 * a deliverable. If an initiative can be expressed as something that a human
 * or machine can use it becomes a deliverable.
 */
export interface Deliverable<Namespace extends string>
  extends Initiative<Namespace> {
  readonly identity: StrategyIdentitySupplier<Namespace>;
}

export type DeliverablesSupplier<T> = Iterables<T>;

export interface MilestoneText extends String {
  // see [nominal typing](https://basarat.gitbook.io/typescript/main-1/nominaltyping#using-interfaces)
  readonly _milestoneTextBrand: string; // To prevent type errors that could mix strings
}

/**
 * A milestone captures a target time or period for deliverables and
 * initiatives.
 */
export interface Milestone<Namespace extends string> {
  readonly identity: StrategyIdentitySupplier<Namespace>;
  readonly milestone: MilestoneText;
  readonly initiate: Date;
  readonly terminate?: Date;
}

export type MilestonesSupplier<T> = Iterables<T>;
