// Configuración de conexión
const S_URL = 'https://mjxpqxyxkshtqlptccto.supabase.co';
const S_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qeHBxeHl4a3NodHFscHRjY3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MzQyOTAsImV4cCI6MjA5MjMxMDI5MH0.KGi6VT8g-zKeEi0NWHpkdzdKHP1mF11Ch0Q-46c2Wps';
const API = 'https://aquabit-op.onrender.com/api';

const supabaseClient = supabase.createClient(S_URL, S_KEY);
let tab = 'corte';
let files = [];

/**
 * Cambia entre las pestañas de CORTES y REPOSICIÓN
 *
 */
function setTab(t) {
    tab = t;
    const btnCorte = document.getElementById('t-corte');
    const btnRepo = document.getElementById('t-repo');

    if (btnCorte && btnRepo) {
        btnCorte.className = t === 'corte' ? 'btn-action active bg-corte' : 'btn-action bg-corte';
        btnRepo.className = t === 'reposicion' ? 'btn-action active bg-repo' : 'btn-action bg-repo';
    }

    // Limpiar datos temporales y recargar historial
    files = [];
    const p = document.getElementById('p');
    if (p) p.innerHTML = '';
    load();
}

/**
 * Gestiona la selección de archivos y la vista previa
 */
document.getElementById('f').onchange = e => {
    const previewContainer = document.getElementById('p');
    if (!previewContainer) return;

    Array.from(e.target.files).forEach(file => {
        files.push(file);
        const reader = new FileReader();
        reader.onload = ev => {
            const img = document.createElement('img');
            img.src = ev.target.result;
            // Estilos para que la miniatura se vea bien en la previsualización
            img.className = "w-16 h-16 object-cover rounded-lg border-2 border-orange-500 shadow-sm";
            previewContainer.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
};

/**
 * Sube las fotos a Supabase y el registro a la API de Render
 */
async function subir() {
    if (!files.length) return alert("Debes tomar al menos una foto.");

    const btnSave = document.getElementById('s');
    const originalText = btnSave.innerHTML;

    try {
        btnSave.innerHTML = '<i class="bi bi-hourglass-split animate-spin"></i> SUBIENDO...';
        btnSave.disabled = true;

        const urls = [];
        for (let file of files) {
            const fileName = `aq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.jpg`;

            // Subida al bucket de Supabase
            const { error } = await supabaseClient.storage.from('fotos-aquabit').upload(fileName, file);
            if (error) throw error;

            const { data } = supabaseClient.storage.from('fotos-aquabit').getPublicUrl(fileName);
            urls.push({ url: data.publicUrl, verificado: false });
        }

        // Envío de datos al backend en Render
        const response = await fetch(`${API}/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tipo: tab,
                observaciones: document.getElementById('o').value,
                fotos: urls
            })
        });

        if (response.ok) {
            document.getElementById('o').value = '';
            setTab(tab); // Esto limpia y recarga el historial automáticamente
        } else {
            alert("Error al guardar en el servidor.");
        }
    } catch (e) {
        console.error(e);
        alert("Error crítico en la subida.");
    } finally {
        btnSave.innerHTML = originalText;
        btnSave.disabled = false;
    }
}

/**
 * Carga el historial desde la API y renderiza las tarjetas
 */
async function load() {
    const h = document.getElementById('h');
    if (!h) return;

    h.innerHTML = '<div class="text-center py-10 text-slate-400 font-bold">Cargando registros...</div>';

    try {
        const res = await fetch(`${API}/registros/${tab}`);
        const data = await res.json();

        if (!data || data.length === 0) {
            h.innerHTML = '<div class="text-center py-10 text-slate-400 italic">No hay registros para mostrar.</div>';
            return;
        }

        h.innerHTML = data.map(reg => `
            <div class="card-registro animate-in">
                <div class="grid-fotos">
                    ${reg.fotos.map((f, i) => {
            const url = f.url || f;
            return `
                        <div class="flex flex-col items-center gap-2">
                            <img src="${url}" class="img-mini" onclick="window.open('${url}')">
                            ${tab === 'reposicion' ? (
                    f.verificado ?
                        `<div class="badge-ok">REPUESTA.<br>${f.fechaRepo || ''}</div>` :
                        `<button onclick="patch(${reg.id}, ${i})" class="text-[10px] bg-white border border-blue-600 text-blue-600 px-2 py-1 rounded-lg font-bold shadow-sm">MARCAR REPUESTO</button>`
                ) : ''}
                        </div>`;
        }).join('')}
                </div>
                <div class="flex justify-between items-center mt-3 pt-2 border-t border-slate-200">
                    <span class="text-[10px] text-slate-500 font-bold uppercase">
                        <i class="bi bi-calendar3"></i> ${new Date(reg.createdAt).toLocaleString()}
                    </span>
                    <button onclick="del(${reg.id})" class="text-red-400 hover:text-red-600 transition-colors">
                        <i class="bi bi-trash3-fill"></i>
                    </button>
                </div>
                <p class="text-xs font-bold mt-2 text-slate-700 leading-tight">${reg.observaciones || 'Sin observaciones'}</p>
            </div>
        `).join('');
    } catch (e) {
        h.innerHTML = '<div class="text-center py-10 text-red-400 font-bold">Error de conexión con Render.</div>';
    }
}

/**
 * Actualiza el estado de una foto a "Verificado/Repuesto"
 */
async function patch(id, idx) {
    try {
        await fetch(`${API}/registros/${id}/foto/${idx}`, { method: 'PATCH' });
        load();
    } catch (e) {
        alert("Error al actualizar estado.");
    }
}

/**
 * Elimina un registro completo
 */
async function del(id) {
    if (confirm("¿Seguro que deseas eliminar este registro?")) {
        try {
            await fetch(`${API}/registros/${id}`, { method: 'DELETE' });
            load();
        } catch (e) {
            alert("Error al eliminar.");
        }
    }
}

// Carga inicial
window.onload = load;