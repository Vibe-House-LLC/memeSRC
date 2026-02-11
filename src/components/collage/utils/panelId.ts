const PANEL_ID_PATTERN = /^panel-(\d+)$/;

export const parsePanelIndexFromId = (panelId: unknown): number | null => {
  if (typeof panelId !== 'string') return null;
  const match = panelId.match(PANEL_ID_PATTERN);
  if (!match) return null;

  const parsed = parseInt(match[1], 10);
  if (Number.isNaN(parsed) || parsed <= 0) return null;

  return parsed - 1;
};
