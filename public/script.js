// Dentro de tu script.js, actualiza la parte de h.innerHTML:
h.innerHTML = data.map(reg => `
    <div class="card-registro">
        <div class="grid-fotos">
            ${reg.fotos.map((f, i) => {
    const url = f.url || f;
    const ok = f.verificado;
    return `
                <div class="item-foto text-center">
                    <img src="${url}" onclick="window.open('${url}')" class="shadow-sm">
                    ${tab === 'reposicion' ? (
            ok ? `<div class="badge-ok animate-in"><i class="bi bi-check-circle-fill"></i> REPUESTA.<br>${f.fechaRepo || ''}</div>`
                : `<button class="btn btn-sm btn-outline-primary btn-repo-action" onclick="patch(${reg.id}, ${i})">Reponer</button>`
        ) : ''}
                </div>`;
}).join('')}
        </div>
        <div class="d-flex justify-content-between align-items-end mt-3">
            <div>
                <p class="mb-1 text-meta"><i class="bi bi-calendar3"></i> ${new Date(reg.createdAt).toLocaleString()}</p>
                <p class="mb-0 fw-bold">${reg.observaciones || '<span class="text-muted fw-normal small">Sin notas</span>'}</p>
            </div>
            <button class="btn-del" onclick="del(${reg.id})"><i class="bi bi-trash3 h5"></i></button>
        </div>
    </div>
`).join('');