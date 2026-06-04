/* === File Naming Simulator ===
 * Interactive practice for Week 11 naming convention.
 * Students rename chaotic filenames using the convention:
 * TIPO_Destinatario_Asunto_FECHA_VERSION.ext
 */
const FileNamingSim = (function() {
    'use strict';

    const FOLDER_STRUCTURE = {
        '01_Comunicaciones': 'Correos externos, cartas a clientes, notificaciones',
        '02_Operaciones': 'Facturas, guias, documentos de envio y logistica',
        '03_Decisiones': 'Actas, memos, planes de mejora, informes',
        '04_Archivo': 'Documentos cerrados, historicos, versiones finales'
    };

    /* Sample chaotic filenames to practice with */
    const SAMPLES = [
        { chaotic: 'Doc1_final.docx',      hint: 'Correo a cliente Molina sobre retraso de paquete, 11 julio 2026, v2' },
        { chaotic: 'Carta (2).pdf',         hint: 'Respuesta a queja de cliente Ramirez, 3 agosto 2026' },
        { chaotic: 'DOCUMENTO OFICIAL URGENTE REVISADO V3 (1).docx', hint: 'Acta de reunion de emergencia, 15 julio 2026' },
        { chaotic: 'image001.png',          hint: 'Factura de flete a Miami, vuelo 447, 20 julio 2026' },
        { chaotic: 'SinNombre_2026.xlsx',   hint: 'Comprobante de pago de impuestos DIAN, paquete 8821, 25 julio 2026' },
        { chaotic: 'notificacion.docx',     hint: 'Notificacion de llegada a Miami, paquete de cliente Perez, 5 julio 2026, v1' },
    ];

    let state = { attempts: {}, score: 0, currentSample: 0 };

    function init(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Load saved attempts
        const saved = localStorage.getItem('filenaming_attempts');
        if (saved) {
            try { state.attempts = JSON.parse(saved); } catch(e) {}
        }

        render(container);
    }

    function render(container) {
        let html = '<h3 style="margin-bottom:var(--space-md)">Simulador de Nombres de Archivo</h3>';

        // Convention reference
        html += '<div class="alert alert-info">';
        html += '<strong>Convencion:</strong> <code>TIPO_Destinatario_Asunto_FECHA_VERSION.ext</code><br>';
        html += '<small>Ejemplo: <code>CORREO_ClienteMolina_RetrasoPaquete_20260711_v02.docx</code></small>';
        html += '</div>';

        // Folder structure reference
        html += '<div style="margin:var(--space-md) 0">';
        html += '<strong>Estructura de carpetas:</strong>';
        html += '<div class="table-responsive"><table style="margin-top:var(--space-sm)"><tr><th>Carpeta</th><th>Contenido</th></tr>';
        for (const [folder, desc] of Object.entries(FOLDER_STRUCTURE)) {
            html += '<tr><td><strong>' + folder + '/</strong></td><td>' + desc + '</td></tr>';
        }
        html += '</table></div></div>';

        // Current sample to rename
        if (state.currentSample < SAMPLES.length) {
            const s = SAMPLES[state.currentSample];
            html += '<div class="card" style="border:2px solid var(--gold);margin:var(--space-md) 0">';
            html += '<p><strong>Archivo caotico #' + (state.currentSample + 1) + ':</strong></p>';
            html += '<p style="font-size:1.2rem;font-family:var(--font-mono);background:#f1f3f4;padding:var(--space-sm)">' + s.chaotic + '</p>';
            html += '<p style="color:var(--text-secondary);font-size:var(--font-size-sm)">Pista: ' + s.hint + '</p>';

            // Show previous attempt if exists
            const prevKey = 'sample_' + state.currentSample;
            if (state.attempts[prevKey]) {
                html += '<p style="margin-top:var(--space-sm)"><strong>Tu intento anterior:</strong> <code>' + state.attempts[prevKey] + '</code></p>';
            }

            html += '<div style="margin-top:var(--space-sm);display:flex;gap:var(--space-sm);flex-wrap:wrap">';
            html += '<input type="text" id="naming-input" placeholder="Escribe el nuevo nombre aqui..." style="flex:1;min-width:200px;padding:var(--space-sm);border:2px solid var(--border);border-radius:var(--radius-sm);font-family:var(--font-mono);font-size:var(--font-size-sm)">';
            html += '<button class="btn btn-primary btn-sm" onclick="FileNamingSim.submit()">Renombrar</button>';
            html += '</div>';

            html += '<div style="margin-top:var(--space-sm)">';
            html += '<label style="font-size:var(--font-size-sm)">Carpeta destino: </label>';
            html += '<select id="folder-select" style="padding:var(--space-xs);border:2px solid var(--border);border-radius:var(--radius-sm)">';
            html += '<option value="">Selecciona carpeta...</option>';
            for (const folder of Object.keys(FOLDER_STRUCTURE)) {
                html += '<option value="' + folder + '">' + folder + '/</option>';
            }
            html += '</select>';
            html += '</div>';

            html += '</div>';
        } else {
            html += '<div class="alert alert-success">';
            html += '<strong>Todos los archivos renombrados!</strong><br>';
            html += 'Has completado el ejercicio. Compara tus respuestas con las de tus companeros.';
            html += '</div>';
            html += '<button class="btn btn-outline btn-sm" onclick="FileNamingSim.reset()">Reiniciar ejercicio</button>';
        }

        // Progress
        html += '<div style="margin-top:var(--space-md)">';
        html += '<div class="progress-bar"><div class="progress-fill" style="width:' + (state.currentSample / SAMPLES.length * 100) + '%"></div></div>';
        html += '<small style="color:var(--text-secondary)">' + state.currentSample + ' de ' + SAMPLES.length + ' archivos renombrados</small>';
        html += '</div>';

        container.innerHTML = html;
    }

    function submit() {
        const input = document.getElementById('naming-input');
        const folderSelect = document.getElementById('folder-select');

        if (!input || !input.value.trim()) {
            alert('Por favor escribe un nombre para el archivo.');
            return;
        }
        if (!folderSelect || !folderSelect.value) {
            alert('Por favor selecciona una carpeta destino.');
            return;
        }

        const newName = input.value.trim();
        const folder = folderSelect.value;
        const key = 'sample_' + state.currentSample;

        // Save attempt
        state.attempts[key] = folder + '/' + newName;
        localStorage.setItem('filenaming_attempts', JSON.stringify(state.attempts));

        // Validate basic format
        const warnings = [];
        const parts = newName.split('_');
        if (parts.length < 4) warnings.push('El nombre deberia tener al menos 4 partes separadas por _ (TIPO_Destinatario_Asunto_FECHA)');
        if (!/\d{8}/.test(newName)) warnings.push('La fecha deberia estar en formato AAAAMMDD (8 digitos)');
        if (!newName.includes('.')) warnings.push('Falta la extension del archivo (.docx, .xlsx, .pdf, etc.)');

        if (warnings.length > 0) {
            alert('Nombre guardado, pero considera estas mejoras:\n\n- ' + warnings.join('\n- '));
        } else {
            alert('Nombre guardado correctamente. Bien hecho!');
        }

        state.currentSample++;
        const container = document.getElementById('naming-simulator');
        if (container) render(container);
    }

    function reset() {
        state.currentSample = 0;
        state.attempts = {};
        localStorage.removeItem('filenaming_attempts');
        const container = document.getElementById('naming-simulator');
        if (container) render(container);
    }

    function getResults() {
        return state.attempts;
    }

    return { init, submit, reset, getResults, FOLDER_STRUCTURE };
})();
