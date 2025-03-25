# FMStats - Music Listening History Analyzer

A web application that analyzes your music listening history, providing insights into your listening patterns, favorite artists, albums, and genres.

## Features

- Upload and analyze your music listening history from CSV files
- View detailed statistics about your listening habits
- Track duration and genre management
- Interactive charts and visualizations
- Multiple views for different aspects of your music history:
  - Overview
  - Artist Statistics
  - Album Statistics
  - Track Statistics
  - Genre Statistics

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Recharts for data visualization
- Heroicons for UI icons

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/FMStats.git
cd FMStats
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `/src/app` - Next.js app router pages and components
- `/src/utils` - Utility functions and data processing
- `/src/types` - TypeScript type definitions
- `/public` - Static assets and sample data

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## CSV Format

Your CSV file should have the following columns:
- timestamp: The date and time when the track was played (format: YYYY-MM-DD HH:mm:ss)
- artist: The name of the artist
- album: The name of the album
- track: The name of the track
- duration: The duration of the track in seconds

### Example CSV Format

```csv
timestamp,artist,album,track,duration
2024-03-15 14:30:00,The Beatles,Abbey Road,Come Together,259
2024-03-15 14:34:19,The Beatles,Abbey Road,Something,183
```

A sample CSV file is provided in the `public/sample.csv` file.

## Technologies Used

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Recharts for data visualization
- Papa Parse for CSV parsing

## License

MIT License 