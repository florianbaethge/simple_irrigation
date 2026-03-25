const BASE = "simple-irrigation";

export interface PanelPath {
  entryId: string | null;
  page: string;
}

export const getPath = (): PanelPath => {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts[0] !== BASE) {
    return { entryId: null, page: "general" };
  }
  if (parts.length < 2) {
    return { entryId: null, page: "general" };
  }
  const entryId = parts[1];
  const page = parts[2] || "general";
  return { entryId, page };
};

export const exportPath = (entryId: string, page: string): string => {
  return `/${BASE}/${entryId}/${page}`;
};
