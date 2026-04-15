const puppeteer = require('puppeteer');
const fs = require('fs');
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    try {
        console.log("Starting Phase 5 Final Verification...");
        const browser = await puppeteer.launch({ 
            headless: "new", 
            args: ['--autoplay-policy=no-user-gesture-required', '--window-size=1920,1080'] 
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle2' });
        console.log("Page loaded.");
        
        await wait(3500); // Wait for intro
        await page.screenshot({ path: 'phase5_identity.png' });
        console.log("Captured Identity face (Phase 5).");

        await page.keyboard.press('ArrowRight');
        await wait(200);
        await page.keyboard.press('ArrowRight');
        await wait(1500);
        await page.screenshot({ path: 'phase5_livesets.png' });
        console.log("Captured Live Sets (Phase 5).");

        await page.keyboard.press('ArrowRight');
        await wait(1500);
        await page.screenshot({ path: 'phase5_studio.png' });
        console.log("Captured Studio (Phase 5).");

        await browser.close();
        console.log("Phase 5 Verification sequence complete.");
    } catch (err) {
        console.error("Verification error:", err);
    }
})();
