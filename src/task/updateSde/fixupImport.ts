import { Tnex } from "../../db/tnex/index";

/**
 * Repair or remove and inconsistencies in the imported SDE data, such as
 * incompletely-defined attributes or inconsistent data patterns. There are a
 * surprising number of these, but most can be ignored.
 */
export async function fixupImport(_db: Tnex) {}
