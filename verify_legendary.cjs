const puppeteer = require('puppeteer');
const fs = require('fs');
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    try {
        console.log("Starting Legendary Restoration Verification...");
        const browser = await puppeteer.launch({ 
            headless: "new", 
            args: ['--autoplay-policy=no-user-gesture-required', '--window-size=1920,1080'] 
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle2' });
        console.log("Page loaded.");
        
        await wait(3500); // Intro
        
        // Hero Scan Verification
        await page.screenshot({ path: 'legendary_hero_scan.png' });
        console.log("Captured Legendary Hero (Snake Scan/Inversion).");

        // Social Dashboard Verification
        await page.click('#nextBtn'); await page.click('#nextBtn'); await page.click('#nextBtn'); await page.click('#nextBtn');
        await wait(1500);
        await page.screenshot({ path: 'legendary_social_dashboard.png' });
        console.log("Captured Legendary Social Dashboard (Grid layout).");

        // Studio / General Scene
        await page.click('#prevBtn');
        await wait(1500);
        await page.screenshot({ path: 'legendary_scene.png' });
        console.log("Captured Legendary General Scene.");

        await browser.close();
        console.log("Legendary Verification complete.");
    } catch (err) {
        console.error("Verification error:", err);
    }
})();
