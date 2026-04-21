let currentTab = 'cortes';
let photos = [];

function switchTab(tab) {
    currentTab = tab;
    photos = [];
    document.getElementById('btn-cortes').classList.toggle('active', tab === 'cortes');
    document.getElementById('btn-reposiciones').classList.toggle('active', tab === 'reposiciones');
    document.getElementById('observaciones').value = "";
    actualizarVista();
}

document.getElementById('file-input').addEventListener('change', function (e) {
    const file = e.target.files;
    const limite = currentTab === 'cortes' ? 3 : 1;

    if (file && photos.length < limite) {
        photos.push({ id: Date.now(), file: file, checked: false });
        actualizarVista();
    } else {
        alert(`Límite de fotos alcanzado para ${currentTab}`);
    }
});

function eliminarFoto(id) {
    photos = photos.filter(p => p.id !== id);
    actualizarVista();
}

function actualizarVista() {
    const list = document.getElementById('image-list');
    const countText = document.getElementById('photo-count');
    const limite = currentTab === 'cortes' ? 3 : 1;

    countText.innerText = `Fotos: ${photos.length} / ${limite}`;
    list.innerHTML = photos.map(p => `
        <div class="photo-item">
            <img src="${URL.createObjectURL(p.file)}">
            <div class="controls">
                <label><input type="checkbox" onchange="toggleCheck(${p.id})"> OK</label>
                <button class="delete-btn" onclick="eliminarFoto(${p.id})">Eliminar</button>
            </div>
        </div>
    `).join('');
}

function toggleCheck(id) {
    const photo = photos.find(p => p.id === id);
    if (photo) photo.checked = !photo.checked;
}

async function enviarDatos() {
    const limite = currentTab === 'cortes' ? 3 : 1;
    if (photos.length < limite) return alert(`Faltan fotos para ${currentTab}`);

    const formData = new FormData();
    formData.append('tipo', currentTab);
    formData.append('observaciones', document.getElementById('observaciones').value);
    photos.forEach(p => formData.append('fotos', p.file));

    try {
        const response = await fetch('/api/upload', { method: 'POST', body: formData });
        const res = await response.json();
        if (response.ok) {
            alert("✅ Registro guardado en AquaBit OP");
            location.reload();
        }
    } catch (err) {
        alert("❌ Error al conectar con el servidor");
    }
}