import { useState, useEffect } from 'react';
import {
	Music,
	Headphones,
	Radio,
	Mic2,
	Disc,
	LucideIcon,
} from 'lucide-react';

const musicQuotes = [
	'Loading the greatest hits...',
	'Tuning the instruments...',
	'Getting the band back together...',
	'Dropping the beat any moment now...',
	'Turning it up to eleven...',
	'Finding that perfect harmony...',
	'Syncing up with the rhythm...',
	'Adjusting the equalizer...',
	'Music is about to happen...',
	'Warming up the vocal cords...',
];

const icons: LucideIcon[] = [Music, Headphones, Radio, Mic2, Disc];

export function MusicLoader() {
	const [quoteIndex, setQuoteIndex] = useState(0);
	const [iconIndex, setIconIndex] = useState(0);

	useEffect(() => {
		const quoteInterval = setInterval(() => {
			setQuoteIndex((prev) => (prev + 1) % musicQuotes.length);
		}, 2500);

		const iconInterval = setInterval(() => {
			setIconIndex((prev) => (prev + 1) % icons.length);
		}, 1000);

		return () => {
			clearInterval(quoteInterval);
			clearInterval(iconInterval);
		};
	}, []);

	const CurrentIcon = icons[iconIndex];

	return (
		<div className="flex flex-col items-center justify-center gap-4 py-12">
			<div className="relative flex items-center justify-center">
				<div className="animate-spin h-14 w-14 rounded-full border-2 border-stone-300 border-t-stone-800"></div>
				<div className="absolute">
					<CurrentIcon className="h-6 w-6 text-stone-800" />
				</div>
			</div>
			<p className="text-lg font-medium text-stone-700 italic text-center">
				{musicQuotes[quoteIndex]}
			</p>
		</div>
	);
}
