// pages/api/shortenUrl.js

import { BitlyClient } from 'bitly';

const bitly = new BitlyClient('068dfecf9be53747723678426ca6758a0c9df94d', {});

export default async function handler(req, res) {
    console.log('inside handler');
    
    if (req.method === 'POST') {
        try {
            const body = JSON.parse(req.body);
            const { longUrl } = body;

            const response = await bitly.shorten(longUrl);
            res.status(200).json({ shortUrl: response.link });
        } catch (error) {
            console.error('Error shortening URL:', error);
            res.status(500).json({ error: 'Failed to shorten URL' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
