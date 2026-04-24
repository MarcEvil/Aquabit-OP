const S_URL = 'https://mjxpqxyxkshtqlptccto.supabase.co';
const S_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qeHBxeHl4a3NodHFscHRjY3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MzQyOTAsImV4cCI6MjA5MjMxMDI5MH0.KGi6VT8g-zKeEi0NWHpkdzdKHP1mF11Ch0Q-46c2Wps';
const API = 'https://aquabit-op.onrender.com/api';

const supabaseClient = supabase.createClient(S_URL, S_KEY);
let tab = 'corte';
let files = [];

function setTab(t) {
    tab = t;
    const body = document.body;
    const btnCorte = document.getElementById('t-corte');
    const btnRepo = document.getElementById('t-repo');

    // Cambiar tema visual según pestaña
    if (t === 'corte') {
        body.className = 'theme-corte pb-32 transition-colors duration-500';
    } else {
        body.className = 'theme-reposicion pb-32 transition-colors duration-500';
    }

    if (btnCorte && btnRepo) {
        btnCorte.classList.toggle('active', t === 'corte');
        btnRepo.classList.toggle('active', t === 'reposicion');
    }

    files = [];
    const p = document.getElementById('p');
    if (p) p.innerHTML = '';
    load();
}

document.getElementById('f').onchange = e => {
    const p = document.getElementById('p');
    Array.from(e.target.files).forEach(file => {
        files.push(file);
        const reader = new FileReader();
        reader.onload = ev => {
            const img = document.createElement('img');
            img.src = ev.target.result;
            img.className = "w-12 h-12 object-cover rounded-lg border-2 border-orange-400";
            p.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
};

async function subir() {
    if (!files.length) return alert("Faltan fotos");
    const s = document.getElementById('s');
    try {
        s.disabled = true; s.innerText = "SUBIENDO...";
        const urls = [];
        for (let file of files) {
            const name = `aq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.jpg`;
            await supabaseClient.storage.from('fotos-aquabit').upload(name, file);
            const { data } = supabaseClient.storage.from('fotos-aquabit').getPublicUrl(name);
            urls.push({ url: data.publicUrl, verificado: false });
        }
        await fetch(`${API}/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo: tab, observaciones: document.getElementById('o').value, fotos: urls })
        });
        document.getElementById('o').value = '';
        setTab(tab);
    } catch (e) { alert("Error al subir"); }
    finally { s.disabled = false; s.innerText = "GUARDAR REGISTRO"; }
}

async function load() {
    const h = document.getElementById('h');
    if (!h) return;
    h.innerHTML = '<p class="text-center text-slate-400">Cargando...</p>';
    try {
        const res = await fetch(`${API}/registros/${tab}`);
        const data = await res.json();
        h.innerHTML = data.map(reg => `
            <div class="card-registro animate-in">
                <div class="grid-fotos">
                    ${reg.fotos.map((f, i) => {
            const url = f.url || f;
            return `
                        <div class="flex flex-col items-center gap-2">
                            <img src="${url}" class="img-mini" onclick="window.open('${url}')">
                            ${tab === 'reposicion' ? (
                    f.verificado ? `<div class="badge-ok">REPUESTA.<br>${f.fechaRepo || ''}</div>`
                        : `<button onclick="patch(${reg.id}, ${i})" class="text-[9px] bg-white text-blue-600 px-2 py-1 rounded-lg font-black shadow-sm">REPOSICIÓN</button>`
                ) : ''}
                        </div>`;
        }).join('')}
                </div>
                <div class="flex justify-between items-center mt-3 pt-2 border-t border-slate-300/50">
                    <span class="text-[10px] text-slate-500 font-bold">${new Date(reg.createdAt).toLocaleString()}</span>
                    <button onclick="del(${reg.id})" class="text-red-400"><i class="bi bi-trash3"></i></button>
                </div>
                <p class="text-xs font-bold mt-2 text-slate-700">${reg.observaciones || ''}</p>
            </div>
        `).join('');
    } catch (e) { h.innerHTML = '<p class="text-center text-red-400">Error de conexión.</p>'; }
}

async function patch(id, idx) {
    await fetch(`${API}/registros/${id}/foto/${idx}`, { method: 'PATCH' });
    load();
}

async function del(id) {
    if (confirm("¿Borrar?")) { await fetch(`${API}/registros/${id}`, { method: 'DELETE' }); load(); }
}

window.onload = load;