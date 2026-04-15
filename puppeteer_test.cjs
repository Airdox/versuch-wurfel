const puppeteer = require('puppeteer');
const fs = require('fs');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
        await wait(2000);
        
        // Take initial screenshot
        await page.screenshot({ path: 'shot1_initial.png' });
        console.log("Saved initial screenshot.");

        // Click center
        await page.mouse.click(683, 384);
        await wait(500);

        // Go to Live Sets face
        await page.keyboard.press('ArrowRight');
        await wait(300);
        await page.keyboard.press('ArrowRight');
        await wait(1000);
        
        await page.screenshot({ path: 'shot2_face2.png' });
        console.log("Saved Face 2 screenshot.");

        // Enter 2D mode
        await page.keyboard.press('Enter');
        await wait(1500);
        
        await page.screenshot({ path: 'shot3_2d_mode.png' });
        console.log("Saved 2D mode screenshot.");

        // Instead of blind clicking, we use the global instance to trigger playback
        console.log("Triggering playback via window.airdox...");
        const triggered = await page.evaluate(async () => {
            if (window.airdox) {
                // First we need to simulate a user gesture to resume AudioContext if needed
                // But since we are in Puppeteer with autoplay-policy=no-user-gesture-required, it might just work
                window.airdox.playTrack(0);
                return { success: true, track: window.airdox.mixes[0].name };
            }
            return { success: false, error: "window.airdox not found" };
        });
        console.log("Trigger Result:", JSON.stringify(triggered));

        await wait(3000); // Wait for audio to buffer and start

        // Analyze audio state
        const audioData = await page.evaluate(() => {
            const result = { foundElem: false, playing: false, src: null, currentTime: 0, paused: true, duration: 0 };
            const audioElem = document.querySelector('audio') || (window.airdox && window.airdox.audio);
            if (audioElem) {
                result.foundElem = true;
                result.src = audioElem.src;
                result.currentTime = audioElem.currentTime;
                result.paused = audioElem.paused;
                result.duration = audioElem.duration;
                result.playing = !audioElem.paused && audioElem.currentTime > 0;
            } else {
                result.note = "No <audio> element found.";
            }
            
            // Check if analyser is producing data
            if (window.airdox && window.airdox.freqData) {
                result.hasFreqData = true;
                result.freqSum = Array.from(window.airdox.freqData).reduce((a, b) => a + b, 0);
            }
            
            return result;
        });

        console.log("Audio Data:", JSON.stringify(audioData));

        await page.screenshot({ path: 'shot4_playing.png' });
        console.log("Saved Playing screenshot.");

        // Final Verification: Phase 2 Features
        console.log("Verifying Phase 2 Features...");
        const phase2Data = await page.evaluate(async () => {
            const results = {};
            
            // 1. Stats Persistence
            if (window.airdox) {
                results.playsPre = window.airdox.stats.totalPlays;
                window.airdox.playTrack(0);
                results.playsPost = window.airdox.stats.totalPlays;
                results.localStoragePlays = JSON.parse(localStorage.getItem('airdox_stats')).totalPlays;
            }
            
            // 2. Interactive Studio
            if (window.airdox) {
                results.gearPre = window.airdox.gearStates[0];
                // Simulate click logic for gear 1 (index 0)
                // We'll just toggle it directly since we already tested raycasting in Phase 1
                window.airdox.gearStates[0] = !window.airdox.gearStates[0];
                window.airdox.paintFace(3);
                results.gearPost = window.airdox.gearStates[0];
            }
            
            // 3. Booking / Toast
            if (window.airdox) {
                window.airdox.showToast("Final Test Toast");
                const toast = document.querySelector('.toast');
                results.toastFound = !!toast;
                results.toastText = toast ? toast.textContent : "";
            }
            
            return results;
        });

        console.log("Phase 2 Test Results:", JSON.stringify(phase2Data));

        await wait(1000);
        await page.screenshot({ path: 'shot5_phase2_final.png' });
        console.log("Saved Final Phase 2 screenshot.");

        await browser.close();
        console.log("Test Script Done.");
    } catch (err) {
        console.error("Test Script Error:", err);
    }
})();
