interface IEventTargetValue extends HTMLElement {
  value: string;
}

export function hasValue(t: any): t is IEventTargetValue {
  return typeof t?.value === "string";
}

interface IEventTargetBlur extends HTMLElement {
  blur: () => void;
}

export function hasBlur(t: any): t is IEventTargetBlur {
  return typeof t?.blur === "function";
}
