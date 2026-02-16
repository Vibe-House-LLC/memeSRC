export type BorderZoneType = 'vertical' | 'horizontal';

export interface PanelRect {
  x: number;
  y: number;
  width: number;
  height: number;
  panelId: string;
  index?: number;
}

export interface BorderZone {
  type: BorderZoneType;
  index: number;
  segmentIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  handleWidth: number;
  handleHeight: number;
  cursor: 'col-resize' | 'row-resize';
  id: string;
  edgeId: string;
  boundaryStart: number;
  boundaryEnd: number;
  segmentStart: number;
  segmentEnd: number;
  adjacentPanelPairs: string[];
  leftPanelIds?: string[];
  rightPanelIds?: string[];
  topPanelIds?: string[];
  bottomPanelIds?: string[];
}

export interface BorderZoneDetectionOptions {
  minHitSizePx: number;
  handleLengthPx: number;
  handleThicknessPx: number;
  intervalEpsilonPx: number;
  hitLengthRatio: number;
  minHitLengthPx: number;
  maxHitLengthPx: number;
  hitPaddingPx: number;
}

const DEFAULT_DETECTION_OPTIONS: BorderZoneDetectionOptions = {
  minHitSizePx: 22,
  handleLengthPx: 30,
  handleThicknessPx: 10,
  intervalEpsilonPx: 0.25,
  hitLengthRatio: 0.7,
  minHitLengthPx: 56,
  maxHitLengthPx: 140,
  hitPaddingPx: 8,
};

const DEFAULT_CENTER_SNAP_OPTIONS: BorderDragCenterSnapOptions = {
  enabled: false,
  thresholdRatio: 0.025,
  thresholdMinPx: 4,
  thresholdMaxPx: 10,
};

export interface DetectBorderZonesInput {
  containerWidth: number;
  containerHeight: number;
  borderPixels: number;
  panelRects: PanelRect[];
  options?: Partial<BorderZoneDetectionOptions>;
}

export interface BorderDragCenterSnapOptions {
  enabled?: boolean;
  thresholdPx?: number;
  thresholdRatio?: number;
  thresholdMinPx?: number;
  thresholdMaxPx?: number;
}

export interface ApplyBorderDragDeltaInput {
  panelRects: PanelRect[];
  borderZone: BorderZone | null | undefined;
  deltaX: number;
  deltaY: number;
  minPanelWidthPx: number;
  minPanelHeightPx: number;
  centerSnap?: BorderDragCenterSnapOptions;
}

export interface ApplyBorderDragDeltaResult {
  outcome: 'invalid' | 'noop' | 'changed';
  changed: boolean;
  nextPanelRects: PanelRect[];
  appliedDeltaX: number;
  appliedDeltaY: number;
  snappedToCenter: boolean;
}

interface VerticalEdgeNode {
  type: 'vertical';
  boundaryStart: number;
  boundaryEnd: number;
  segmentStart: number;
  segmentEnd: number;
  leftPanelId: string;
  rightPanelId: string;
  adjacentPair: string;
}

interface HorizontalEdgeNode {
  type: 'horizontal';
  boundaryStart: number;
  boundaryEnd: number;
  segmentStart: number;
  segmentEnd: number;
  topPanelId: string;
  bottomPanelId: string;
  adjacentPair: string;
}

interface VerticalEdgeComponent {
  type: 'vertical';
  boundaryStart: number;
  boundaryEnd: number;
  segmentStart: number;
  segmentEnd: number;
  leftPanelIds: string[];
  rightPanelIds: string[];
  adjacentPanelPairs: string[];
}

