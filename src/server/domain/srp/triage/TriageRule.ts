import { ZKillmail } from "../../../data-source/zkillboard/ZKillmail.js";
import { SrpVerdictStatus, SrpVerdictReason } from "../../../db/dao/enums.js";

/**
 * Defines a rule for triaging losses. A rule has two fundamental parts: the
 * filter, which determines what kinds of losses the rule applies to, and the
 * verdict(s), which determine whether the loss should be approved, and if so
 * for how much ISK.
 *
 * There are two kinds of triage rules: TemplateRules, which define static
 * filters and verdicts, and FuncRules, which allow greater versatility in
 * defining both the filter and the verdicts.
 *
 * If a rule specifies more than one verdict, they should be ordered with the
 * most important/likely first.
 */
export type TriageRule = TemplateRule | FuncRule;

/** Shared interface for TemplateRule and FuncRule. */
export interface CoreRule {
  /**
   * Determines which losses this rule applies to. For FuncRules, this is an
   * initial restriction that the FuncRule can then further narrow.
   *
   * If multiple props are specified, they are ANDed together (i.e. to match, a
   * loss must match against ALL props).
   */
  filter: LossFilter & {
    /**
     * Matches against the "related" loss, if any. For a ship loss, this means
     * the associated capsule loss and for a capsule loss, the associated ship
     * loss.
     *
     * If this filter is specified and there is no related loss (for whatever
     * reason) then the match is considered to have failed.
     */
    relatedLoss?: LossFilter;
  };
}

export interface LossFilter {
  /**
   * Matches whether the loss has been labeled by zkillboard as npc or solo.
   */
  tag?: "npc" | "solo";

  /** Destroyed ship must match at least one of the provided IDs. */
  shipId?: number[];

  /** Destroyed ship's group ID must match at least one of the IDs. */
  groupId?: number[];

  /**
   * Destroyed ship's market group must match at least one of the IDs.
   * Only matches against the ship's exact market group, not against any
   * parent groups.
   */
  marketGroupId?: number[];
}

/** Simple kind of TriageRule. Specifies a set of hard-coded verdicts. */
export interface TemplateRule extends CoreRule {
  verdicts: TriageVerdict[];
}

/**
 * Versatile TriageRule. Can determine verdicts at runtime. Based on the
 * particular details of a killmail.
 */
export interface FuncRule extends CoreRule {
  discriminant: (
    killmail: ZKillmail,
    meta: LossMeta
  ) => TriageVerdict[] | undefined;
}

export type TriageVerdict = ApprovedVerdict | IneligibleVerdict;

interface BaseVerdict {
  /**
   * Determines whether a verdict should be autocommitted without the need for
   * manual review. 'always' means that the verdict will be autocommitted, even
   * if other verdicts have higher priority. 'leader' verdicts will only be
   * autocommitted if they are the first of the set of returned verdicts.
   * 'never' verdicts are never autocommitted (the default).
   */
  autoCommit?: "always" | "leader" | "never";
}

/** Loss is approved for SRP. */
export interface ApprovedVerdict extends BaseVerdict {
  status: SrpVerdictStatus.APPROVED;
  label: string;
  payout: Payout;
}

/** Loss is ineligible for SRP. */
export interface IneligibleVerdict extends BaseVerdict {
  status: SrpVerdictStatus.INELIGIBLE;
  reason: SrpVerdictReason;
}

export type Payout = StaticPayout | MarketPayout | LossValuePayout;

/** Always pay the same, hard-coded amount for this kind of loss. */
export interface StaticPayout {
  kind: "Static";
  value: number;
}

/** Adjust the value of the payout based on current market prices. */
export interface MarketPayout {
  kind: "Market";
  /** Payout to use if market data is unavailable. */
  fallback: number;
  /** If specified, pay out the value of these items. Otherwise use the hull. */
  items?: number[];
  /** Any additioinal value to add on top of the current market price. */
  additional?: number;
}

/**
 * Pay back the total estimated value of the loss (as reported by zkillboard),
 * up to an optional maximum.
 */
export interface LossValuePayout {
  kind: "LossValue";
  max?: number;
}

export interface LossMeta {
  shipGroup: number;
  shipMarketGroup: number;
  mainCharacter: number | null;
  relatedKillmail: ZKillmail | null;
}

export function isFuncRule(rule: TriageRule): rule is FuncRule {
  return (<FuncRule>rule).discriminant != undefined;
}
