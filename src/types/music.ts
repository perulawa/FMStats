export interface Track {
    utc_time: string;
    artist: string;
    album: string;
    track: string;
    duration: string;
    genre: string;
    feat: string;
    prod: string;
    label: string;
}

export interface TopItem {
    name: string;
    count: number;
    artist?: string;
    album?: string;
    duration?: string;
    genre?: string;
}

export interface Statistics {
    totalListeningTime: number;
    averageTrackDuration: number;
    topArtists: TopItem[];
    topAlbums: TopItem[];
    topTracks: TopItem[];
    listeningPatterns: {
        byHour: Array<{ hour: number; count: number }>;
        byDay: Array<{ day: string; count: number }>;
        byMonth: Array<{ month: string; count: number }>;
    };
} 