interface HorizontalEdgeComponent {
  type: 'horizontal';
  boundaryStart: number;
  boundaryEnd: number;
  segmentStart: number;
  segmentEnd: number;
  topPanelIds: string[];
  bottomPanelIds: string[];
  adjacentPanelPairs: string[];
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const applyCenterSnapDelta = (
  proposedDelta: number,
  minAllowedDelta: number,
  maxAllowedDelta: number,
  centerSnap?: BorderDragCenterSnapOptions,
) => {
  const config: BorderDragCenterSnapOptions = {
    ...DEFAULT_CENTER_SNAP_OPTIONS,
    ...centerSnap,
  };
  if (!config.enabled) return { delta: proposedDelta, snappedToCenter: false };
  if (!Number.isFinite(proposedDelta) || !Number.isFinite(minAllowedDelta) || !Number.isFinite(maxAllowedDelta)) {
    return { delta: proposedDelta, snappedToCenter: false };
  }
  if (minAllowedDelta > maxAllowedDelta) return { delta: proposedDelta, snappedToCenter: false };

  const centerDelta = (minAllowedDelta + maxAllowedDelta) / 2;
  const rangeSpan = Math.max(0, maxAllowedDelta - minAllowedDelta);
  const thresholdMinPx = Math.max(0, Number(config.thresholdMinPx) || 0);
  const thresholdMaxPx = Math.max(thresholdMinPx, Number(config.thresholdMaxPx) || thresholdMinPx);
  const threshold = Number.isFinite(config.thresholdPx)
    ? Math.max(0, Number(config.thresholdPx))
    : clamp(
      rangeSpan * Math.max(0, Number(config.thresholdRatio) || 0),
      thresholdMinPx,
      thresholdMaxPx,
    );

  if (threshold <= 0) return { delta: proposedDelta, snappedToCenter: false };
  if (Math.abs(proposedDelta - centerDelta) <= threshold) {
    return { delta: centerDelta, snappedToCenter: true };
  }
  return { delta: proposedDelta, snappedToCenter: false };
};

const uniquePanelIds = (panelIds: Array<string | undefined | null> = []) => (
  Array.from(new Set(panelIds.filter((panelId): panelId is string => Boolean(panelId)))).sort()
);

const buildAdjacencyPairs = (firstPanelIds: string[], secondPanelIds: string[]) => {
  if (firstPanelIds.length === 0 || secondPanelIds.length === 0) return [] as string[];
  const pairs: string[] = [];
  firstPanelIds.forEach((first) => {
    secondPanelIds.forEach((second) => {
      pairs.push(`${first}:${second}`);
    });
  });
  return pairs.sort();
};

const isPanelRectValid = (panelRect: PanelRect) => {
  const x = Number(panelRect?.x);
  const y = Number(panelRect?.y);
  const width = Number(panelRect?.width);
  const height = Number(panelRect?.height);
  return (
    Boolean(panelRect?.panelId)
    && Number.isFinite(x)
    && Number.isFinite(y)
    && Number.isFinite(width)
    && Number.isFinite(height)
    && width > 0
    && height > 0
  );
};

const buildVerticalEdgeNodes = (
  panelRects: PanelRect[],
  borderPixels: number,
  epsilon: number,
) => {
  const nodes: VerticalEdgeNode[] = [];
  const boundaryTolerance = Math.max(epsilon, 1);
  const maxBoundaryGap = Math.max(2, (Number(borderPixels) || 0) * 2 + boundaryTolerance);

  const pushNode = (leftPanel: PanelRect, rightPanel: PanelRect) => {
    if (!isPanelRectValid(leftPanel) || !isPanelRectValid(rightPanel)) return;

    const leftEdge = leftPanel.x + leftPanel.width;
    const rightEdge = rightPanel.x;
    const boundaryGap = rightEdge - leftEdge;
    if (boundaryGap < -boundaryTolerance || boundaryGap > maxBoundaryGap) return;

    const segmentStart = Math.max(leftPanel.y, rightPanel.y);
    const segmentEnd = Math.min(leftPanel.y + leftPanel.height, rightPanel.y + rightPanel.height);
    if (segmentEnd - segmentStart <= epsilon) return;

    nodes.push({
      type: 'vertical',
      boundaryStart: leftEdge,
      boundaryEnd: rightEdge,
      segmentStart,
      segmentEnd,
      leftPanelId: leftPanel.panelId,
      rightPanelId: rightPanel.panelId,
      adjacentPair: `${leftPanel.panelId}:${rightPanel.panelId}`,
    });
  };

  for (let i = 0; i < panelRects.length; i += 1) {
    for (let j = i + 1; j < panelRects.length; j += 1) {
      const panelA = panelRects[i];
      const panelB = panelRects[j];
      pushNode(panelA, panelB);
      pushNode(panelB, panelA);
    }
  }

  return nodes;
};

const buildHorizontalEdgeNodes = (
  panelRects: PanelRect[],
  borderPixels: number,
  epsilon: number,
) => {
  const nodes: HorizontalEdgeNode[] = [];
  const boundaryTolerance = Math.max(epsilon, 1);
  const maxBoundaryGap = Math.max(2, (Number(borderPixels) || 0) * 2 + boundaryTolerance);

  const pushNode = (topPanel: PanelRect, bottomPanel: PanelRect) => {
    if (!isPanelRectValid(topPanel) || !isPanelRectValid(bottomPanel)) return;

    const topEdge = topPanel.y + topPanel.height;
    const bottomEdge = bottomPanel.y;
    const boundaryGap = bottomEdge - topEdge;
    if (boundaryGap < -boundaryTolerance || boundaryGap > maxBoundaryGap) return;

    const segmentStart = Math.max(topPanel.x, bottomPanel.x);
    const segmentEnd = Math.min(topPanel.x + topPanel.width, bottomPanel.x + bottomPanel.width);
    if (segmentEnd - segmentStart <= epsilon) return;

    nodes.push({
      type: 'horizontal',
      boundaryStart: topEdge,
      boundaryEnd: bottomEdge,
      segmentStart,
      segmentEnd,
      topPanelId: topPanel.panelId,
      bottomPanelId: bottomPanel.panelId,
      adjacentPair: `${topPanel.panelId}:${bottomPanel.panelId}`,
    });
  };

  for (let i = 0; i < panelRects.length; i += 1) {
    for (let j = i + 1; j < panelRects.length; j += 1) {
      const panelA = panelRects[i];
      const panelB = panelRects[j];
      pushNode(panelA, panelB);
      pushNode(panelB, panelA);
    }
  }

  return nodes;
};

const createUnionFind = (size: number) => {
  const parent = Array.from({ length: size }, (_, index) => index);

  const find = (index: number): number => {
    if (parent[index] !== index) {
      parent[index] = find(parent[index]);
    }
    return parent[index];
  };

  const unite = (a: number, b: number) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) {
      parent[rootB] = rootA;
    }
  };

  return { find, unite };
};

