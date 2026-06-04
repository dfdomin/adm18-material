/* === GTC 185 Interactive Checklist ===
 * Interactive widget for Week 4 document clinic.
 * 10 criteria with checkboxes, score tracking.
 */
const GTC185Checklist = (function() {
    'use strict';

    const CRITERIA = [
        { id: 'c1',  label: 'Tiene membrete',                    desc: 'Nombre de la empresa, logo, direccion' },
        { id: 'c2',  label: 'Fecha completa',                    desc: 'Ciudad, dia, mes, ano (ej: Barranquilla, 15 de julio de 2026)' },
        { id: 'c3',  label: 'Destinatario identificado',         desc: 'Nombre completo y cargo de quien recibe' },
        { id: 'c4',  label: 'Asunto claro',                      desc: 'Una frase que resume el proposito del documento' },
        { id: 'c5',  label: 'Parrafos breves',                   desc: 'Maximo 5-6 lineas por parrafo, una idea por parrafo' },
        { id: 'c6',  label: 'Lenguaje profesional',              desc: 'Formal pero no rebuscado, sin jerga, sin insultos' },
        { id: 'c7',  label: 'Firma con cargo',                   desc: 'Nombre, cargo y area de quien firma' },
        { id: 'c8',  label: 'Anexos listados',                   desc: 'Si hay documentos adjuntos, se enumeran al final' },
        { id: 'c9',  label: 'Copia a quien corresponda',         desc: 'Se indica si hay copia para otra persona o area' },
        { id: 'c10', label: 'Formato consistente',               desc: 'Misma fuente, mismos margenes, alineacion uniforme' }
    ];

    let state = { checks: {}, score: 0 };

    function init(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Load saved state
        const saved = localStorage.getItem('gtc185_checks');
        if (saved) {
            try { state.checks = JSON.parse(saved); } catch(e) {}
        }

        render(container);
    }

    function render(container) {
        let html = '<h3 style="margin-bottom:var(--space-md)">Checklist GTC 185 (10 criterios)</h3>';
        html += '<p style="font-size:var(--font-size-sm);color:var(--text-secondary);margin-bottom:var(--space-md)">';
        html += 'Marca los criterios que cumple el documento. Todos deben cumplirse para un documento profesional.';
        html += '</p>';
        html += '<ul class="checklist">';

        CRITERIA.forEach((c, i) => {
            const checked = state.checks[c.id] ? ' checked' : '';
            html += '<li class="checklist-item' + (state.checks[c.id] ? ' checked' : '') + '">';
            html += '<input type="checkbox" id="gtc-' + c.id + '"' + checked + ' onchange="GTC185Checklist.toggle(\'' + c.id + '\')">';
            html += '<label for="gtc-' + c.id + '" style="flex:1;cursor:pointer">';
            html += '<strong>' + (i + 1) + '. ' + c.label + '</strong>';
            html += '<br><small style="color:var(--text-secondary)">' + c.desc + '</small>';
            html += '</label>';
            html += '</li>';
        });

        html += '</ul>';

        // Score
        const count = Object.values(state.checks).filter(v => v).length;
        const pct = Math.round((count / 10) * 100);
        html += '<div style="margin-top:var(--space-md);padding:var(--space-md);background:' + (pct === 100 ? '#dcfce7' : '#fef3c7') + ';border-radius:var(--radius-md)">';
        html += '<strong>Criterios cumplidos: ' + count + ' / 10 (' + pct + '%)</strong>';
        if (pct === 100) {
            html += '<p style="color:var(--success);margin-top:var(--space-xs)">El documento cumple todos los criterios GTC 185.</p>';
        } else if (pct >= 70) {
            html += '<p style="color:var(--warning);margin-top:var(--space-xs)">Casi listo. Revisa los criterios pendientes.</p>';
        } else {
            html += '<p style="color:var(--error);margin-top:var(--space-xs)">El documento necesita varias correcciones antes de ser profesional.</p>';
        }
        html += '</div>';

        // Reset button
        html += '<button class="btn btn-outline btn-sm" onclick="GTC185Checklist.reset()" style="margin-top:var(--space-sm)">Reiniciar checklist</button>';

        container.innerHTML = html;
    }

    function toggle(criterionId) {
        state.checks[criterionId] = !state.checks[criterionId];
        localStorage.setItem('gtc185_checks', JSON.stringify(state.checks));
        const container = document.querySelector('.checklist')?.parentElement;
        if (container) render(container);
    }

    function reset() {
        state.checks = {};
        localStorage.removeItem('gtc185_checks');
        const container = document.querySelector('.checklist')?.parentElement;
        if (container) render(container);
    }

    function getScore() {
        const count = Object.values(state.checks).filter(v => v).length;
        return { count, total: 10, percent: Math.round((count / 10) * 100) };
    }

    return { init, toggle, reset, getScore, CRITERIA };
})();
