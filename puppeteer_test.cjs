const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    try {
        console.log("Starting Puppeteer test for Audio Playback...");
        const browser = await puppeteer.launch({ 
            headless: "new", 
            args: [
                '--autoplay-policy=no-user-gesture-required',
                '--window-size=1366,768'
            ] 
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });

        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

        await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
        console.log("Page loaded.");
        await page.waitForTimeout(2000);
        
        // Take initial screenshot
        await page.screenshot({ path: 'C:\\Users\\p_kro\\.gemini\\antigravity\\brain\\b19b8091-f144-4031-b6b0-03cfb649ca54\\artifacts\\shot1_initial.png' });
        console.log("Saved initial screenshot.");

        // Click center
        await page.mouse.click(683, 384);
        await page.waitForTimeout(500);

        // Go to Live Sets face
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(300);
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(1000);
        
        await page.screenshot({ path: 'C:\\Users\\p_kro\\.gemini\\antigravity\\brain\\b19b8091-f144-4031-b6b0-03cfb649ca54\\artifacts\\shot2_face2.png' });
        console.log("Saved Face 2 screenshot.");

        // Enter 2D mode
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1500);
        
        await page.screenshot({ path: 'C:\\Users\\p_kro\\.gemini\\antigravity\\brain\\b19b8091-f144-4031-b6b0-03cfb649ca54\\artifacts\\shot3_2d_mode.png' });
        console.log("Saved 2D mode screenshot.");

        // We aim for approx matching coordinates for tracks
        await page.mouse.click(200, 300); // Attempt to click first track text
        await page.waitForTimeout(2000);

        // Analyze audio state
        const audioData = await page.evaluate(() => {
            const result = { foundElem: false, playing: false, src: null, currentTime: 0, paused: true };
            const audioElem = document.querySelector('audio') || window._globalAudioElement || document.getElementById('global-audio-player');
            if (audioElem) {
                result.foundElem = true;
                result.src = audioElem.src;
                result.currentTime = audioElem.currentTime;
                result.paused = audioElem.paused;
                result.playing = !audioElem.paused && audioElem.currentTime > 0;
            } else {
                // If the app relies on WebAudio directly
                result.note = "No <audio> element found. Might be using Web Audio API completely.";
            }
            return result;
        });

        console.log("Audio Data:", JSON.stringify(audioData));

        await page.screenshot({ path: 'C:\\Users\\p_kro\\.gemini\\antigravity\\brain\\b19b8091-f144-4031-b6b0-03cfb649ca54\\artifacts\\shot4_playing.png' });
        console.log("Saved Playing screenshot.");

        await browser.close();
        console.log("Test Script Done.");
    } catch (err) {
        console.error("Test Script Error:", err);
    }
})();