const mergeVerticalEdgeNodes = (
  nodes: VerticalEdgeNode[],
  borderPixels: number,
  epsilon: number,
) => {
  if (nodes.length === 0) return [] as VerticalEdgeComponent[];

  const boundaryTolerance = Math.max(epsilon, 1);
  const segmentBridgeGap = Math.max(epsilon, (Number(borderPixels) || 0) + 1);
  const { find, unite } = createUnionFind(nodes.length);

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const sameBoundary = (
        Math.abs(nodes[i].boundaryStart - nodes[j].boundaryStart) <= boundaryTolerance
        && Math.abs(nodes[i].boundaryEnd - nodes[j].boundaryEnd) <= boundaryTolerance
      );
      if (!sameBoundary) continue;
      const segmentGap = (
        Math.max(nodes[i].segmentStart, nodes[j].segmentStart)
        - Math.min(nodes[i].segmentEnd, nodes[j].segmentEnd)
      );
      if (segmentGap <= segmentBridgeGap) {
        unite(i, j);
      }
    }
  }

  const groups = new Map<number, VerticalEdgeNode[]>();
  nodes.forEach((node, index) => {
    const root = find(index);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)?.push(node);
  });

  const components = Array.from(groups.values()).map((groupNodes) => {
    const boundaryStart = groupNodes.reduce((sum, node) => sum + node.boundaryStart, 0) / groupNodes.length;
    const boundaryEnd = groupNodes.reduce((sum, node) => sum + node.boundaryEnd, 0) / groupNodes.length;
    const segmentStart = Math.min(...groupNodes.map((node) => node.segmentStart));
    const segmentEnd = Math.max(...groupNodes.map((node) => node.segmentEnd));

    return {
      type: 'vertical' as const,
      boundaryStart,
      boundaryEnd,
      segmentStart,
      segmentEnd,
      leftPanelIds: uniquePanelIds(groupNodes.map((node) => node.leftPanelId)),
      rightPanelIds: uniquePanelIds(groupNodes.map((node) => node.rightPanelId)),
      adjacentPanelPairs: Array.from(new Set(groupNodes.map((node) => node.adjacentPair))).sort(),
    };
  });

  return components.sort((a, b) => (
    a.boundaryStart - b.boundaryStart || a.segmentStart - b.segmentStart
  ));
};

