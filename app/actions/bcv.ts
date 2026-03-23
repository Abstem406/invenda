"use server";

import https from "https";

export async function getBcvRate(): Promise<number | null> {
    return new Promise((resolve) => {
        const req = https.get('https://www.bcv.org.ve/', {
            // Need a valid seeming User-Agent, otherwise the request might be blocked
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            // BCV certificate is often invalid/self-signed
            rejectUnauthorized: false
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    //The value is in a container with id="dolar"
                    const dolarDiv = data.split('id="dolar"')[1];
                    if (dolarDiv) {
                        const strongMatch = dolarDiv.match(/<strong>\s*([\d,]+)\s*<\/strong>/);
                        if (strongMatch) {
                            // Example: "457,07570000"
                            const valStr = strongMatch[1].replace(',', '.');

                            // Truncate to two decimals 
                            const matchTruncate = valStr.match(/^-?\d+(?:\.\d{0,2})?/);
                            if (matchTruncate && matchTruncate[0]) {
                                resolve(parseFloat(matchTruncate[0]));
                                return;
                            }
                        }
                    }
                    resolve(null);
                } catch (error) {
                    console.error("Error parsing BCV HTML", error);
                    resolve(null);
                }
            });
        });

        req.on('error', (err) => {
            console.error("Error fetching BCV", err);
            resolve(null);
        });

        req.end();
    });
}
