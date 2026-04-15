const puppeteer = require('puppeteer');
const fs = require('fs');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    try {
        console.log("Starting Phase 4 Final Verification...");
        const browser = await puppeteer.launch({ 
            headless: "new", 
            args: ['--autoplay-policy=no-user-gesture-required', '--window-size=1920,1080'] 
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        page.on('console', msg => { if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text()); });

        await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle2' });
        console.log("Page loaded.");
        
        // Wait for loader
        await wait(3000);
        
        // 1. IDENTITY FACE
        await page.screenshot({ path: 'phase4_identity.png' });
        console.log("Captured Identity face.");

        // 2. LIVE SETS FACE (Rotate right x2)
        await page.keyboard.press('ArrowRight');
        await wait(200);
        await page.keyboard.press('ArrowRight');
        await wait(1500);
        
        // Trigger a track to show timeline and visualizer interaction
        await page.evaluate(() => { if (window.airdox) window.airdox.playTrack(0); });
        await wait(2000);
        await page.screenshot({ path: 'phase4_livesets_playing.png' });
        console.log("Captured Live Sets playing.");

        // 3. STUDIO FACE (Rotate once more)
        await page.keyboard.press('ArrowRight');
        await wait(1500);
        
        // Toggle some gear
        await page.evaluate(() => { if (window.airdox) { window.airdox.gearStates[0] = true; window.airdox.gearStates[2] = true; window.airdox.paintFace(3); } });
        await wait(500);
        await page.screenshot({ path: 'phase4_studio_gear.png' });
        console.log("Captured Studio gear toggled.");

        await browser.close();
        console.log("Verification sequence complete.");
    } catch (err) {
        console.error("Verification error:", err);
    }
})();
