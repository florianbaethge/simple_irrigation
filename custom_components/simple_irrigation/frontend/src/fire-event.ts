export function fireEvent(
  node: HTMLElement | Window,
  type: string,
  detail?: Record<string, unknown>
): void {
  const event = new CustomEvent(type, {
    bubbles: true,
    composed: true,
    detail: detail ?? {},
  });
  node.dispatchEvent(event);
}