const mergeHorizontalEdgeNodes = (
  nodes: HorizontalEdgeNode[],
  borderPixels: number,
  epsilon: number,
) => {
  if (nodes.length === 0) return [] as HorizontalEdgeComponent[];

  const boundaryTolerance = Math.max(epsilon, 1);
  const segmentBridgeGap = Math.max(epsilon, (Number(borderPixels) || 0) + 1);
  const { find, unite } = createUnionFind(nodes.length);

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const sameBoundary = (
        Math.abs(nodes[i].boundaryStart - nodes[j].boundaryStart) <= boundaryTolerance
        && Math.abs(nodes[i].boundaryEnd - nodes[j].boundaryEnd) <= boundaryTolerance
      );
      if (!sameBoundary) continue;
      const segmentGap = (
        Math.max(nodes[i].segmentStart, nodes[j].segmentStart)
        - Math.min(nodes[i].segmentEnd, nodes[j].segmentEnd)
      );
      if (segmentGap <= segmentBridgeGap) {
        unite(i, j);
      }
    }
  }

  const groups = new Map<number, HorizontalEdgeNode[]>();
  nodes.forEach((node, index) => {
    const root = find(index);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)?.push(node);
  });

  const components = Array.from(groups.values()).map((groupNodes) => {
    const boundaryStart = groupNodes.reduce((sum, node) => sum + node.boundaryStart, 0) / groupNodes.length;
    const boundaryEnd = groupNodes.reduce((sum, node) => sum + node.boundaryEnd, 0) / groupNodes.length;
    const segmentStart = Math.min(...groupNodes.map((node) => node.segmentStart));
    const segmentEnd = Math.max(...groupNodes.map((node) => node.segmentEnd));

    return {
      type: 'horizontal' as const,
      boundaryStart,
      boundaryEnd,
      segmentStart,
      segmentEnd,
      topPanelIds: uniquePanelIds(groupNodes.map((node) => node.topPanelId)),
      bottomPanelIds: uniquePanelIds(groupNodes.map((node) => node.bottomPanelId)),
      adjacentPanelPairs: Array.from(new Set(groupNodes.map((node) => node.adjacentPair))).sort(),
    };
  });

  return components.sort((a, b) => (
    a.boundaryStart - b.boundaryStart || a.segmentStart - b.segmentStart
  ));
};

export const buildStableBorderEdgeId = (
  type: BorderZoneType,
  firstPanelIds: string[] = [],
  secondPanelIds: string[] = [],
) => {
  const first = uniquePanelIds(firstPanelIds);
  const second = uniquePanelIds(secondPanelIds);
  const prefix = type === 'vertical' ? 'v' : 'h';
  return `${prefix}|${first.join(',')}|${second.join(',')}`;
};

export const findBorderZoneByEdgeId = (
  borderZones: BorderZone[],
  edgeId: string | null | undefined,
) => {
  if (!Array.isArray(borderZones) || !edgeId) return null;
  return borderZones.find((zone) => zone.edgeId === edgeId || zone.id === edgeId) || null;
};

