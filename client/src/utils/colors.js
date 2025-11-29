const COLORS = [
    '#ef4444', // Red 500
    '#3b82f6', // Blue 500
    '#10b981', // Emerald 500
    '#f59e0b', // Amber 500
    '#8b5cf6', // Violet 500
    '#ec4899', // Pink 500
    '#06b6d4', // Cyan 500
    '#f97316', // Orange 500
    '#6366f1', // Indigo 500
    '#84cc16', // Lime 500
    '#14b8a6', // Teal 500
    '#d946ef', // Fuchsia 500
    '#e11d48', // Rose 600
    '#0ea5e9', // Sky 500
    '#22c55e', // Green 500
    '#eab308', // Yellow 500
    '#a855f7', // Purple 500
    '#f43f5e', // Rose 500
    '#64748b', // Slate 500
    '#78716c', // Stone 500
    '#b91c1c', // Red 700
    '#15803d', // Green 700
    '#1d4ed8', // Blue 700
    '#7e22ce', // Purple 700
    '#be123c', // Rose 700
];

export const getUserColor = (index) => {
    return COLORS[index % COLORS.length];
};

export const getUserColorByName = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return COLORS[Math.abs(hash) % COLORS.length];
};
