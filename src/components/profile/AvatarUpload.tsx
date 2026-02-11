'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Camera, User } from 'lucide-react';

interface AvatarUploadProps {
	currentImage?: string | null;
	onUpload: (url: string) => void;
}

export function AvatarUpload({ currentImage, onUpload }: AvatarUploadProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [preview, setPreview] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);

	const displayImage = preview ?? currentImage;

	async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;

		// Show preview immediately
		const objectUrl = URL.createObjectURL(file);
		setPreview(objectUrl);

		// Upload
		setUploading(true);
		try {
			const formData = new FormData();
			formData.append('file', file);
			const res = await fetch('/api/upload/avatar', {
				method: 'POST',
				body: formData,
			});
			if (!res.ok) throw new Error('Upload failed');
			const data = await res.json();
			onUpload(data.url);
		} catch {
			// Revert preview on failure
			setPreview(null);
		} finally {
			setUploading(false);
			URL.revokeObjectURL(objectUrl);
		}
	}

	return (
		<div className="relative group">
			<button
				type="button"
				onClick={() => fileInputRef.current?.click()}
				className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				disabled={uploading}
			>
				{displayImage ? (
					<Image
						src={displayImage}
						alt="Avatar"
						width={96}
						height={96}
						className="h-full w-full object-cover"
						unoptimized={displayImage.startsWith("blob:")}
					/>
				) : (
					<span className="flex h-full w-full items-center justify-center bg-muted">
						<User size={32} className="text-muted-foreground" />
					</span>
				)}

				{/* Hover overlay */}
				<span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
					<Camera size={20} className="text-white" />
				</span>

				{/* Uploading overlay */}
				{uploading && (
					<span className="absolute inset-0 flex items-center justify-center bg-black/50">
						<span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
					</span>
				)}
			</button>

			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={handleFileChange}
			/>
		</div>
	);
}
