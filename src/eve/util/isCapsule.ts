import { TYPE_CAPSULE, TYPE_CAPSULE_GENOLUTION } from "../constants/types";
import { nil } from "../../util/simpleTypes";

export function isCapsule(typeId: number | nil) {
  return typeId == TYPE_CAPSULE || typeId == TYPE_CAPSULE_GENOLUTION;
}
