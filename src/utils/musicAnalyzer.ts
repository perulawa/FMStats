import { Track, Statistics, TopItem } from '@/types/music';
import Papa from 'papaparse';

interface RawTrack {
    uts: string;
    utc_time: string;
    artist: string;
    artist_mbid: string;
    album: string;
    album_mbid: string;
    track: string;
    track_mbid: string;
}

interface TrackMetadata {
    duration: string;
    genre: string;
    feat: string;
    prod: string;
    label: string;
}

// Create a unique key for each track
const createTrackKey = (artist: string, album: string, track: string) => 
    `${artist}|${album}|${track}`;

export class MusicAnalyzer {
    private tracks: Track[] = [];
    private originalData: RawTrack[] = [];
    private metadata: { [key: string]: TrackMetadata } = {};

    constructor() {
        // Load saved metadata from localStorage
        const savedMetadata = localStorage.getItem('trackMetadata');
        if (savedMetadata) {
            this.metadata = JSON.parse(savedMetadata);
        }
    }

    private saveMetadata() {
        localStorage.setItem('trackMetadata', JSON.stringify(this.metadata));
    }

    async parseCSV(file: File): Promise<void> {
        try {
            const text = await file.text();
            if (!text.trim()) {
                throw new Error('CSV file is empty');
            }

            const lines = text.split('\n');
            if (lines.length < 2) {
                throw new Error('CSV file must contain at least a header row and one data row');
            }

            const headers = lines[0].split(',').map(h => h.trim());
            const requiredHeaders = ['Artist', 'Album', 'Track', 'Count'];
            const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

            if (missingHeaders.length > 0) {
                throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
            }

            this.tracks = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const values = line.split(',').map(v => v.trim());
                if (values.length !== headers.length) {
                    throw new Error(`Invalid data in row ${i + 1}: expected ${headers.length} columns, got ${values.length}`);
                }

                const artist = values[headers.indexOf('Artist')] || '';
                const album = values[headers.indexOf('Album')] || '';
                const track = values[headers.indexOf('Track')] || '';
                const count = parseInt(values[headers.indexOf('Count')] || '0');
                const duration = values[headers.indexOf('Duration')] || undefined;
                const genre = values[headers.indexOf('Genre')] || undefined;
                const utc_time = values[headers.indexOf('UTC Time')] || undefined;

                if (isNaN(count)) {
                    throw new Error(`Invalid count value in row ${i + 1}: ${values[headers.indexOf('Count')]}`);
                }

                this.tracks.push({
                    artist,
                    album,
                    track,
                    count,
                    duration,
                    genre,
                    utc_time
                });
            }

            if (this.tracks.length === 0) {
                throw new Error('No valid tracks found in CSV file');
            }

            // Load existing metadata
            this.loadMetadata();
        } catch (error) {
            console.error('Error parsing CSV:', error);
            throw error instanceof Error ? error : new Error('Failed to parse CSV file');
        }
    }

    async saveToCSV(): Promise<File> {
        // Update original data with any changes from tracks
        this.originalData = this.originalData.map((row, index) => ({
            ...row,
            duration: this.tracks[index].duration,
            genre: this.tracks[index].genre,
            feat: this.tracks[index].feat,
            prod: this.tracks[index].prod,
            label: this.tracks[index].label
        }));

        // Convert back to CSV
        const csv = Papa.unparse(this.originalData);
        return new File([csv], 'updated_music_history.csv', { type: 'text/csv' });
    }

    updateTrackDuration(artist: string, album: string, track: string, duration: string): void {
        const trackKey = createTrackKey(artist, album, track);
        
        // Update metadata
        this.metadata[trackKey] = {
            ...this.metadata[trackKey] || {},
            duration
        };
        
        // Update track in memory
        const trackIndex = this.tracks.findIndex(t => 
            t.artist === artist && 
            t.album === album && 
            t.track === track
        );
        
        if (trackIndex !== -1) {
            this.tracks[trackIndex].duration = duration;
        }

        // Save metadata to localStorage
        this.saveMetadata();
    }

    updateTrackMetadata(
        artist: string, 
        album: string, 
        track: string, 
        updates: Partial<TrackMetadata>
    ): void {
        const trackKey = createTrackKey(artist, album, track);
        
        // Update metadata
        this.metadata[trackKey] = {
            ...this.metadata[trackKey] || {},
            ...updates
        };
        
        // Update track in memory
        const trackIndex = this.tracks.findIndex(t => 
            t.artist === artist && 
            t.album === album && 
            t.track === track
        );
        
        if (trackIndex !== -1) {
            Object.assign(this.tracks[trackIndex], updates);
        }

        // Save metadata to localStorage
        this.saveMetadata();
    }

    private countOccurrences<T>(items: T[]): { [key: string]: number } {
        return items.reduce((acc: { [key: string]: number }, item) => {
            const key = String(item);
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
    }

    private getTopItems(items: { [key: string]: number }, n: number = Infinity): TopItem[] {
        return Object.entries(items)
            .filter(([name]) => name && name.trim() !== '') // Filter out empty or whitespace-only names
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, n);
    }

    private getTopTracks(n: number = Infinity): TopItem[] {
        const trackCounts: { [key: string]: { count: number; artist: string; album: string; duration: string; genre: string } } = {};
        
        // Filter out tracks with empty names
        this.tracks
            .filter(track => track.track.trim() !== '')
            .forEach(track => {
                const key = `${track.artist}|${track.album}|${track.track}`;
                if (!trackCounts[key]) {
                    trackCounts[key] = {
                        count: 0,
                        artist: track.artist,
                        album: track.album,
                        duration: track.duration,
                        genre: track.genre
                    };
                }
                trackCounts[key].count++;
            });

        return Object.entries(trackCounts)
            .map(([key, data]) => ({
                name: key.split('|')[2],
                count: data.count,
                artist: data.artist,
                album: data.album,
                duration: data.duration,
                genre: data.genre
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, n);
    }

    private getListeningPatternsByDay(days: string[]): Array<{ day: string; count: number }> {
        const dayCounts = this.countOccurrences(days);
        return Object.entries(dayCounts)
            .map(([day, count]) => ({ day, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 7);
    }

    private getListeningPatternsByMonth(months: string[]): Array<{ month: string; count: number }> {
        const monthCounts = this.countOccurrences(months);
        return Object.entries(monthCounts)
            .map(([month, count]) => ({ month, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 12);
    }

    analyze(): Statistics {
        const timestamps = this.tracks.map(track => new Date(track.utc_time));
        
        // Calculate listening patterns
        const hours = timestamps.map(date => date.getHours());
        const days = timestamps.map(date => date.toLocaleDateString('en-US', { weekday: 'long' }));
        const months = timestamps.map(date => date.toLocaleDateString('en-US', { month: 'long' }));

        // Calculate total and average durations (skip if duration is not set)
        const tracksWithDuration = this.tracks.filter(track => track.duration !== '');
        const totalDuration = tracksWithDuration.reduce((sum, track) => sum + (parseInt(track.duration) || 0), 0);
        const averageDuration = tracksWithDuration.length > 0 ? totalDuration / tracksWithDuration.length : 0;

        // Get top items
        const artistCounts = this.countOccurrences(this.tracks.filter(t => t.artist.trim() !== '').map(t => t.artist));
        const albumCounts = this.countOccurrences(this.tracks.filter(t => t.album.trim() !== '').map(t => t.album));

        // Process hourly patterns
        const hourCounts = this.countOccurrences(hours);
        const hourlyPatterns = Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            count: hourCounts[i] || 0
        }));

        return {
            totalListeningTime: totalDuration / 3600, // Convert to hours
            averageTrackDuration: averageDuration / 60, // Convert to minutes
            topArtists: this.getTopItems(artistCounts),
            topAlbums: this.getTopItems(albumCounts),
            topTracks: this.getTopTracks(),
            listeningPatterns: {
                byHour: hourlyPatterns,
                byDay: this.getListeningPatternsByDay(days),
                byMonth: this.getListeningPatternsByMonth(months)
            }
        };
    }
} 