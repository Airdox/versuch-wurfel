const puppeteer = require('puppeteer');
const fs = require('fs');
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    try {
        console.log("Starting Final UI Verification...");
        const browser = await puppeteer.launch({ 
            headless: "new", 
            args: ['--autoplay-policy=no-user-gesture-required', '--window-size=1920,1080'] 
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle2' });
        console.log("Page loaded.");
        
        await wait(3500); // Intro
        
        // 1. Snapshot Initial
        await page.screenshot({ path: 'final_ui_initial.png' });
        console.log("Captured Initial UI (Identity).");

        // 2. Test NEXT Button
        await page.click('#nextBtn');
        await wait(1500);
        await page.screenshot({ path: 'final_ui_next.png' });
        console.log("Tested NEXT button (moved to face 1).");

        // 3. Test Dot 3 (Live Sets)
        const dots = await page.$$('.face-dot');
        await dots[2].click();
        await wait(1500);
        await page.screenshot({ path: 'final_ui_dot3.png' });
        console.log("Tested Face Dot 3 (Live Sets).");

        // 4. Test Center Click (Zoom)
        await page.click('#faceName');
        await wait(1500);
        await page.screenshot({ path: 'final_ui_zoom.png' });
        console.log("Tested Center Click (Zoom into Live Sets).");

        await browser.close();
        console.log("Final UI Verification complete.");
    } catch (err) {
        console.error("Verification error:", err);
    }
})();
