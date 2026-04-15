const puppeteer = require('puppeteer');
const fs = require('fs');
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    try {
        console.log("Starting Masterpiece Verification...");
        const browser = await puppeteer.launch({ 
            headless: "new", 
            args: ['--autoplay-policy=no-user-gesture-required', '--window-size=1920,1080'] 
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle2' });
        console.log("Page loaded.");
        
        await wait(3500); // Intro
        await page.screenshot({ path: 'masterpiece_identity.png' });
        console.log("Captured Identity (Masterpiece).");

        // Rotate to see edges and brackets better (oblique view)
        await page.mouse.move(960, 540);
        await page.mouse.down();
        await page.mouse.move(1100, 400); 
        await page.mouse.up();
        await wait(1000);
        await page.screenshot({ path: 'masterpiece_oblique.png' });
        console.log("Captured Oblique view (Edges & Brackets).");

        await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
        await wait(1500);
        await page.screenshot({ path: 'masterpiece_livesets.png' });
        console.log("Captured Live Sets (Masterpiece).");

        await browser.close();
        console.log("Masterpiece Verification complete.");
    } catch (err) {
        console.error("Verification error:", err);
    }
})();
