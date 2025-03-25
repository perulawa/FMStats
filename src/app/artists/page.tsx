'use client';

import React, { useState, useEffect } from 'react';
import { MusicAnalyzer } from '@/utils/musicAnalyzer';
import { Statistics } from '@/types/music';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer
} from 'recharts';
import {
    UserGroupIcon,
    MusicalNoteIcon,
    ClockIcon,
    ChartBarIcon,
    CalendarIcon
} from '@heroicons/react/24/outline';

interface SongDuration {
    artist: string;
    album: string;
    track: string;
    duration: number;
}

const StatNavIcon = ({ icon: Icon, label, href, active }: { 
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    label: string;
    href: string;
    active: boolean;
}) => (
    <a
        href={href}
        className={`p-2 rounded-full transition-colors duration-200 ${
            active 
                ? 'bg-blue-100 text-blue-600' 
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
        }`}
        title={label}
    >
        <Icon className="w-6 h-6" />
    </a>
);

export default function ArtistsPage() {
    const [statistics, setStatistics] = useState<Statistics | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [songDurations, setSongDurations] = useState<SongDuration[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const artistsPerPage = 10;

    useEffect(() => {
        const savedDurations = localStorage.getItem('songDurations');
        if (savedDurations) {
            setSongDurations(JSON.parse(savedDurations));
        }
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/sample.csv');
            const text = await response.text();
            const file = new File([text], 'sample.csv', { type: 'text/csv' });
            const analyzer = new MusicAnalyzer();
            await analyzer.parseCSV(file);
            const stats = analyzer.analyze();
            console.log('Loaded statistics:', {
                totalArtists: stats.topArtists.length,
                artists: stats.topArtists
            });
            setStatistics(stats);
        } catch (err) {
            setError('Error loading data. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const calculateArtistDuration = (artistName: string) => {
        if (!statistics) return 0;
        
        let totalTime = 0;
        statistics.topTracks.forEach(track => {
            if (track.artist === artistName && track.duration) {
                totalTime += parseInt(track.duration) * track.count;
            }
        });
        return totalTime;
    };

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    const calculateArtistAlbums = (artistName: string) => {
        if (!statistics) return 0;
        
        // Get unique albums for this artist from all tracks
        const uniqueAlbums = new Set(
            statistics.topTracks
                .filter(track => track.artist === artistName)
                .map(track => track.album)
        );
        
        return uniqueAlbums.size;
    };

    const calculateAverageStreamsPerSong = (artistName: string) => {
        if (!statistics) return 0;
        
        // Get all tracks for this artist
        const artistTracks = statistics.topTracks.filter(track => track.artist === artistName);
        if (artistTracks.length === 0) return 0;
        
        // Calculate total plays and number of unique songs
        const totalPlays = artistTracks.reduce((sum, track) => sum + track.count, 0);
        const uniqueSongs = artistTracks.length;
        
        return totalPlays / uniqueSongs;
    };

    // Calculate pagination values
    const totalPages = statistics ? Math.ceil(statistics.topArtists.length / artistsPerPage) : 0;
    const startIndex = (currentPage - 1) * artistsPerPage;
    const endIndex = startIndex + artistsPerPage;
    const currentArtists = statistics ? statistics.topArtists.slice(startIndex, endIndex) : [];

    console.log('Pagination:', {
        currentPage,
        totalPages,
        startIndex,
        endIndex,
        currentArtistsLength: currentArtists.length,
        totalArtists: statistics?.topArtists.length
    });

    const handlePageChange = (newPage: number) => {
        console.log('Changing page to:', newPage);
        setCurrentPage(newPage);
    };

    if (loading) {
        return (
            <div className="min-h-screen p-8 bg-gray-50">
                <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <p className="mt-2 text-gray-600">Loading artist statistics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen p-8 bg-gray-50">
                <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-8">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen p-8 bg-gray-50">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-4xl font-bold text-gray-900">Artist Statistics</h1>
                    <div className="flex items-center space-x-2">
                        <StatNavIcon
                            icon={ChartBarIcon}
                            label="Overview"
                            href="/"
                            active={false}
                        />
                        <StatNavIcon
                            icon={UserGroupIcon}
                            label="Artist Statistics"
                            href="/artists"
                            active={true}
                        />
                        <StatNavIcon
                            icon={MusicalNoteIcon}
                            label="Album Statistics"
                            href="/albums"
                            active={false}
                        />
                        <StatNavIcon
                            icon={ClockIcon}
                            label="Time Analysis"
                            href="/time"
                            active={false}
                        />
                        <StatNavIcon
                            icon={CalendarIcon}
                            label="Trends"
                            href="/trends"
                            active={false}
                        />
                    </div>
                </div>

                {statistics && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-6 rounded-lg shadow">
                                <h2 className="text-xl font-semibold mb-4 text-gray-900">Artist Overview</h2>
                                <div className="space-y-2">
                                    <p className="text-gray-700">
                                        Total Artists: <span className="font-semibold">{statistics.topArtists.length}</span>
                                    </p>
                                    <p className="text-gray-700">
                                        Most Played Artist: <span className="font-semibold">{statistics.topArtists[0].name}</span>
                                        <span className="text-gray-500 ml-2">({statistics.topArtists[0].count} plays)</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <h2 className="text-xl font-semibold mb-4 text-gray-900">Artist Play Distribution</h2>
                            <div className="h-[600px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={statistics.topArtists.filter(artist => artist.count >= 2)}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis 
                                            dataKey="name" 
                                            angle={-45}
                                            textAnchor="end"
                                            height={100}
                                            interval={0}
                                            tick={{ fontSize: 12 }}
                                        />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="count" fill="#3b82f6" name="Plays" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <h2 className="text-xl font-semibold mb-4 text-gray-900">All Artists</h2>
                            <div className="space-y-4">
                                {currentArtists.map((artist, index) => {
                                    const totalDuration = calculateArtistDuration(artist.name);
                                    const albumCount = calculateArtistAlbums(artist.name);
                                    return (
                                        <div key={artist.name} className="border-b pb-4 last:border-b-0">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-900">
                                                        {startIndex + index + 1}. {artist.name}
                                                    </h3>
                                                    <p className="text-sm text-gray-500">
                                                        {albumCount} album{albumCount !== 1 ? 's' : ''}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-gray-700">
                                                        {artist.count} play{artist.count !== 1 ? 's' : ''}
                                                    </p>
                                                    {totalDuration > 0 && (
                                                        <p className="text-sm text-gray-500">
                                                            {Math.round(totalDuration / 60)}m {totalDuration % 60}s
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination Controls */}
                            <div className="mt-6 flex justify-center items-center space-x-2">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className={`px-3 py-1 rounded-md ${
                                        currentPage === 1
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-blue-500 text-white hover:bg-blue-600'
                                    }`}
                                >
                                    Previous
                                </button>
                                <span className="text-gray-700">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className={`px-3 py-1 rounded-md ${
                                        currentPage === totalPages
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-blue-500 text-white hover:bg-blue-600'
                                    }`}
                                >
                                    Next
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-6 rounded-lg shadow">
                                <h2 className="text-xl font-semibold mb-4 text-gray-900">Most Streamed</h2>
                                <div className="space-y-2">
                                    {statistics.topArtists
                                        .map(artist => ({
                                            name: artist.name,
                                            duration: calculateArtistDuration(artist.name)
                                        }))
                                        .sort((a, b) => b.duration - a.duration)
                                        .slice(0, 10)
                                        .map((artist, index) => (
                                            <div key={artist.name} className="flex justify-between items-center text-sm">
                                                <div className="truncate pr-4">
                                                    <span className="font-medium text-gray-900">
                                                        {index + 1}. {artist.name}
                                                    </span>
                                                </div>
                                                <div className="text-right whitespace-nowrap">
                                                    <span className="text-gray-700">
                                                        {formatDuration(artist.duration)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow">
                                <h2 className="text-xl font-semibold mb-4 text-gray-900">Average Streams per Song</h2>
                                <div className="space-y-2">
                                    {statistics.topArtists
                                        .map(artist => ({
                                            name: artist.name,
                                            avgStreams: calculateAverageStreamsPerSong(artist.name)
                                        }))
                                        .sort((a, b) => b.avgStreams - a.avgStreams)
                                        .slice(0, 10)
                                        .map((artist, index) => (
                                            <div key={artist.name} className="flex justify-between items-center text-sm">
                                                <div className="truncate pr-4">
                                                    <span className="font-medium text-gray-900">
                                                        {index + 1}. {artist.name}
                                                    </span>
                                                </div>
                                                <div className="text-right whitespace-nowrap">
                                                    <span className="text-gray-700">
                                                        {Math.round(artist.avgStreams)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
} 