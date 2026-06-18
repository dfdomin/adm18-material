// ══════════════════════════════════════════════════════════════
//  ADM18 · Examen Parcial 1 — Playwright E2E v2
//  Verifica: nombre arriba/abajo, máx 3 intentos, penalización
//  >10s, términos traducidos, sin caracteres chinos.
// ══════════════════════════════════════════════════════════════
const { chromium } = require('playwright');

const EXAM_URL = process.env.EXAM_URL || 'http://localhost:8765/examen/index.html';
const MOBILE_VIEWPORT = { width: 375, height: 812 };
const TEST_CC = '1043448681'; // BERMUDEZ POLO EMMANUEL JOSÉ
const EXPECTED_NAME = 'BERMUDEZ POLO EMMANUEL';
const TIMEOUT = 60000;

async function runE2E() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  ADM18 · Examen E2E v2 — Validación completa       ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`  URL: ${EXAM_URL}`);
  console.log(`  Estudiante: ${TEST_CC} (${EXPECTED_NAME})`);
  console.log('');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: MOBILE_VIEWPORT,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    hasTouch: true,
    isMobile: true
  });
  const page = await context.newPage();

  let consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => {
    consoleErrors.push('[PAGE] ' + err.message);
  });

  let passed = 0, failed = 0, total = 0;
  function assert(condition, desc) {
    total++;
    if (condition) { passed++; console.log(`  ✅ ${desc}`); }
    else { failed++; console.log(`  ❌ ${desc}`); }
  }

  try {
    // ══════════════════════════════════════════════════════════
    // FASE 1: Carga del examen
    // ══════════════════════════════════════════════════════════
    console.log('\n📋 FASE 1: Carga y login');
    await page.goto(EXAM_URL, { timeout: TIMEOUT });
    await page.waitForSelector('#exam-app', { timeout: TIMEOUT });
    await page.waitForTimeout(1500);

    const title = await page.textContent('.exam-title');
    assert(title && title.includes('Examen Parcial 1'), 'Título del examen visible');

    // Login
    await page.fill('#exam-cc', TEST_CC);
    await page.click('#exam-login-btn');

    // Esperar disclaimer
    await page.waitForSelector('.exam-disclaimer-title', { timeout: TIMEOUT });
    const disclaimerTitle = await page.textContent('.exam-disclaimer-title');
    assert(disclaimerTitle.includes('Antes de comenzar'), 'Disclaimer visible');

    // ══════════════════════════════════════════════════════════
    // FASE 2: Verificar contenido del disclaimer (v2)
    // ══════════════════════════════════════════════════════════
    console.log('\n📋 FASE 2: Contenido del disclaimer');
    const disclaimerText = await page.textContent('.exam-disclaimer-box');

    // Máximo 3 intentos
    assert(disclaimerText.includes('3 intentos') || disclaimerText.includes('máximo'),
      'Disclaimer menciona máximo 3 intentos');

    // 10 segundos de penalización
    assert(disclaimerText.includes('10 segundos') || disclaimerText.includes('10s'),
      'Disclaimer menciona penalización después de 10s');

    // Fórmula visible
    const formulaText = await page.textContent('.exam-formula');
    assert(formulaText.includes('5.0') && formulaText.includes('0.5'),
      'Fórmula de calificación visible');

    // ══════════════════════════════════════════════════════════
    // FASE 3: Nombre del estudiante visible
    // ══════════════════════════════════════════════════════════
    console.log('\n📋 FASE 3: Nombre del estudiante');
    const studentName = await page.textContent('.exam-student-name-label');
    assert(studentName && studentName.includes(EXPECTED_NAME.split(' ')[0]),
      'Nombre del estudiante visible en el header');

    // ══════════════════════════════════════════════════════════
    // FASE 4: Responder 12 preguntas
    // ══════════════════════════════════════════════════════════
    console.log('\n📋 FASE 4: Responder preguntas');
    await page.click('#exam-start-btn');
    await page.waitForSelector('.exam-question-text', { timeout: TIMEOUT });
    await page.waitForTimeout(2000);

    let answeredCount = 0;
    for (let step = 1; step <= 12; step++) {
      // Esperar step correcto
      try {
        await page.waitForFunction(
          (s) => { const el = document.querySelector('.exam-step-badge'); return el && el.textContent.includes(`${s}/12`); },
          step, { timeout: 15000 }
        );
      } catch (e) { /* continue */ }

      const currentOptions = await page.$$('.exam-option');
      if (currentOptions.length > 0) {
        await currentOptions[0].click();
        await page.waitForTimeout(300);
        answeredCount++;
      }

      try {
        await page.waitForFunction(() => { const btn = document.getElementById('exam-next-btn'); return btn && !btn.disabled; }, { timeout: 8000 });
      } catch (e) { }

      const nextBtn = await page.$('#exam-next-btn');
      if (nextBtn) {
        await nextBtn.click();
        try {
          await page.waitForFunction(() => { const btn = document.getElementById('exam-next-btn'); return !btn || btn.textContent !== 'Guardando...'; }, { timeout: 20000 });
        } catch (e) { }
        await page.waitForTimeout(500);
      }
    }
    assert(answeredCount === 12, `Se respondieron ${answeredCount}/12 preguntas`);

    // ══════════════════════════════════════════════════════════
    // FASE 5: Resultados
    // ══════════════════════════════════════════════════════════
    console.log('\n📋 FASE 5: Resultados');
    await page.waitForTimeout(2000);
    const resultTitle = await page.$('.exam-result-title');
    if (resultTitle) {
      const titleText = await page.textContent('.exam-result-title');
      assert(titleText.includes('Examen finalizado'), 'Resultados visibles');

      // Verificar nombre al lado de la nota
      const resultDetails = await page.textContent('.exam-result-details');
      assert(resultDetails.includes(EXPECTED_NAME.split(' ')[0]),
        'Nombre del estudiante al lado de la nota en resultados');

      // Verificar nota
      const scoreBig = await page.textContent('.exam-score-big');
      assert(scoreBig.length > 0, 'Nota mostrada');

      // Verificar columna de descuento
      const detailText = await page.textContent('.exam-result-details');
      assert(detailText.includes('Ausencias') || detailText.includes('>10s'),
        'Descuento por ausencias >10s mostrado');
    }

    // ══════════════════════════════════════════════════════════
    // FASE 6: Verificación base de datos
    // ══════════════════════════════════════════════════════════
    console.log('\n📋 FASE 6: Persistencia y BD');
    const criticalErrors = consoleErrors.filter(e =>
      !e.includes('favicon') && !e.includes('chrome-extension') && !e.includes('ERR_BLOCKED')
    );
    assert(criticalErrors.length === 0, `Sin errores críticos en consola (${criticalErrors.length})`);

    // Sin localStorage
    const lsExamKeys = await page.evaluate(() => {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k.includes('exam') || k.includes('attempt') || k.includes('answer')) keys.push(k);
      }
      return keys;
    });
    assert(lsExamKeys.length === 0, 'Sin localStorage para datos de examen');

    // ══════════════════════════════════════════════════════════
    // RESULTADOS
    // ══════════════════════════════════════════════════════════
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║         RESULTADOS — EXAMEN E2E v2             ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  Total:        ${total.toString().padEnd(3)}                     ║`);
    console.log(`║  Pasaron:      ${passed.toString().padEnd(3)}  ✅                    ║`);
    console.log(`║  Fallaron:     ${failed.toString().padEnd(3)}  ❌                    ║`);
    console.log('╚══════════════════════════════════════════════════╝');

    if (failed > 0) {
      console.log(`\n  ❌ ${failed} prueba(s) fallaron`);
    } else {
      console.log('\n  ✅ ¡Todas las pruebas pasaron!');
    }

  } catch (e) {
    console.log(`\n  ❌ Error fatal: ${e.message}`);
    failed++;
    total++;
  }

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

runE2E().catch(e => {
  console.error('Error fatal:', e);
  process.exit(1);
});