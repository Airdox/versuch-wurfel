import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * AUTOMATIC TRACKLIST GENERATOR (AcoustID)
 * 
 * Usage: node scripts/generate_tracklists.js <file_path_or_dir> <acoustid_key>
 */

const args = process.argv.slice(2);
const TARGET = args[0];
const API_KEY = args[1] || 'YOUR_API_KEY_HERE';

if (!TARGET) {
    console.error("Usage: node scripts/generate_tracklists.js <file_path_or_dir> [api_key]");
    process.exit(1);
}

const EXTENSIONS = ['.mp3', '.wav', '.flac', '.m4a'];

async function processFile(filePath) {
    const fileName = path.basename(filePath, path.extname(filePath));
    const outputJson = path.join(process.cwd(), 'public', 'data', `tracklist_${fileName}.json`);
    
    console.log(`\n>>> Processing: ${fileName}`);
    
    // 1. Get Duration
    let duration = 0;
    try {
        const ffprobe = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`).toString();
        duration = parseFloat(ffprobe);
        console.log(`   Length: ${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s`);
    } catch (e) {
        console.error("   Error: Could not get duration via ffprobe.");
        return;
    }

    // 2. Sample and Fingerprint
    // We sample every 5 minutes (offset by 1m to avoid intros)
    const interval = 300; // 5 minutes
    const sampleDuration = 30;
    const tracklist = [];

    for (let offset = 60; offset < duration - sampleDuration; offset += interval) {
        const timestampStr = new Date(offset * 1000).toISOString().substr(11, 8);
        process.stdout.write(`   [${timestampStr}] Scanning... `);

        const tempSample = `temp_sample_${offset}.wav`;
        try {
            // Extract 30s sample
            execSync(`ffmpeg -y -ss ${offset} -t ${sampleDuration} -i "${filePath}" -ar 11025 -ac 1 "${tempSample}"`, { stdio: 'ignore' });
            
            // Get Fingerprint
            const fpResult = JSON.parse(execSync(`fpcalc -json "${tempSample}"`).toString());
            
            // Query AcoustID
            const response = await fetch(`https://api.acoustid.org/v2/lookup?client=${API_KEY}&meta=recordings+releases+artists&duration=${fpResult.duration}&fingerprint=${fpResult.fingerprint}`);
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const best = data.results[0].recordings[0];
                const artist = best.artists ? best.artists.map(a => a.name).join(', ') : 'Unknown';
                const title = best.title || 'Unknown';
                console.log(`Found: ${artist} - ${title}`);
                
                tracklist.push({
                    time: offset,
                    timestamp: timestampStr,
                    artist,
                    title,
                    display: `${artist} - ${title}`
                });
            } else {
                console.log("No match found.");
            }
        } catch (e) {
            console.log("Error or No Match.");
        } finally {
            if (fs.existsSync(tempSample)) fs.unlinkSync(tempSample);
        }
    }

    // 3. Save
    if (tracklist.length > 0) {
        // Ensure dir exists
        const dataDir = path.dirname(outputJson);
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

        fs.writeFileSync(outputJson, JSON.stringify({
            track: fileName,
            generatedAt: new Date().toISOString(),
            tracklist
        }, null, 2));
        console.log(`>>> DONE! Tracklist saved to: ${outputJson}`);
    } else {
        console.log(">>> Finished scanning, but no tracks were identified.");
    }
}

async function start() {
    if (fs.lstatSync(TARGET).isDirectory()) {
        const files = fs.readdirSync(TARGET);
        for (const file of files) {
            if (EXTENSIONS.includes(path.extname(file).toLowerCase())) {
                await processFile(path.join(TARGET, file));
            }
        }
    } else {
        await processFile(TARGET);
    }
}

start().catch(console.error);
