const puppeteer = require('puppeteer');
const fs = require('fs');
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    try {
        console.log("Starting Final Redemption Verification...");
        const browser = await puppeteer.launch({ 
            headless: "new", 
            args: ['--autoplay-policy=no-user-gesture-required', '--window-size=1920,1080'] 
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle2' });
        console.log("Page loaded.");
        
        await wait(3500); // Intro
        
        // 1. Hero Snake Verification
        await page.screenshot({ path: 'redemption_hero_snake.png' });
        console.log("Captured Hero Snake (SVG + Inversion).");

        // 2. Sector Overlap Check (Cube in Center)
        await page.screenshot({ path: 'redemption_layout.png' });
        console.log("Captured Full Layout (Sector Decoupling Check).");

        // 3. Social Dashboard Verification
        await page.click('#nextBtn'); await page.click('#nextBtn'); await page.click('#nextBtn'); await page.click('#nextBtn');
        await wait(1500);
        await page.screenshot({ path: 'redemption_social.png' });
        console.log("Captured Social Dashboard (Centered Grid).");

        await browser.close();
        console.log("Redemption Verification complete.");
    } catch (err) {
        console.error("Verification error:", err);
    }
})();
