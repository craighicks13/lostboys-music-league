export type Song = {
	id: string;
	number: number;
	song: string;
	artist: string;
	popularity: number;
	bpm: number;
	genres: string;
	album: string;
	albumDate: string;
	time: string;
	spotify: string;
	// Add any other fields you might need later
};

export type Artist = {
	name: string;
	songs: Song[];
};
