const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');
const { parse } = require('cookie');

const firebaseConfig = {
    apiKey: "AIzaSyAcBmdyP0rJE7x0FQxIp4FEnKuTsO5wH14",
    authDomain: "bombctrp131344.firebaseapp.com",
    projectId: "bombctrp131344",
    storageBucket: "bombctrp131344.firebasestorage.app",
    messagingSenderId: "286186204549",
    appId: "1:286186204549:web:cc707dcc23cc664f1c28ec"
};

const db = getFirestore(initializeApp(firebaseConfig));

module.exports = async (req, res) => {
    const cookies = parse(req.headers.cookie || '');
    if (!cookies.uid) return res.redirect('/api/login');

    // 1. Consultar sanciones del usuario
    const qSanciones = query(collection(db, 'sanciones'), where("usuarioId", "==", cookies.uid));
    const snapshotSanciones = await getDocs(qSanciones);

    // 2. Consultar apelaciones existentes en revisionASuperiores
    const qRevisiones = query(collection(db, 'revisionASuperiores'), where("usuarioId", "==", cookies.uid));
    const snapshotRevisiones = await getDocs(qRevisiones);
    
    const apelacionesMap = {};
    snapshotRevisiones.forEach(docSnap => {
        const data = docSnap.data();
        if (data.sancionId) {
            apelacionesMap[data.sancionId] = true;
        }
    });
    
    let html = `
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: sans-serif; background-color: #f4f7f9; padding: 20px; color: #333; }
            .container { max-width: 600px; margin: auto; }
            .card { background: white; padding: 15px; margin-bottom: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 5px solid #e74c3c; }
            .row { margin-bottom: 5px; }
            .label { font-weight: bold; color: #555; }
            .back-btn { display: inline-block; margin-bottom: 15px; color: #34495e; text-decoration: none; font-weight: bold; }
            .btn-apelar { 
                display: inline-block; 
                margin-top: 10px; 
                padding: 8px 15px; 
                background-color: #3498db; 
                color: white; 
                text-decoration: none; 
                border-radius: 4px; 
                font-weight: bold; 
            }
            .btn-apelar.disabled { 
                background-color: #bdc3c7; 
                pointer-events: none; 
                cursor: not-allowed; 
            }
            .status-text { 
                margin-top: 8px; 
                font-size: 0.9em; 
                color: #e67e22; 
                font-weight: bold; 
            }
        </style>
    </head>
    <body>
        <div class="container">
            <a href="/api/acceso" class="back-btn">← Volver al panel</a>
            <h1>Portal de Apelaciones</h1>
    `;

    if (snapshotSanciones.empty) {
        html += `<p>No tienes sanciones registradas.</p>`;
    } else {
        const now = new Date();

        snapshotSanciones.forEach(docSnap => {
            const d = docSnap.data();
            const docId = docSnap.id;

            let fechaSancion = null;
            let fechaStr = 'N/A';

            if (d.fechaRegistro) {
                if (typeof d.fechaRegistro === 'object' && d.fechaRegistro.seconds) {
                    fechaSancion = new Date(d.fechaRegistro.seconds * 1000);
                    fechaStr = fechaSancion.toLocaleDateString();
                } else if (typeof d.fechaRegistro === 'string') {
                    fechaStr = d.fechaRegistro;
                    const partes = d.fechaRegistro.split(',');
                    if (partes.length > 0) {
                        const fechaPartes = partes[0].trim().split('/');
                        if (fechaPartes.length === 3) {
                            fechaSancion = new Date(`${fechaPartes[2]}-${fechaPartes[1].padStart(2, '0')}-${fechaPartes[0].padStart(2, '0')}`);
                        }
                    }
                }
            }

            const tipoSancion = (d.tipo || '').toLowerCase();
            let diasNecesarios = (tipoSancion === 'grave') ? 31 : 21;

            let habilitado = false;
            let mensajeEstado = '';

            if (fechaSancion && !isNaN(fechaSancion.getTime())) {
                const tiempoRestantesMs = now - fechaSancion;
                const diasPasados = tiempoRestantesMs / (1000 * 60 * 60 * 24);

                if (diasPasados >= diasNecesarios) {
                    habilitado = true;
                } else {
                    const diasFaltantes = Math.ceil(diasNecesarios - diasPasados);
                    mensajeEstado = `Apelar en ${diasFaltantes} ${diasFaltantes === 1 ? 'día' : 'días'}`;
                }
            } else {
                mensajeEstado = `Apelar en ${diasNecesarios} días`;
            }

            if (habilitado) {
                mensajeEstado = `¡Ya puedes apelar!`;
            }

            // Si ya existe una apelación enviada para esta sanción
            if (apelacionesMap[docId]) {
                mensajeEstado = "Resolución Pendiente...";
                habilitado = false;
            }

            html += `
                <div class="card">
                    <div class="row"><span class="label">Tipo:</span> ${d.tipo || 'N/A'}</div>
                    <div class="row"><span class="label">Motivo:</span> ${d.motivo || 'N/A'}</div>
                    <div class="row"><span class="label">Instructor:</span> ${d.instructor || 'N/A'}</div>
                    <div class="row"><span class="label">Fecha:</span> ${fechaStr}</div>
                    <div class="status-text">${mensajeEstado}</div>
                    <a href="/api/apelaSancion?id=${docId}" class="btn-apelar ${habilitado ? '' : 'disabled'}">Apelar</a>
                </div>
            `;
        });
    }

    html += `</div></body></html>`;
    res.send(html);
};