export const detectBorderZonesFromPanelRects = ({
  containerWidth,
  containerHeight,
  borderPixels,
  panelRects = [],
  options = {},
}: DetectBorderZonesInput): BorderZone[] => {
  if (!Array.isArray(panelRects) || panelRects.length === 0) return [];
  if (!Number.isFinite(containerWidth) || !Number.isFinite(containerHeight)) return [];

  const config: BorderZoneDetectionOptions = {
    ...DEFAULT_DETECTION_OPTIONS,
    ...options,
  };
  const epsilon = Math.max(0.00001, Number(config.intervalEpsilonPx) || DEFAULT_DETECTION_OPTIONS.intervalEpsilonPx);
  const zones: BorderZone[] = [];
  const zoneIdCounts = new Map<string, number>();
  const interiorInset = Math.max(0, Number(borderPixels) || 0);
  const interiorX = interiorInset;
  const interiorY = interiorInset;
  const interiorWidth = Math.max(1, containerWidth - (interiorInset * 2));
  const interiorHeight = Math.max(1, containerHeight - (interiorInset * 2));
  const handleLong = config.handleLengthPx;
  const handleShort = config.handleThicknessPx;
  const hitPadding = config.hitPaddingPx;
  const verticalHitWidth = Math.max(config.minHitSizePx, handleShort + (hitPadding * 2));
  const baseVerticalHitHeight = Math.max(config.minHitSizePx, handleLong + (hitPadding * 2));
  const baseHorizontalHitWidth = Math.max(config.minHitSizePx, handleLong + (hitPadding * 2));
  const horizontalHitHeight = Math.max(config.minHitSizePx, handleShort + (hitPadding * 2));
  const interiorTop = interiorY;
  const interiorBottom = interiorY + interiorHeight;
  const interiorLeft = interiorX;
  const interiorRight = interiorX + interiorWidth;

  const validRects = panelRects.filter(isPanelRectValid);
  if (validRects.length === 0) return [];

  const verticalNodes = buildVerticalEdgeNodes(validRects, borderPixels, epsilon);
  const horizontalNodes = buildHorizontalEdgeNodes(validRects, borderPixels, epsilon);
  const verticalComponents = mergeVerticalEdgeNodes(verticalNodes, borderPixels, epsilon);
  const horizontalComponents = mergeHorizontalEdgeNodes(horizontalNodes, borderPixels, epsilon);

  const resolveZoneId = (edgeId: string) => {
    const seen = zoneIdCounts.get(edgeId) || 0;
    zoneIdCounts.set(edgeId, seen + 1);
    if (seen === 0) return edgeId;
    return `${edgeId}|segment-${seen + 1}`;
  };

  verticalComponents.forEach((component, boundaryIndex) => {
    const leftPanelIds = uniquePanelIds(component.leftPanelIds);
    const rightPanelIds = uniquePanelIds(component.rightPanelIds);
    if (leftPanelIds.length === 0 || rightPanelIds.length === 0) return;

    const segmentStart = clamp(component.segmentStart, interiorTop, interiorBottom);
    const segmentEnd = clamp(component.segmentEnd, interiorTop, interiorBottom);
    const visibleLength = Math.max(1, segmentEnd - segmentStart);
    if (visibleLength <= epsilon) return;

    const maxHitHeightForSegment = Math.max(
      config.minHitSizePx,
      visibleLength + (hitPadding * 2),
    );
    const verticalHitHeight = Math.min(
      interiorHeight,
      maxHitHeightForSegment,
      Math.max(
        baseVerticalHitHeight,
        clamp(
          visibleLength * config.hitLengthRatio,
          config.minHitLengthPx,
          config.maxHitLengthPx,
        ),
      ),
    );

    const normalizedBoundaryStart = Math.min(component.boundaryStart, component.boundaryEnd);
    const normalizedBoundaryEnd = Math.max(component.boundaryStart, component.boundaryEnd);
    const boundaryStart = clamp(normalizedBoundaryStart, interiorLeft, interiorRight);
    const boundaryEnd = clamp(Math.max(boundaryStart, normalizedBoundaryEnd), interiorLeft, interiorRight);
    const boundaryWidth = Math.max(epsilon, boundaryEnd - boundaryStart);
    const centerX = boundaryStart + (boundaryWidth / 2);
    const centerY = (segmentStart + segmentEnd) / 2;
    const y = clamp(
      centerY - (verticalHitHeight / 2),
      interiorTop,
      Math.max(interiorTop, interiorBottom - verticalHitHeight),
    );

    const edgeId = buildStableBorderEdgeId('vertical', leftPanelIds, rightPanelIds);
    const id = resolveZoneId(edgeId);
    const segmentIndex = Math.max(0, (zoneIdCounts.get(edgeId) || 1) - 1);

    zones.push({
      type: 'vertical',
      index: boundaryIndex,
      segmentIndex,
      x: centerX - verticalHitWidth / 2,
      y,
      width: verticalHitWidth,
      height: verticalHitHeight,
      centerX,
      centerY,
      handleWidth: handleShort,
      handleHeight: handleLong,
      cursor: 'col-resize',
      id,
      edgeId,
      boundaryStart,
      boundaryEnd,
      segmentStart,
      segmentEnd,
      leftPanelIds,
      rightPanelIds,
      adjacentPanelPairs: component.adjacentPanelPairs.length > 0
        ? component.adjacentPanelPairs
        : buildAdjacencyPairs(leftPanelIds, rightPanelIds),
    });
  });

  horizontalComponents.forEach((component, boundaryIndex) => {
    const topPanelIds = uniquePanelIds(component.topPanelIds);
    const bottomPanelIds = uniquePanelIds(component.bottomPanelIds);
    if (topPanelIds.length === 0 || bottomPanelIds.length === 0) return;

    const segmentStart = clamp(component.segmentStart, interiorLeft, interiorRight);
    const segmentEnd = clamp(component.segmentEnd, interiorLeft, interiorRight);
    const visibleLength = Math.max(1, segmentEnd - segmentStart);
    if (visibleLength <= epsilon) return;

    const maxHitWidthForSegment = Math.max(
      config.minHitSizePx,
      visibleLength + (hitPadding * 2),
    );
    const horizontalHitWidth = Math.min(
      interiorWidth,
      maxHitWidthForSegment,
      Math.max(
        baseHorizontalHitWidth,
        clamp(
          visibleLength * config.hitLengthRatio,
          config.minHitLengthPx,
          config.maxHitLengthPx,
        ),
      ),
    );

    const normalizedBoundaryStart = Math.min(component.boundaryStart, component.boundaryEnd);
    const normalizedBoundaryEnd = Math.max(component.boundaryStart, component.boundaryEnd);
    const boundaryStart = clamp(normalizedBoundaryStart, interiorTop, interiorBottom);
    const boundaryEnd = clamp(Math.max(boundaryStart, normalizedBoundaryEnd), interiorTop, interiorBottom);
    const boundaryHeight = Math.max(epsilon, boundaryEnd - boundaryStart);
    const centerX = (segmentStart + segmentEnd) / 2;
    const centerY = boundaryStart + (boundaryHeight / 2);
    const x = clamp(
      centerX - (horizontalHitWidth / 2),
      interiorLeft,
      Math.max(interiorLeft, interiorRight - horizontalHitWidth),
    );

    const edgeId = buildStableBorderEdgeId('horizontal', topPanelIds, bottomPanelIds);
    const id = resolveZoneId(edgeId);
    const segmentIndex = Math.max(0, (zoneIdCounts.get(edgeId) || 1) - 1);

    zones.push({
      type: 'horizontal',
      index: boundaryIndex,
      segmentIndex,
      x,
      y: centerY - horizontalHitHeight / 2,
      width: horizontalHitWidth,
      height: horizontalHitHeight,
      centerX,
      centerY,
      handleWidth: handleLong,
      handleHeight: handleShort,
      cursor: 'row-resize',
      id,
      edgeId,
      boundaryStart,
      boundaryEnd,
      segmentStart,
      segmentEnd,
      topPanelIds,
      bottomPanelIds,
      adjacentPanelPairs: component.adjacentPanelPairs.length > 0
        ? component.adjacentPanelPairs
        : buildAdjacencyPairs(topPanelIds, bottomPanelIds),
    });
  });

  return zones;
};

