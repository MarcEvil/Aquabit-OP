// Asegúrate de que esta parte de tu script.js se vea así:
async function load() {
    const h = document.getElementById('h');
    if (!h) return; // Evita el error si el elemento no existe
    h.innerHTML = '<p class="text-center text-slate-500">Cargando...</p>';

    try {
        const res = await fetch(`${API}/registros/${tab}`);
        const data = await res.json();

        if (data.length === 0) {
            h.innerHTML = '<p class="text-center text-slate-400">No hay registros hoy.</p>';
            return;
        }

        h.innerHTML = data.map(reg => `
            <div class="card-registro">
                <div class="grid-fotos mb-3">
                    ${reg.fotos.map((f, i) => {
            const url = f.url || f;
            const verificado = f.verificado;
            return `
                        <div class="flex flex-col items-center gap-2">
                            <img src="${url}" class="img-mini" onclick="window.open('${url}')">
                            ${tab === 'reposicion' ? (
                    verificado ? `<div class="badge-ok">REPUESTA.<br><small>${f.fechaRepo || ''}</small></div>`
                        : `<button onclick="patch(${reg.id}, ${i})" class="text-[10px] bg-white border border-blue-500 text-blue-500 px-2 py-1 rounded font-bold">MARCAR REPUESTO</button>`
                ) : ''}
                        </div>`;
        }).join('')}
                </div>
                <div class="flex justify-between items-center text-[11px] text-slate-500 px-1">
                    <span><i class="bi bi-calendar-event"></i> ${new Date(reg.createdAt).toLocaleString()}</span>
                    <button onclick="del(${reg.id})" class="text-red-400"><i class="bi bi-trash"></i></button>
                </div>
                <p class="text-sm font-bold mt-2 text-slate-700 px-1">${reg.observaciones || ''}</p>
            </div>
        `).join('');
    } catch (e) {
        h.innerHTML = '<p class="text-center text-red-400">Error de conexión.</p>';
    }
}