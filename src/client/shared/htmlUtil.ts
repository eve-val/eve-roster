interface IEventTargetValue extends HTMLElement {
  value: string;
}

export function hasValue(t: EventTarget | null): t is IEventTargetValue {
  return typeof t?.value === "string";
}

interface IEventTargetBlur extends HTMLElement {
  blur: () => void;
}

export function hasBlur(t: EventTarget | null): t is IEventTargetBlur {
  return typeof t?.blur === "function";
}
