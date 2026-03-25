/** Wait until core HA custom elements used by the panel are defined. */
export async function loadHaPanelElements(): Promise<void> {
  const tags = [
    "ha-menu-button",
    "ha-tab-group",
    "ha-tab-group-tab",
    "ha-card",
    "ha-dialog",
    "ha-textfield",
    "ha-icon",
    "ha-switch",
  ];
  await Promise.all(tags.map((t) => customElements.whenDefined(t).catch(() => undefined)));
}
