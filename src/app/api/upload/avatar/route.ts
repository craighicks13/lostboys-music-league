import { put } from '@vercel/blob';
import { auth } from '@/auth';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
	const result = await auth.api.getSession({ headers: await headers() });
	if (!result?.user?.id) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const formData = await request.formData();
	const file = formData.get('file') as File;
	if (!file) {
		return NextResponse.json(
			{ error: 'No file provided' },
			{ status: 400 }
		);
	}

	const blob = await put(`avatars/${result.user.id}/${file.name}`, file, {
		access: 'public',
		addRandomSuffix: true,
	});

	return NextResponse.json({ url: blob.url });
}
