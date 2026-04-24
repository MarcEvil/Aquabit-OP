// Configuración de conexión
const S_URL = 'https://mjxpqxyxkshtqlptccto.supabase.co';
const S_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qeHBxeHl4a3NodHFscHRjY3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MzQyOTAsImV4cCI6MjA5MjMxMDI5MH0.KGi6VT8g-zKeEi0NWHpkdzdKHP1mF11Ch0Q-46c2Wps';
const API = 'https://aquabit-op.onrender.com/api';

const supabaseClient = supabase.createClient(S_URL, S_KEY);
let tab = 'corte';
let files = [];

/**
 * Cambia entre pestañas y actualiza el tema visual
 */
function setTab(t) {
    tab = t;
    const body = document.body;
    const btnCorte = document.getElementById('t-corte');
    const btnRepo = document.getElementById('t-repo');

    // Aplicar clases de fondo dinámicas según la sección
    if (t === 'corte') {
        body.className = 'theme-corte pb-32 transition-colors duration-500';
    } else {
        body.className = 'theme-reposicion pb-32 transition-colors duration-500';
    }

    if (btnCorte && btnRepo) {
        btnCorte.classList.toggle('active', t === 'corte');
        btnRepo.classList.toggle('active', t === 'reposicion');
    }

    // Reiniciar selección de archivos y recargar historial
    files = [];
    const p = document.getElementById('p');
    if (p) p.innerHTML = '';
    load();
}

/**
 * Previsualización de imágenes seleccionadas
 */
document.getElementById('f').onchange = e => {
    const p = document.getElementById('p');
    Array.from(e.target.files).forEach(file => {
        files.push(file);
        const reader = new FileReader();
        reader.onload = ev => {
            const img = document.createElement('img');
            img.src = ev.target.result;
            img.className = "w-12 h-12 object-cover rounded-lg border-2 border-orange-400 shadow-sm";
            p.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
};

/**
 * Sube archivos a Supabase y registra los datos en Render
 */
async function subir() {
    if (!files.length) return alert("Debes capturar al menos una foto.");
    const s = document.getElementById('s');

    try {
        s.disabled = true;
        s.innerHTML = '<i class="bi bi-hourglass-split animate-spin"></i> SUBIENDO...';

        const urls = [];
        for (let file of files) {
            const name = `aq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.jpg`;

            // Subir al almacenamiento físico
            const { error } = await supabaseClient.storage.from('fotos-aquabit').upload(name, file);
            if (error) throw error;

            const { data } = supabaseClient.storage.from('fotos-aquabit').getPublicUrl(name);
            urls.push({ url: data.publicUrl, verificado: false });
        }

        // Guardar registro lógico en el backend
        await fetch(`${API}/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tipo: tab,
                observaciones: document.getElementById('o').value,
                fotos: urls
            })
        });

        document.getElementById('o').value = '';
        setTab(tab); // Limpia y refresca automáticamente

    } catch (e) {
        alert("Error en la subida. Revisa la conexión.");
        console.error(e);
    } finally {
        s.disabled = false;
        s.innerHTML = '<i class="bi bi-cloud-arrow-up-fill"></i> GUARDAR REGISTRO';
    }
}

/**
 * Carga el historial y renderiza las tarjetas
 */
async function load() {
    const h = document.getElementById('h');
    if (!h) return;
    h.innerHTML = '<div class="text-center py-10 text-slate-400 font-bold">Actualizando historial...</div>';

    try {
        const res = await fetch(`${API}/registros/${tab}`);
        const data = await res.json();

        if (!data.length) {
            h.innerHTML = '<p class="text-center text-slate-400 italic py-10">No hay registros pendientes.</p>';
            return;
        }

        h.innerHTML = data.map(reg => `
            <div class="card-registro animate-in">
                <div class="grid-fotos">
                    ${reg.fotos.map((f, i) => {
            const url = f.url || f;
            return `
                        <div class="flex flex-col items-center gap-2">
                            <img src="${url}" class="img-mini shadow-md" onclick="window.open('${url}')">
                            ${tab === 'reposicion' ? (
                    f.verificado ? `<div class="badge-ok">REPUESTA.<br>${f.fechaRepo || ''}</div>`
                        : `<button onclick="patch(${reg.id}, ${i})" class="text-[9px] bg-white text-blue-600 px-2 py-1 rounded-lg font-black shadow-sm border border-blue-100">MARCAR REPOSICIÓN</button>`
                ) : ''}
                        </div>`;
        }).join('')}
                </div>
                <div class="flex justify-between items-center mt-3 pt-2 border-t border-slate-300/50">
                    <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        <i class="bi bi-calendar-check"></i> ${new Date(reg.createdAt).toLocaleString()}
                    </span>
                    <button onclick="del(${reg.id})" class="text-red-400 hover:text-red-600 transition-colors">
                        <i class="bi bi-trash3-fill"></i>
                    </button>
                </div>
                <p class="text-xs font-bold mt-2 text-slate-700 leading-snug">${reg.observaciones || 'Sin notas adicionales'}</p>
            </div>
        `).join('');
    } catch (e) {
        h.innerHTML = '<p class="text-center text-red-400 font-bold py-10">Error de conexión con el servidor.</p>';
    }
}

/**
 * Marca una foto como repuesta
 */
async function patch(id, idx) {
    try {
        await fetch(`${API}/registros/${id}/foto/${idx}`, { method: 'PATCH' });
        load();
    } catch (e) { alert("Error al actualizar"); }
}

/**
 * Borra el registro de la DB y los archivos de Supabase
 */
async function del(id) {
    if (!confirm("¿Deseas eliminar este registro y sus fotos permanentemente?")) return;

    try {
        // Buscar el registro para obtener las URLs de las fotos
        const res = await fetch(`${API}/registros/${tab}`);
        const data = await res.json();
        const registro = data.find(r => r.id === id);

        if (registro && registro.fotos) {
            // Extraer nombres de archivo para limpiar Supabase
            const fileNames = registro.fotos.map(f => (f.url || f).split('/').pop());
            await supabaseClient.storage.from('fotos-aquabit').remove(fileNames);
        }

        // Eliminar registro del servidor
        await fetch(`${API}/registros/${id}`, { method: 'DELETE' });
        load();
    } catch (e) {
        alert("Error al intentar eliminar los datos.");
    }
}

// Inicialización
window.onload = load;