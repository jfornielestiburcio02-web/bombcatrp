const { parse } = require('cookie');
const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, doc, getDoc } = require('firebase/firestore');

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

function formatearTipoSancion(tipo) {
    if (!tipo) return 'N/A';
    const t = tipo.toLowerCase().trim();
    if (t.includes('leve')) return 'Leve (21)';
    if (t.includes('moderada')) return 'Moderada (21)';
    if (t.includes('grave')) return 'Grave (31)';
    return tipo;
}

module.exports = async (req, res) => {
    const cookies = parse(req.headers.cookie || '');
    if (!cookies.uid) return res.redirect('/api/login');

    const userId = cookies.uid;
    const nombreUsuario = cookies.username || 'Usuario';

    let misApelaciones = [];
    try {
        const q = query(collection(db, 'revisionASuperiores'), where('usuarioId', '==', userId));
        const querySnapshot = await getDocs(q);
        for (const document of querySnapshot.docs) {
            const data = document.data();
            let tipoSancion = 'N/A';

            if (data.sancionId) {
                try {
                    const sancionDoc = await getDoc(doc(db, 'sanciones', String(data.sancionId)));
                    if (sancionDoc.exists()) {
                        tipoSancion = sancionDoc.data().tipo || 'N/A';
                    }
                } catch (e) {
                    console.error('Error buscando sanción:', e);
                }
            }

            misApelaciones.push({
                id: document.id,
                ...data,
                tipoSancionFormateada: formatearTipoSancion(tipoSancion)
            });
        }
    } catch (err) {
        console.error('Error leyendo las apelaciones del usuario:', err);
    }

    res.setHeader('Content-Type', 'text/html');
    res.send(`
        <html>
        <head>
            <title>Mis Apelaciones a Superiores</title>
            <style>
                body { 
                    font-family: sans-serif; 
                    text-align: center; 
                    padding: 30px; 
                    background: #ffffff; 
                    color: #222222; 
                }
                .container { 
                    display: grid; 
                    gap: 20px; 
                    max-width: 700px; 
                    margin: auto; 
                    text-align: left; 
                }
                .card { 
                    background: #f9f9f9; 
                    padding: 20px; 
                    border-radius: 8px; 
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
                    border: 1px solid #e0e0e0;
                    border-left: 5px solid #3498db; 
                }
                .card.aceptada { border-left-color: #2ecc71; }
                .card.rechazada { border-left-color: #e74c3c; }
                
                .badge { 
                    display: inline-block; 
                    padding: 4px 8px; 
                    border-radius: 4px; 
                    font-size: 0.85em; 
                    font-weight: bold; 
                }
                .badge.pendiente { background: #f39c12; color: white; }
                .badge.aceptada { background: #2ecc71; color: white; }
                .badge.rechazada { background: #e74c3c; color: white; }
                .badge-tipo { background: #e0e0e0; color: #333333; padding: 3px 8px; border-radius: 4px; font-size: 0.85em; font-weight: bold; }
                
                .response-box {
                    background: #f1f1f1;
                    padding: 12px;
                    border-radius: 6px;
                    margin-top: 10px;
                    border: 1px solid #ddd;
                }
                
                a {
                    color: #3498db;
                    text-decoration: none;
                }
                a:hover {
                    text-decoration: underline;
                }
            </style>
        </head>
        <body>
            <h2>Estado de tus Apelaciones</h2>
            <p style="color: #666666;">Consultando solicitudes para: <b>${nombreUsuario}</b></p>
            <hr style="margin: 20px auto; width: 60%; border: 1px solid #dddddd;">
            
            ${misApelaciones.length === 0 ? '<p style="color:#666666;">No tienes ninguna apelación registrada en este momento.</p>' : ''}

            <div class="container">
                ${misApelaciones.map(a => {
                    const estado = a.estadoResolucion || 'Pendiente';
                    let badgeClass = 'pendiente';
                    if (estado === 'Aceptada') badgeClass = 'aceptada';
                    if (estado === 'Rechazada') badgeClass = 'rechazada';

                    return `
                        <div class="card ${estado.toLowerCase()}">
                            <p style="margin:5px 0;"><b>ID de Sanción:</b> ${a.sancionId || 'N/A'}</p>
                            <p style="margin:5px 0;"><b>Tipo de Sanción:</b> <span class="badge-tipo">${a.tipoSancionFormateada}</span></p>
                            <p style="margin:5px 0;"><b>Motivo de Apelación:</b> ${a.motivo || 'N/A'}</p>
                            <p style="margin:5px 0;"><b>Detalles:</b> ${a.detalles || 'N/A'}</p>
                            <p style="margin:5px 0;"><b>Fecha de Envío:</b> ${a.fechaRegistro || 'N/A'}</p>
                            <p style="margin:10px 0 5px 0;"><b>Resultado:</b> <span class="badge ${badgeClass}">${estado}</span></p>
                            
                            ${estado !== 'Pendiente' ? `
                                <div class="response-box">
                                    <p style="margin:0 0 5px 0; color: #111;"><b>Respuesta del Staff (${a.revisadoPor || 'Administración'}):</b></p>
                                    <p style="margin:0; color: #444;">${a.motivoResolucion || 'Sin motivo especificado.'}</p>
                                    <p style="margin:5px 0 0 0; font-size: 0.8em; color: #666;">Fecha revisión: ${a.fechaRevision || 'N/A'}</p>
                                </div>
                            ` : `
                                <p style="margin:5px 0; font-style: italic; color: #d68910; font-size: 0.9em;">Tu apelación está siendo revisada por los superiores.</p>
                            `}
                        </div>
                    `;
                }).join('')}
            </div>

            <br><br>
            <a href="/api/perfil" style="padding:12px 25px; background:#2c3e50; color:white; border-radius:4px; font-weight:bold;">Volver al panel / perfil</a>
        </body>
        </html>
    `);
};