export const applyBorderDragDelta = ({
  panelRects = [],
  borderZone,
  deltaX,
  deltaY,
  minPanelWidthPx,
  minPanelHeightPx,
  centerSnap,
}: ApplyBorderDragDeltaInput): ApplyBorderDragDeltaResult => {
  if (!Array.isArray(panelRects) || panelRects.length === 0) {
    return {
      outcome: 'invalid',
      changed: false,
      nextPanelRects: panelRects,
      appliedDeltaX: 0,
      appliedDeltaY: 0,
      snappedToCenter: false,
    };
  }
  if (!borderZone || (borderZone.type !== 'vertical' && borderZone.type !== 'horizontal')) {
    return {
      outcome: 'invalid',
      changed: false,
      nextPanelRects: panelRects,
      appliedDeltaX: 0,
      appliedDeltaY: 0,
      snappedToCenter: false,
    };
  }

  const rectsById = panelRects.reduce<Record<string, PanelRect>>((acc, panelRect) => {
    acc[panelRect.panelId] = { ...panelRect };
    return acc;
  }, {});

  let appliedDeltaX = 0;
  let appliedDeltaY = 0;
  let snappedToCenter = false;

  if (borderZone.type === 'vertical') {
    const leftPanelIds = uniquePanelIds(borderZone.leftPanelIds).filter((panelId) => rectsById[panelId]);
    const rightPanelIds = uniquePanelIds(borderZone.rightPanelIds).filter((panelId) => rectsById[panelId]);
    if (leftPanelIds.length === 0 || rightPanelIds.length === 0) {
      return {
        outcome: 'invalid',
        changed: false,
        nextPanelRects: panelRects,
        appliedDeltaX: 0,
        appliedDeltaY: 0,
        snappedToCenter: false,
      };
    }

    let minAllowedDelta = Number.NEGATIVE_INFINITY;
    let maxAllowedDelta = Number.POSITIVE_INFINITY;
    leftPanelIds.forEach((panelId) => {
      minAllowedDelta = Math.max(minAllowedDelta, minPanelWidthPx - rectsById[panelId].width);
    });
    rightPanelIds.forEach((panelId) => {
      maxAllowedDelta = Math.min(maxAllowedDelta, rectsById[panelId].width - minPanelWidthPx);
    });
    if (minAllowedDelta > maxAllowedDelta) {
      return {
        outcome: 'noop',
        changed: false,
        nextPanelRects: panelRects,
        appliedDeltaX: 0,
        appliedDeltaY: 0,
        snappedToCenter: false,
      };
    }

    const snapResult = applyCenterSnapDelta(deltaX, minAllowedDelta, maxAllowedDelta, centerSnap);
    const snappedDelta = snapResult.delta;
    snappedToCenter = snapResult.snappedToCenter;
    const appliedDelta = clamp(snappedDelta, minAllowedDelta, maxAllowedDelta);
    if (Math.abs(appliedDelta) < 0.01) {
      return {
        outcome: 'noop',
        changed: false,
        nextPanelRects: panelRects,
        appliedDeltaX: 0,
        appliedDeltaY: 0,
        snappedToCenter,
      };
    }

    leftPanelIds.forEach((panelId) => {
      rectsById[panelId].width += appliedDelta;
    });
    rightPanelIds.forEach((panelId) => {
      rectsById[panelId].x += appliedDelta;
      rectsById[panelId].width -= appliedDelta;
    });
    appliedDeltaX = appliedDelta;
  } else {
    const topPanelIds = uniquePanelIds(borderZone.topPanelIds).filter((panelId) => rectsById[panelId]);
    const bottomPanelIds = uniquePanelIds(borderZone.bottomPanelIds).filter((panelId) => rectsById[panelId]);
    if (topPanelIds.length === 0 || bottomPanelIds.length === 0) {
      return {
        outcome: 'invalid',
        changed: false,
        nextPanelRects: panelRects,
        appliedDeltaX: 0,
        appliedDeltaY: 0,
        snappedToCenter: false,
      };
    }

    let minAllowedDelta = Number.NEGATIVE_INFINITY;
    let maxAllowedDelta = Number.POSITIVE_INFINITY;
    topPanelIds.forEach((panelId) => {
      minAllowedDelta = Math.max(minAllowedDelta, minPanelHeightPx - rectsById[panelId].height);
    });
    bottomPanelIds.forEach((panelId) => {
      maxAllowedDelta = Math.min(maxAllowedDelta, rectsById[panelId].height - minPanelHeightPx);
    });
    if (minAllowedDelta > maxAllowedDelta) {
      return {
        outcome: 'noop',
        changed: false,
        nextPanelRects: panelRects,
        appliedDeltaX: 0,
        appliedDeltaY: 0,
        snappedToCenter: false,
      };
    }

    const snapResult = applyCenterSnapDelta(deltaY, minAllowedDelta, maxAllowedDelta, centerSnap);
    const snappedDelta = snapResult.delta;
    snappedToCenter = snapResult.snappedToCenter;
    const appliedDelta = clamp(snappedDelta, minAllowedDelta, maxAllowedDelta);
    if (Math.abs(appliedDelta) < 0.01) {
      return {
        outcome: 'noop',
        changed: false,
        nextPanelRects: panelRects,
        appliedDeltaX: 0,
        appliedDeltaY: 0,
        snappedToCenter,
      };
    }

    topPanelIds.forEach((panelId) => {
      rectsById[panelId].height += appliedDelta;
    });
    bottomPanelIds.forEach((panelId) => {
      rectsById[panelId].y += appliedDelta;
      rectsById[panelId].height -= appliedDelta;
    });
    appliedDeltaY = appliedDelta;
  }

  const nextPanelRects = panelRects.map((panelRect) => {
    const updated = rectsById[panelRect.panelId];
    if (!updated) return panelRect;
    return {
      ...panelRect,
      ...updated,
    };
  });

  return {
    outcome: 'changed',
    changed: true,
    nextPanelRects,
    appliedDeltaX,
    appliedDeltaY,
    snappedToCenter,
  };
};
