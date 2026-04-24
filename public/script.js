// Configuración de APIs

const S_URL = 'https://mjxpqxyxkshtqlptccto.supabase.co';

const S_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qeHBxeHl4a3NodHFscHRjY3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MzQyOTAsImV4cCI6MjA5MjMxMDI5MH0.KGi6VT8g-zKeEi0NWHpkdzdKHP1mF11Ch0Q-46c2Wps';

const API = 'https://aquabit-op.onrender.com/api';



// Inicialización única de Supabase para evitar errores de consola

const supabaseClient = supabase.createClient(S_URL, S_KEY);



let tab = 'corte';

let files = [];



/**

 * Cambia entre las pestañas de CORTES y REPOSICIÓN

 * Actualiza la interfaz visual usando clases de Bootstrap 5

 */

function setTab(t) {

    tab = t;

    // Actualización de clases de botones

    document.getElementById('t-corte').classList.toggle('active', t === 'corte');

    document.getElementById('t-repo').classList.toggle('active', t === 'reposicion');



    // Limpiar formulario al cambiar

    files = [];

    document.getElementById('p').innerHTML = '';

    document.getElementById('o').value = '';



    load(); // Cargar historial de la pestaña seleccionada

}



/**

 * Maneja la previsualización de imágenes seleccionadas

 */

document.getElementById('f').onchange = e => {

    const previewContainer = document.getElementById('p');

    Array.from(e.target.files).forEach(file => {

        files.push(file);

        const reader = new FileReader();

        reader.onload = ev => {

            const img = document.createElement('img');

            img.src = ev.target.result;

            img.className = "img-thumbnail shadow-sm animate-in";

            img.style.width = "80px";

            img.style.height = "80px";

            img.style.objectFit = "cover";

            previewContainer.appendChild(img);

        };

        reader.readAsDataURL(file);

    });

};



/**

 * Sube las fotos a Supabase y guarda el registro en PostgreSQL

 */

async function subir() {

    if (!files.length) return alert("Por favor, toma al menos una fotografía.");



    const btn = document.getElementById('s');

    btn.disabled = true;

    btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Guardando...`;



    try {

        const urls = [];

        for (let file of files) {

            const name = `aq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.jpg`;

            const { error } = await supabaseClient.storage.from('fotos-aquabit').upload(name, file);

            if (error) throw error;



            const { data } = supabaseClient.storage.from('fotos-aquabit').getPublicUrl(name);

            // Estructura de objeto para persistencia de estados

            urls.push({ url: data.publicUrl, verificado: false });

        }



        const res = await fetch(`${API}/upload`, {

            method: 'POST',

            headers: { 'Content-Type': 'application/json' },

            body: JSON.stringify({

                tipo: tab,

                observaciones: document.getElementById('o').value,

                fotos: urls

            })

        });



        if (res.ok) {

            alert("✅ Registro guardado exitosamente");

            setTab(tab); // Recarga la pestaña actual

        }

    } catch (e) {

        console.error(e);

        alert("Error al subir: " + e.message);

    } finally {

        btn.disabled = false;

        btn.innerHTML = `<i class="bi bi-cloud-arrow-up-fill me-1"></i> GUARDAR REGISTRO`;

    }

}



/**

 * Carga el historial desde el servidor de Render y renderiza las tarjetas con Bootstrap

 */

async function load() {

    const h = document.getElementById('h');

    h.innerHTML = `

        <div class="text-center py-5 text-muted">

            <div class="spinner-border text-primary mb-2"></div>

            <p>Sincronizando datos...</p>

        </div>`;



    try {

        const res = await fetch(`${API}/registros/${tab}`);

        const data = await res.json();



        if (data.length === 0) {

            h.innerHTML = `<div class="alert alert-info text-center shadow-sm">No hay registros de ${tab} hoy.</div>`;

            return;

        }



        h.innerHTML = data.map(reg => `

            <div class="card card-registro shadow-sm animate-in mb-3 border-0">

                <div class="card-body">

                    <div class="d-flex gap-3 overflow-auto pb-2 mb-3">

                        ${reg.fotos.map((f, i) => {

            // Soporte para registros antiguos (string) y nuevos (objeto)

            const url = (typeof f === 'object') ? f.url : f;

            const verificado = (typeof f === 'object') ? f.verificado : false;



            return `

                            <div class="item-foto text-center">

                                <img src="${url}" onclick="window.open('${url}')" class="shadow-sm">

                                ${tab === 'reposicion' ? (

                    verificado

                        ? `<div class="badge-ok animate-in"><i class="bi bi-check-circle-fill"></i> REPUES.<br>${f.fechaRepo || ''}</div>`

                        : `<button class="btn btn-sm btn-outline-primary btn-repo-action" onclick="patch(${reg.id}, ${i})">Reponer</button>`

                ) : ''}

                            </div>`;

        }).join('')}

                    </div>

                   

                    <div class="d-flex justify-content-between align-items-end">

                        <div>

                            <p class="mb-1 text-muted" style="font-size: 0.8rem;">

                                <i class="bi bi-calendar3"></i> ${new Date(reg.createdAt).toLocaleString()}

                            </p>

                            <p class="mb-0 fw-bold text-dark">${reg.observaciones || '<span class="text-muted fw-normal small">Sin notas de terreno</span>'}</p>

                        </div>

                        <button class="btn btn-link text-danger p-0" onclick="del(${reg.id})">

                            <i class="bi bi-trash3 h5"></i>

                        </button>

                    </div>

                </div>

            </div>

        `).join('');

    } catch (e) {

        h.innerHTML = `<div class="alert alert-danger shadow-sm">Error de conexión con el servidor.</div>`;

    }

}



/**

 * Actualiza el estado de una foto a "Repuesto" con la hora actual

 */

async function patch(id, idx) {

    try {

        const res = await fetch(`${API}/registros/${id}/foto/${idx}`, { method: 'PATCH' });

        if (res.ok) {

            load(); // Refrescar historial para mostrar el badge verde

        }

    } catch (e) {

        alert("No se pudo actualizar el estado.");

    }

}



/**

 * Elimina un registro completo de la base de datos

 */

async function del(id) {

    if (confirm("¿Estás seguro de eliminar este registro permanentemente?")) {

        try {

            await fetch(`${API}/registros/${id}`, { method: 'DELETE' });

            load();

        } catch (e) {

            alert("Error al eliminar.");

        }

    }

}



// Carga inicial al abrir la página

window.onload = load;