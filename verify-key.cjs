const fs = require('fs');
const https = require('https');
const path = require('path');

// 1. Read API KEY from .env.local
const envPath = path.join(__dirname, '.env.local');
let apiKey = '';

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    let match = envContent.match(/VITE_GEMINI_API_KEY=(.*)/);
    if (!match) {
        match = envContent.match(/NEXT_PUBLIC_GOOGLE_API_KEY=(.*)/);
    }
    if (match && match[1]) {
        apiKey = match[1].trim().replace(/["']/g, '');
    }
} catch (e) {
    console.error("Error reading .env.local:", e.message);
    process.exit(1);
}

if (!apiKey) {
    console.error("API_KEY not found in .env.local");
    process.exit(1);
}

console.log(`Testing API Key: ${apiKey.substring(0, 5)}...`);

// 2. Test Call to Gemini API (gemini-3-pro-preview)
const model = 'models/gemini-1.5-flash';

const data = JSON.stringify({
    contents: [{
        parts: [{ text: "Hello, confirm you are working." }]
    }]
});

const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/${model}:generateContent?key=${apiKey}`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        if (res.statusCode === 200) {
            console.log("✅ API Key Verification SUCCESS!");
            console.log(`Model (${model}) responded (200 OK).`);
        } else {
            console.error(`❌ Connection Failed (Status: ${res.statusCode})`);
            console.error("Response:", body);
        }
    });
});

req.on('error', (e) => {
    console.error("Request Error:", e);
});

req.write(data);
req.end();
