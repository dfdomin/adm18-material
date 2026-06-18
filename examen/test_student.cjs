// ══════════════════════════════════════════════════════════════
//  ADM18 · Examen — Prueba rápida con 1042856266
// ══════════════════════════════════════════════════════════════
const { chromium } = require('playwright');

const EXAM_URL = 'http://localhost:8765/examen/index.html';
const MOBILE_VIEWPORT = { width: 375, height: 812 };
const TEST_CC = '1042856266';
const TIMEOUT = 60000;

async function run() {
  console.log('Prueba con estudiante: ' + TEST_CC);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: MOBILE_VIEWPORT,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
    hasTouch: true, isMobile: true
  });
  const page = await context.newPage();

  let consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  try {
    await page.goto(EXAM_URL, { timeout: TIMEOUT });
    await page.waitForSelector('#exam-app', { timeout: TIMEOUT });
    await page.waitForTimeout(1500);

    // Login
    await page.fill('#exam-cc', TEST_CC);
    await page.click('#exam-login-btn');
    await page.waitForSelector('.exam-disclaimer-title', { timeout: TIMEOUT });
    console.log('✅ Login exitoso');

    // Start exam
    await page.click('#exam-start-btn');
    await page.waitForSelector('.exam-question-text', { timeout: TIMEOUT });
    await page.waitForTimeout(2000);

    // Answer 12 questions - always pick A (this gives 0 correct since correct is B)
    let answered = 0;
    for (let step = 1; step <= 12; step++) {
      try {
        await page.waitForFunction(
          (s) => { const el = document.querySelector('.exam-step-badge'); return el && el.textContent.includes(s + '/12'); },
          step, { timeout: 15000 }
        );
      } catch (e) {}

      const opts = await page.$$('.exam-option');
      if (opts.length > 0) await opts[0].click();
      
      try { await page.waitForFunction(() => { const b = document.getElementById('exam-next-btn'); return b && !b.disabled; }, { timeout: 8000 }); } catch {}
      
      const btn = await page.$('#exam-next-btn');
      if (btn) {
        await btn.click();
        try { await page.waitForFunction(() => { const b = document.getElementById('exam-next-btn'); return !b || b.textContent !== 'Guardando...'; }, { timeout: 20000 }); } catch {}
        await page.waitForTimeout(500);
        answered++;
      }
    }
    console.log('✅ ' + answered + '/12 preguntas respondidas');

    // Wait for results
    await page.waitForTimeout(3000);
    
    // Get score from results page
    const scoreEl = await page.$('.exam-score-big');
    if (scoreEl) {
      const score = await scoreEl.textContent();
      console.log('\n📊 NOTA OBTENIDA: ' + score + ' / 5.0');
    }
    
    const detailText = await page.textContent('.exam-result-details');
    console.log('\n📋 Detalles:');
    console.log(detailText);

  } catch (e) {
    console.log('❌ Error: ' + e.message);
  }

  await browser.close();
}

run().catch(e => { console.error(e); process.exit(1); });
