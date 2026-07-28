const { parse } = require('cookie');
const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, deleteDoc, updateDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyAcBmdyP0rJE7x0FQxIp4FEnKuTsO5wH14",
    authDomain: "bombctrp131344.firebaseapp.com",
    projectId: "bombctrp131344",
    storageBucket: "bombctrp131344.firebasestorage.app",
    messagingSenderId: "286186204549",
    appId: "1:286186204549:web:cc707dcc23cc664f1c28ec"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// Helper robusto para capturar los datos del formulario POST
async function parseBody(req) {
    return new Promise((resolve) => {
        if (req.body) return resolve(req.body);
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
                try { resolve(JSON.parse(body)); } catch(e) { resolve({}); }
            } else {
                const params = new URLSearchParams(body);
                const obj = {};
                for (const [key, value] of params.entries()) { obj[key] = value; }
                resolve(obj);
            }
        });
    });
}

module.exports = async (req, res) => {
    const cookies = parse(req.headers.cookie || '');
    if (!cookies.uid) return res.redirect('/api/login');

    // 1. Verificar seguridad con el bot si es administrador
    let isAdmin = false;
    try {
        const botRes = await fetch('http://nc.lynxnodes.es:25700/verificar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: cookies.uid })
        });
        const botData = await botRes.json();
        isAdmin = botData.isAdmin || false;
    } catch (err) {
        console.error('Error verificando admin:', err);
    }

    if (!isAdmin) return res.redirect('/api/acceso');

    const nombreUsuario = cookies.username || 'Desconocido';

    // 2. Manejar acciones POST (Aceptar, Rechazar con motivo o Eliminar apelación)
    if (req.method === 'POST') {
        const body = await parseBody(req);
        const action = body.action;
        const docId = body.docId;
        const motivoResolucion = body.motivoResolucion || '';

        if (docId) {
            try {
                if (action === 'aceptar') {
                    await updateDoc(doc(db, 'revisionASuperiores', docId), {
                        esAceptada: true,
                        estadoResolucion: 'Aceptada',
                        motivoResolucion: motivoResolucion,
                        revisadoPor: nombreUsuario,
                        fechaRevision: new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })
                    });
                } else if (action === 'rechazar') {
                    await updateDoc(doc(db, 'revisionASuperiores', docId), {
                        esAceptada: false,
                        estadoResolucion: 'Rechazada',
                        motivoResolucion: motivoResolucion,
                        revisadoPor: nombreUsuario,
                        fechaRevision: new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })
                    });
                } else if (action === 'eliminar') {
                    await deleteDoc(doc(db, 'revisionASuperiores', docId));
                }
            } catch (err) {
                console.error('Error procesando acción de apelación:', err);
            }
        }

        // Redirección POST-redirect-GET
        res.statusCode = 303;
        res.setHeader('Location', req.url);
        return res.end();
    }

    // 3. Obtener todas las apelaciones de 'revisionASuperiores'
    let apelaciones = [];
    try {
        const querySnapshot = await getDocs(collection(db, 'revisionASuperiores'));
        querySnapshot.forEach((document) => {
            apelaciones.push({
                id: document.id,
                ...document.data()
            });
        });
    } catch (err) {
        console.error('Error leyendo apelaciones:', err);
    }

    // 4. Renderizar el panel HTML con campo obligatorio para el motivo de resolución
    res.setHeader('Content-Type', 'text/html');
    res.send(`
        <html>
        <head>
            <title>Gestionar Apelaciones a Superiores</title>
            <script>
                function bloquearBotones(form) {
                    const botones = form.querySelectorAll('button');
                    botones.forEach(b => {
                        b.disabled = true;
                        b.style.opacity = '0.5';
                        b.innerText = 'Procesando...';
                    });
                }
            </script>
            <style>
                body { font-family: sans-serif; text-align: center; padding: 30px; background: #f4f4f9; color: #333; }
                .container { display: grid; gap: 20px; max-width: 700px; margin: auto; text-align: left; }
                .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); border-left: 5px solid #3498db; }
                .card.aceptada { border-left-color: #2ecc71; }
                .card.rechazada { border-left-color: #e74c3c; }
                .form-group { margin-top: 12px; margin-bottom: 12px; }
                label { display: block; font-weight: bold; margin-bottom: 4px; font-size: 0.9em; color: #555; }
                input[type="text"] { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
                .actions { display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap; }
                button { padding: 8px 14px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; color: white; }
                .btn-aceptar { background: #2ecc71; }
                .btn-rechazar { background: #e74c3c; }
                .btn-eliminar { background: #7f8c8d; }
                .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: bold; }
                .badge.pendiente { background: #f39c12; color: white; }
                .badge.aceptada { background: #2ecc71; color: white; }
                .badge.rechazada { background: #e74c3c; color: white; }
            </style>
        </head>
        <body>
            <h2>Panel de Apelaciones - Admin: ${nombreUsuario}</h2>
            <hr style="margin: 20px auto; width: 60%; border: 1px solid #ddd;">
            
            <h3>Solicitudes de Revisión Pendientes y Registradas</h3>
            
            ${apelaciones.length === 0 ? '<p style="color:#7f8c8d;">No hay apelaciones registradas.</p>' : ''}

            <div class="container">
                ${apelaciones.map(a => {
                    const estado = a.estadoResolucion || 'Pendiente';
                    let badgeClass = 'pendiente';
                    if (estado === 'Aceptada') badgeClass = 'aceptada';
                    if (estado === 'Rechazada') badgeClass = 'rechazada';

                    return `
                        <div class="card ${estado.toLowerCase()}">
                            <p style="margin:5px 0;"><b>Usuario ID:</b> ${a.usuarioId || 'N/A'}</p>
                            <p style="margin:5px 0;"><b>ID de Sanción:</b> ${a.sancionId || 'N/A'}</p>
                            <p style="margin:5px 0;"><b>Motivo de Apelación:</b> ${a.motivo || 'N/A'}</p>
                            <p style="margin:5px 0;"><b>Detalles:</b> ${a.detalles || 'N/A'}</p>
                            <p style="margin:5px 0;"><b>Notas:</b> ${a.notas || 'Ninguna'}</p>
                            <p style="margin:5px 0;"><b>Fecha Envío:</b> ${a.fechaRegistro || 'N/A'}</p>
                            <p style="margin:5px 0;"><b>Estado:</b> <span class="badge ${badgeClass}">${estado}</span> ${a.revisadoPor ? `(por ${a.revisadoPor})` : ''}</p>
                            ${a.motivoResolucion ? `<p style="margin:5px 0; color: #2c3e50;"><b>Motivo de Resolución:</b> ${a.motivoResolucion}</p>` : ''}
                            
                            <form method="POST" onsubmit="bloquearBotones(this)">
                                <input type="hidden" name="docId" value="${a.id}">
                                
                                <div class="form-group">
                                    <label>Motivo de la Resolución (Obligatorio):</label>
                                    <input type="text" name="motivoResolucion" value="${a.motivoResolucion || ''}" placeholder="Escribe el por qué de la decisión..." required>
                                </div>

                                <div class="actions">
                                    <button type="submit" name="action" value="aceptar" class="btn-aceptar">Aceptar Apelación</button>
                                    <button type="submit" name="action" value="rechazar" class="btn-rechazar">Rechazar Apelación</button>
                                    <button type="submit" name="action" value="eliminar" class="btn-eliminar">Eliminar de la BD</button>
                                </div>
                            </form>
                        </div>
                    `;
                }).join('')}
            </div>

            <br><br>
            <a href="/api/administracion" style="padding:12px 25px; background:#2c3e50; color:white; text-decoration:none; border-radius:4px; font-weight:bold;">Volver al panel de administración</a>
        </body>
        </html>
    `);
};
