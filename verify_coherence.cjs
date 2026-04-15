const puppeteer = require('puppeteer');
const fs = require('fs');
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    try {
        console.log("Starting Final Coherence Verification...");
        const browser = await puppeteer.launch({ 
            headless: "new", 
            args: ['--autoplay-policy=no-user-gesture-required', '--window-size=1920,1080'] 
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle2' });
        console.log("Page loaded.");
        
        await wait(3500); // Intro
        
        // 1. Hero Neon Gradient Check
        await page.screenshot({ path: 'coherence_hero_neon.png' });
        console.log("Captured Hero Neon Gradient (Cyan-Pink).");

        // 2. Full Layout Check (Decoupled Zones)
        await page.screenshot({ path: 'coherence_layout.png' });
        console.log("Captured Full Layout (Coherence Check).");

        // 3. Cube Face Verification
        await page.click('#nextBtn');
        await wait(1500);
        await page.screenshot({ path: 'coherence_face.png' });
        console.log("Captured Coherent Cube Face.");

        await browser.close();
        console.log("Coherence Verification complete.");
    } catch (err) {
        console.error("Verification error:", err);
    }
})();
