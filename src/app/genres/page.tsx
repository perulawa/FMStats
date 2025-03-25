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
    ChartBarIcon,
    QueueListIcon,
    HashtagIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface GenreStats {
    name: string;
    trackCount: number;
    playCount: number;
    totalDuration: number;
    artists: number;
    albums: number;
}

interface GenreData {
    name: string;
    trackCount: number;
    playCount: number;
    totalDuration: number;
    artists: Set<string>;
    albums: Set<string>;
}

const COLORS = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#6366f1',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4'
];

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

export default function GenresPage() {
    const [statistics, setStatistics] = useState<Statistics | null>(null);
    const [genreStats, setGenreStats] = useState<GenreStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activePage, setActivePage] = useState('genres');
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
            calculateGenreStats(stats);
        } catch (err) {
            setError('Error processing data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [getAnalyzer]);

    useEffect(() => {
        const loadDevData = async () => {
            try {
                const response = await fetch('/sample.csv');
                if (!response.ok) {
                    throw new Error(`Failed to load sample data: ${response.status} ${response.statusText}`);
                }
                const text = await response.text();
                if (!text.trim()) {
                    throw new Error('Sample data file is empty');
                }
                const file = new File([text], 'sample.csv', { type: 'text/csv' });
                await loadData(file);
            } catch (err) {
                console.error('Error loading sample data:', err);
                setError(err instanceof Error ? err.message : 'Error loading sample data. Please try again.');
            }
        };

        loadDevData();
    }, [loadData]);

    // Memoize the genre stats calculation
    const calculateGenreStats = useCallback((stats: Statistics) => {
        const genreMap = new Map<string, GenreData>();

        stats.topTracks.forEach(track => {
            if (!track.genre) return;

            const genre = track.genre.trim();
            if (!genre) return;

            if (!genreMap.has(genre)) {
                genreMap.set(genre, {
                    name: genre,
                    trackCount: 0,
                    playCount: 0,
                    totalDuration: 0,
                    artists: new Set(),
                    albums: new Set()
                });
            }

            const genreStat = genreMap.get(genre)!;
            genreStat.trackCount++;
            genreStat.playCount += track.count;
            if (track.duration) {
                genreStat.totalDuration += parseInt(track.duration) * track.count;
            }
            if (track.artist) genreStat.artists.add(track.artist);
            if (track.album) genreStat.albums.add(track.album);
        });

        const genreStatsArray = Array.from(genreMap.values())
            .map(stat => ({
                name: stat.name,
                trackCount: stat.trackCount,
                playCount: stat.playCount,
                totalDuration: stat.totalDuration,
                artists: stat.artists.size,
                albums: stat.albums.size
            }))
            .sort((a, b) => b.playCount - a.playCount);

        setGenreStats(genreStatsArray);
    }, []);

    // Memoize the duration formatting function
    const formatDuration = useCallback((seconds: number): string => {
        if (seconds >= 3600) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        } else {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}m ${remainingSeconds}s`;
        }
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>
            </div>
        );
    }

    return (
        <main className="min-h-screen p-8 bg-gray-50">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-4xl font-bold text-gray-900">Music Listening History Analyzer</h1>
                    <div className="flex items-center space-x-2">
                        <StatNavIcon
                            icon={ChartBarIcon}
                            label="Overview"
                            href="/"
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

                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Genre Distribution Chart */}
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h2 className="text-xl font-semibold mb-4 text-gray-900">Genre Distribution</h2>
                            <div className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={genreStats.slice(0, 10)}
                                            dataKey="playCount"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={150}
                                            label={({ name, percent }) => 
                                                `${name} (${(percent * 100).toFixed(1)}%)`
                                            }
                                        >
                                            {genreStats.slice(0, 10).map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Genre Listening Time */}
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h2 className="text-xl font-semibold mb-4 text-gray-900">Genre Listening Time</h2>
                            <div className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={genreStats.slice(0, 10)}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip 
                                            formatter={(value: number) => [
                                                formatDuration(value),
                                                "Total Duration"
                                            ]}
                                        />
                                        <Bar dataKey="totalDuration" fill="#3b82f6" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Genre Details Table */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4 text-gray-900">Genre Details</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Genre</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tracks</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Plays</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Duration</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Artists</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Albums</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {genreStats.map((genre, index) => (
                                        <tr key={genre.name} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {genre.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {genre.trackCount}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {genre.playCount}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDuration(genre.totalDuration)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {genre.artists}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {genre.albums}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
} 