'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MusicAnalyzer } from '@/utils/musicAnalyzer';
import { Statistics, TopItem } from '@/types/music';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
    UserGroupIcon,
    MusicalNoteIcon,
    ClockIcon,
    ChartBarIcon,
    CalendarIcon,
    QueueListIcon,
    HashtagIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface SongDuration {
    artist: string;
    album: string;
    track: string;
    duration: string;
    genre?: string;
}

const StatNavIcon = ({ icon: Icon, label, href, active }: { 
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    label: string;
    href: string;
    active: boolean;
}) => (
    <Link
        href={href}
        className={`p-2 rounded-full transition-colors duration-200 ${
            active 
                ? 'bg-blue-100 text-blue-600' 
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
        }`}
        title={label}
    >
        <Icon className="w-6 h-6" />
    </Link>
);

export default function Home() {
    const [statistics, setStatistics] = useState<Statistics | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [useDevData, setUseDevData] = useState(true);
    const [showDurationInput, setShowDurationInput] = useState(false);
    const [showGenreInput, setShowGenreInput] = useState(false);
    const [currentSong, setCurrentSong] = useState<SongDuration | null>(null);
    const [currentGenreSong, setCurrentGenreSong] = useState<SongDuration | null>(null);
    const [activePage, setActivePage] = useState('overview');
    const [analyzer, setAnalyzer] = useState<MusicAnalyzer | null>(null);

    // Memoize the analyzer instance
    const getAnalyzer = useCallback(() => {
        if (!analyzer) {
            const newAnalyzer = new MusicAnalyzer();
            setAnalyzer(newAnalyzer);
            return newAnalyzer;
        }
        return analyzer;
    }, [analyzer]);

    // Memoize the data loading function
    const loadData = useCallback(async (file: File) => {
        setLoading(true);
        setError(null);
        try {
            const currentAnalyzer = getAnalyzer();
            await currentAnalyzer.parseCSV(file);
            const stats = currentAnalyzer.analyze();
            setStatistics(stats);
            
            // Check if there are any songs without durations or genres
            const hasUnprocessedDurations = stats.topTracks.some(track => !track.duration);
            const hasUnprocessedGenres = stats.topTracks.some(track => !track.genre);
            
            setShowDurationInput(hasUnprocessedDurations);
            setShowGenreInput(hasUnprocessedGenres);
            
            if (hasUnprocessedDurations) {
                setCurrentSong(getNextSongWithoutDuration(stats));
            }
            if (hasUnprocessedGenres) {
                setCurrentGenreSong(getNextSongWithoutGenre(stats));
            }
        } catch (err) {
            setError('Error processing data. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [getAnalyzer]);

    const loadDevData = useCallback(async () => {
        try {
            const response = await fetch('/sample.csv');
            const text = await response.text();
            const file = new File([text], 'sample.csv', { type: 'text/csv' });
            await loadData(file);
        } catch (err) {
            setError('Error loading sample data. Please try again.');
            console.error(err);
        }
    }, [loadData]);

    useEffect(() => {
        if (useDevData) {
            loadDevData();
        }
    }, [useDevData, loadDevData]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        await loadData(file);
    };

    // Memoize the duration submit handler
    const handleDurationSubmit = useCallback(async (duration: string) => {
        if (!currentSong || !analyzer || !statistics) return;
        
        analyzer.updateTrackMetadata(
            currentSong.artist,
            currentSong.album,
            currentSong.track,
            { duration }
        );
        
        const updatedStats = analyzer.analyze();
        setStatistics(updatedStats);
        
        const updatedFile = await analyzer.saveToCSV();
        const downloadUrl = URL.createObjectURL(updatedFile);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = updatedFile.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
        
        const nextSong = getNextSongWithoutDuration(updatedStats);
        setCurrentSong(nextSong);
        if (!nextSong) {
            setShowDurationInput(false);
        }
    }, [currentSong, analyzer, statistics]);

    // Memoize the genre submit handler
    const handleGenreSubmit = useCallback(async (genre: string) => {
        if (!currentGenreSong || !analyzer || !statistics) return;
        
        analyzer.updateTrackMetadata(
            currentGenreSong.artist,
            currentGenreSong.album,
            currentGenreSong.track,
            { genre }
        );
        
        const updatedStats = analyzer.analyze();
        setStatistics(updatedStats);
        
        const updatedFile = await analyzer.saveToCSV();
        const downloadUrl = URL.createObjectURL(updatedFile);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = updatedFile.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
        
        const nextSong = getNextSongWithoutGenre(updatedStats);
        setCurrentGenreSong(nextSong);
        if (!nextSong) {
            setShowGenreInput(false);
        }
    }, [currentGenreSong, analyzer, statistics]);

    // Memoize the edit duration handler
    const handleEditDuration = useCallback((songDuration: TopItem, updates: { duration?: string; genre?: string }) => {
        if (!analyzer || !songDuration.artist || !songDuration.album) return;
        
        analyzer.updateTrackMetadata(
            songDuration.artist,
            songDuration.album,
            songDuration.name,
            updates
        );

        const updatedStats = analyzer.analyze();
        setStatistics(updatedStats);
    }, [analyzer]);

    const getNextSongWithoutDuration = (stats: Statistics): SongDuration | null => {
        if (!stats) return null;
        
        const track = stats.topTracks.find(t => !t.duration);
        if (track) {
            return {
                artist: track.artist || '',
                album: track.album || '',
                track: track.name,
                duration: '',
                genre: track.genre
            };
        }
        return null;
    };

    const getNextSongWithoutGenre = (stats: Statistics): SongDuration | null => {
        if (!stats) return null;
        
        const track = stats.topTracks.find(t => !t.genre);
        if (track) {
            return {
                artist: track.artist || '',
                album: track.album || '',
                track: track.name,
                duration: track.duration || '',
                genre: ''
            };
        }
        return null;
    };

    const calculateTotalListeningTime = () => {
        if (!statistics) return 0;
        
        let totalTime = 0;
        statistics.topTracks.forEach(track => {
            const songDuration = statistics.topTracks.find(
                t => t.name === track.name && 
                    t.artist === track.artist && 
                    t.album === track.album
            );
            if (songDuration?.duration) {
                totalTime += parseInt(songDuration.duration) * track.count;
            }
        });
        return totalTime / 3600; // Convert to hours
    };

    const calculateAlbumDuration = (albumName: string) => {
        if (!statistics) return 0;
        
        let totalTime = 0;
        statistics.topTracks.forEach(track => {
            if (track.album === albumName) {
                const songDuration = statistics.topTracks.find(
                    t => t.name === track.name && 
                        t.artist === track.artist && 
                        t.album === track.album
                );
                if (songDuration?.duration) {
                    totalTime += parseInt(songDuration.duration) * track.count;
                }
            }
        });
        return totalTime;
    };

    const formatDuration = (seconds: number): string => {
        if (seconds >= 3600) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        } else {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}m ${remainingSeconds}s`;
        }
    };

    return (
        <main className="min-h-screen p-8 bg-gray-50">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-4xl font-bold text-gray-900">Music Listening History Analyzer</h1>
                    <div className="flex items-center space-x-2">
                        <StatNavIcon
                            icon={ChartBarIcon}
                            label="Overview"
                            href="#"
                            active={activePage === 'overview'}
                        />
                        <StatNavIcon
                            icon={UserGroupIcon}
                            label="Artist Statistics"
                            href="/artists"
                            active={activePage === 'artists'}
                        />
                        <StatNavIcon
                            icon={MusicalNoteIcon}
                            label="Album Statistics"
                            href="/albums"
                            active={activePage === 'albums'}
                        />
                        <StatNavIcon
                            icon={QueueListIcon}
                            label="Track Statistics"
                            href="/tracks"
                            active={activePage === 'tracks'}
                        />
                        <StatNavIcon
                            icon={HashtagIcon}
                            label="Genre Statistics"
                            href="/genres"
                            active={activePage === 'genres'}
                        />
                    </div>
                </div>
                
                <div className="mb-8 bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">Data Source</h2>
                        <div className="flex items-center space-x-4">
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    className="form-radio"
                                    checked={useDevData}
                                    onChange={() => setUseDevData(true)}
                                />
                                <span className="ml-2">Use Sample Data</span>
                            </label>
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    className="form-radio"
                                    checked={!useDevData}
                                    onChange={() => setUseDevData(false)}
                                />
                                <span className="ml-2">Upload Custom CSV</span>
                            </label>
                        </div>
                    </div>

                    {!useDevData && (
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Upload your music history CSV file
                            </label>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileUpload}
                                className="block w-full text-sm text-gray-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-full file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-blue-50 file:text-blue-700
                                    hover:file:bg-blue-100"
                            />
                        </div>
                    )}
                </div>

                {loading && (
                    <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        <p className="mt-2 text-gray-600">Processing your data...</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-8">
                        {error}
                    </div>
                )}

                {showDurationInput && currentSong && (
                    <div className="mb-8 bg-white p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4 text-gray-900">Song Duration Input</h2>
                        <p className="text-gray-700 mb-4">
                            Please provide the duration for:
                            <br />
                            <span className="font-semibold">{currentSong.track}</span> by {currentSong.artist}
                            <br />
                            from the album {currentSong.album}
                        </p>
                        <div className="space-y-4">
                            <div className="flex space-x-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Duration
                                    </label>
                                    <div className="flex space-x-2">
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="Minutes"
                                            className="w-24 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    const minutesInput = e.target as HTMLInputElement;
                                                    const secondsInput = minutesInput.nextElementSibling as HTMLInputElement;
                                                    const minutes = parseInt(minutesInput.value) || 0;
                                                    const seconds = parseInt(secondsInput.value) || 0;
                                                    const totalSeconds = (minutes * 60 + seconds).toString();
                                                    handleDurationSubmit(totalSeconds);
                                                    minutesInput.value = '';
                                                    secondsInput.value = '';
                                                }
                                            }}
                                        />
                                        <input
                                            type="number"
                                            min="0"
                                            max="59"
                                            placeholder="Seconds"
                                            className="w-24 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    const secondsInput = e.target as HTMLInputElement;
                                                    const minutesInput = secondsInput.previousElementSibling as HTMLInputElement;
                                                    const minutes = parseInt(minutesInput.value) || 0;
                                                    const seconds = parseInt(secondsInput.value) || 0;
                                                    const totalSeconds = (minutes * 60 + seconds).toString();
                                                    handleDurationSubmit(totalSeconds);
                                                    minutesInput.value = '';
                                                    secondsInput.value = '';
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-end">
                                    <button
                                        onClick={() => {
                                            const minutesInput = document.querySelector('input[placeholder="Minutes"]') as HTMLInputElement;
                                            const secondsInput = document.querySelector('input[placeholder="Seconds"]') as HTMLInputElement;
                                            const minutes = parseInt(minutesInput.value) || 0;
                                            const seconds = parseInt(secondsInput.value) || 0;
                                            if (minutes > 0 || seconds > 0) {
                                                const totalSeconds = (minutes * 60 + seconds).toString();
                                                handleDurationSubmit(totalSeconds);
                                                minutesInput.value = '';
                                                secondsInput.value = '';
                                            }
                                        }}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        Submit
                                    </button>
                                </div>
                            </div>
                            <p className="mt-2 text-sm text-gray-500">
                                {statistics?.topTracks.filter(t => t.duration).length} songs processed out of {statistics?.topTracks.length}
                            </p>
                        </div>
                    </div>
                )}

                {showGenreInput && currentGenreSong && (
                    <div className="mb-8 bg-white p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4 text-gray-900">Song Genre Input</h2>
                        <p className="text-gray-700 mb-4">
                            Please provide the genre for:
                            <br />
                            <span className="font-semibold">{currentGenreSong.track}</span> by {currentGenreSong.artist}
                            <br />
                            from the album {currentGenreSong.album}
                        </p>
                        <div className="space-y-4">
                            <div className="flex space-x-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Genre
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Enter genre"
                                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                const input = e.target as HTMLInputElement;
                                                if (input.value.trim()) {
                                                    handleGenreSubmit(input.value.trim());
                                                    input.value = '';
                                                }
                                            }
                                        }}
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button
                                        onClick={() => {
                                            const input = document.querySelector('input[placeholder="Enter genre"]') as HTMLInputElement;
                                            if (input.value.trim()) {
                                                handleGenreSubmit(input.value.trim());
                                                input.value = '';
                                            }
                                        }}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        Submit
                                    </button>
                                </div>
                            </div>
                            <p className="mt-2 text-sm text-gray-500">
                                {statistics?.topTracks.filter(t => t.genre).length} songs processed out of {statistics?.topTracks.length}
                            </p>
                        </div>
                    </div>
                )}

                {statistics && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-6 rounded-lg shadow">
                                <h2 className="text-xl font-semibold mb-4 text-gray-900">Basic Statistics</h2>
                                <div className="space-y-2">
                                    <p className="text-gray-700">
                                        Total Listening Time: <span className="font-semibold">{calculateTotalListeningTime().toFixed(2)} hours</span>
                                    </p>
                                    <p className="text-gray-700">
                                        Songs Processed: <span className="font-semibold">{statistics.topTracks.length} out of {statistics.topTracks.length}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <h2 className="text-xl font-semibold mb-4 text-gray-900">Listening Patterns by Hour</h2>
                            <div className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={statistics.listeningPatterns.byHour}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="hour" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="count" fill="#3b82f6" name="Tracks Played" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white p-6 rounded-lg shadow">
                                <h2 className="text-xl font-semibold mb-4 text-gray-900">Top Artists</h2>
                                <ul className="space-y-2">
                                    {statistics.topArtists.map((artist, index) => (
                                        <li key={artist.name} className="flex justify-between items-center">
                                            <span className="text-gray-700">
                                                <span className="font-semibold">{index + 1}.</span> {artist.name}
                                            </span>
                                            <span className="text-gray-500">{artist.count}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow">
                                <h2 className="text-xl font-semibold mb-4 text-gray-900">Top Albums</h2>
                                <ul className="space-y-2">
                                    {statistics.topAlbums.map((album, index) => {
                                        const albumDuration = calculateAlbumDuration(album.name);
                                        return (
                                            <li key={album.name} className="flex justify-between items-center">
                                                <div className="flex flex-col">
                                                    <span className="text-gray-700">
                                                        <span className="font-semibold">{index + 1}.</span> {album.name}
                                                    </span>
                                                    {albumDuration > 0 && (
                                                        <span className="text-sm text-gray-500">
                                                            Total Duration: {formatDuration(albumDuration)}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-gray-500">{album.count}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow">
                                <h2 className="text-xl font-semibold mb-4 text-gray-900">Top Tracks</h2>
                                <ul className="space-y-2">
                                    {statistics.topTracks.map((track, index) => {
                                        const songDuration = statistics.topTracks.find(
                                            t => t.name === track.name && 
                                                t.artist === track.artist && 
                                                t.album === track.album
                                        );
                                        return (
                                            <li key={track.name} className="flex justify-between items-center">
                                                <span className="text-gray-700">
                                                    <span className="font-semibold">{index + 1}.</span> {track.name}
                                                </span>
                                                <div className="flex items-center space-x-4">
                                                    {songDuration?.duration && (
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-sm text-gray-500">
                                                                {formatDuration(parseInt(songDuration.duration))}
                                                                {songDuration.genre && ` • ${songDuration.genre}`}
                                                            </span>
                                                            <button
                                                                onClick={() => {
                                                                    const newDuration = prompt('Enter new duration in seconds:', songDuration.duration);
                                                                    const newGenre = prompt('Enter new genre:', songDuration.genre || '');
                                                                    const updates: { duration?: string; genre?: string } = {};
                                                                    
                                                                    if (newDuration) {
                                                                        updates.duration = newDuration;
                                                                    }
                                                                    if (newGenre) {
                                                                        updates.genre = newGenre;
                                                                    }
                                                                    
                                                                    if (Object.keys(updates).length > 0) {
                                                                        handleEditDuration(track, updates);
                                                                    }
                                                                }}
                                                                className="text-blue-500 hover:text-blue-700 text-sm"
                                                            >
                                                                Edit
                                                            </button>
                                                        </div>
                                                    )}
                                                    <span className="text-gray-500">{track.count}</span>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
} 