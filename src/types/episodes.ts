export interface SeasonEpisodeSelection {
    season: number;
    episode: string;
}

const EPISODE_ID_PATTERN = /^(\d+)([a-zA-Z]*)$/;

const parseEpisodeSortParts = (value: string) => {
    const raw = String(value ?? '').trim();
    const match = raw.match(EPISODE_ID_PATTERN);
    const numeric = match ? parseInt(match[1], 10) : Number.NaN;
    const suffix = match ? match[2] || '' : '';

    return {
        raw,
        numeric,
        suffix: suffix.toLowerCase()
    };
};

export const compareEpisodeIds = (a: string, b: string): number => {
    const left = parseEpisodeSortParts(a);
    const right = parseEpisodeSortParts(b);

    const leftHasNumber = !Number.isNaN(left.numeric);
    const rightHasNumber = !Number.isNaN(right.numeric);

    if (leftHasNumber && rightHasNumber && left.numeric !== right.numeric) {
        return left.numeric - right.numeric;
    }

    if (leftHasNumber && !rightHasNumber) {
        return -1;
    }

    if (!leftHasNumber && rightHasNumber) {
        return 1;
    }

    if (left.suffix === right.suffix) {
        return left.raw.localeCompare(right.raw, undefined, { numeric: true, sensitivity: 'base' });
    }

    if (!left.suffix) {
        return -1;
    }

    if (!right.suffix) {
        return 1;
    }

    return left.suffix.localeCompare(right.suffix, undefined, { numeric: true, sensitivity: 'base' });
};

export const formatSeasonEpisodeLabel = ({ season, episode }: SeasonEpisodeSelection): string => {
    const seasonLabel = `S${String(season).padStart(2, '0')}`;
    const episodeLabel = `E${episode}`;
    return `${seasonLabel}${episodeLabel}`;
};
