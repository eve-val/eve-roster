import { TYPE_CAPSULE, TYPE_CAPSULE_GENOLUTION } from "../constants/types.js";
import { nil } from "../../../shared/util/simpleTypes.js";

export function isCapsule(typeId: number | nil) {
  return typeId == TYPE_CAPSULE || typeId == TYPE_CAPSULE_GENOLUTION;
}
