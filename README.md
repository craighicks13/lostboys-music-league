# Lost Boys Music League

A React application that displays a table of artists and songs from a Spotify playlist. Users can search for artists to check if they're already in the Lost Boys Music League.

## Features

- Display a table of artists and their songs from a Spotify playlist
- Fallback to local CSV data if Spotify API is unavailable
- Expand/collapse artist entries to see their songs
- Search for artists
- Confetti celebration when an artist is not found in the list
- Warning dialog when an artist is already in the list

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui for UI components
- PapaParse for CSV parsing (fallback)
- Spotify Web API for playlist data
- react-confetti for the celebration effect

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the root directory with the following content:
   ```
   NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_client_id_here
   SPOTIFY_CLIENT_SECRET=your_client_secret_here
   ```
4. Replace the placeholders with your actual Spotify API credentials:
   - Get your credentials by creating an app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/)
   - Make sure to set the correct redirect URI in your Spotify app settings
5. Run the development server:
   ```
   npm run dev
   ```
6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Spotify Integration

This app uses the Spotify Web API to fetch data from a specific playlist. If the API call fails (due to missing or invalid credentials), the app will fall back to using the local CSV file for data.

The playlist is hardcoded to use ID `6oicpmZcmaD6rqjhfqge7l` (Total Lost Boys Music League). If you want to use a different playlist, update the `SPOTIFY_PLAYLIST_ID` in `src/lib/spotify.ts`.

## Deployment

This app is configured for deployment on Vercel. Simply connect your GitHub repository to Vercel for automatic deployments.

For deployment, you'll need to add the following environment variables in your Vercel project settings:

- `NEXT_PUBLIC_SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
