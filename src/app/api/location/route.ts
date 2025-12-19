import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        // Get client IP from headers (works in production behind proxy)
        const forwardedFor = request.headers.get('x-forwarded-for');
        const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : null;

        // Use ip-api.com (free, no API key needed, allows server-side)
        const apiUrl = clientIp
            ? `http://ip-api.com/json/${clientIp}?fields=status,country,city,query`
            : 'http://ip-api.com/json/?fields=status,country,city,query';

        const response = await fetch(apiUrl, {
            headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
            return NextResponse.json({ country: null, city: null, ip: null });
        }

        const data = await response.json();

        if (data.status !== 'success') {
            return NextResponse.json({ country: null, city: null, ip: null });
        }

        return NextResponse.json({
            country: data.country || null,
            city: data.city || null,
            ip: data.query || clientIp || null,
        });

    } catch (error) {
        console.warn('Location API error:', error);
        return NextResponse.json({ country: null, city: null, ip: null });
    }
}
