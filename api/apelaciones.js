const { parse } = require('cookie');
const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

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

function parseFecha(fecha) {
    if (!fecha) return new Date(0);
    if (fecha instanceof Date) return fecha;
    if (typeof fecha.toDate === 'function') {
        return fecha.toDate();
    }
    if (typeof fecha.seconds === 'number') {
        return new Date(fecha.seconds * 1000);
    }
    if (typeof fecha === 'string') {
        try {
            let fStr = fecha.trim();
            let parsed = new Date(fStr);
            if (!isNaN(parsed.getTime())) return parsed;

            if (fStr.includes('/')) {
                const partes = fStr.split(',');
                const fechaPart = partes[0].trim();
                const [p1, p2, p3] = fechaPart.split('/').map(Number);
                let dia, mes, anio;
                if (p1 > 12) {
                    dia = p1; mes = p2; anio = p3;
                } else if (p2 > 12) {
                    mes = p1; dia = p2; anio = p3;
                } else {
                    dia = p1; mes = p2; anio = p3;
                }
                
                let hora = 0, min = 0, sec = 0;
                if (partes[1]) {
                    const horaPart = partes[1].trim();
                    const isPM = horaPart.toUpperCase().includes('PM');
                    const isAM = horaPart.toUpperCase().includes('AM');
                    const timeClean = horaPart.replace(/AM|PM/gi, '').trim();
                    const timeParts = timeClean.split(':').map(Number);
                    hora = timeParts[0] || 0;
                    min = timeParts[1] || 0;
                    sec = timeParts[2] || 0;
                    if (isPM && hora < 12) hora += 12;
                    if (isAM && hora === 12) hora = 0;
                }
                return new Date(anio, mes - 1, dia, hora, min, sec);
            }
        } catch (e) {
            return new Date(0);
        }
    }
    return new Date(0);
}

function obtenerDiasLimite(tipo) {
    if (!tipo) return 21;
    const t = tipo.toLowerCase().trim();
    if (t.includes('grave')) return 31;
    return 21; // Leve o Moderada
}

function formatearTipoSancion(tipo) {
    if (!tipo) return 'N/A';
    const t = tipo.toLowerCase().trim();
    if (t.includes('leve')) return 'Leve (21)';
    if (t.includes('moderada')) return 'Moderada (21)';
    if (t.includes('grave')) return 'Grave (31)';
    return tipo;
}

function formatearFecha(fecha) {
    if (!fecha) return 'N/A';
    const d = parseFecha(fecha);
    if (isNaN(d.getTime())) return String(fecha);
    return d.toLocaleString();
}

module.exports = async (req, res) => {
    const cookies = parse(req.headers.cookie || '');
    if (!cookies.uid) return res.redirect('/api/login');

    const userId = cookies.uid;
    const nombreUsuario = cookies.username || 'Usuario';

    let sancionesList = [];
    let apelacionesMap = {};

    try {
        // 1. Obtener apelaciones del usuario
        const qApelaciones = query(collection(db, 'revisionASuperiores'), where('usuarioId', '==', userId));
        const apSnap = await getDocs(qApelaciones);
        apSnap.forEach(docSnap => {
            const data = docSnap.data();
            if (data.sancionId) {
                apelacionesMap[String(data.sancionId)] = { id: docSnap.id, ...data };
            }
        });

        // 2. Obtener sanciones del usuario
        const qSanciones = query(collection(db, 'sanciones'), where('usuarioId', '==', userId));
        const sancSnap = await getDocs(qSanciones);

        const ahora = new Date();

        sancSnap.forEach(docSnap => {
            const sancionId = docSnap.id;
            const data = docSnap.data();
            const tipo = data.tipo || 'Leve';
            const diasLimite = obtenerDiasLimite(tipo);
            
            const fechaSancion = parseFecha(data.fechaRegistro);
            const diferenciaMs = ahora - fechaSancion;
            const diasTranscurridos = diferenciaMs / (1000 * 60 * 60 * 24);
            const plazoExpirado = diasTranscurridos > diasLimite;

            sancionesList.push({
                id: sancionId,
                ...data,
                tipoSancionFormateada: formatearTipoSancion(tipo),
                fechaFormateada: formatearFecha(data.fechaRegistro),
                apelacion: apelacionesMap[sancionId] || null,
                plazoExpirado: plazoExpirado,
                diasLimite: diasLimite
            });
        });
    } catch (err) {
        console.error('Error leyendo sanciones o apelaciones:', err);
    }

    res.setHeader('Content-Type', 'text/html');
    res.send(`
        <html>
        <head>
            <title>Mis Sanciones y Apelaciones</title>
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
                    max-width: 750px; 
                    margin: auto; 
                    text-align: left; 
                }
                .card { 
                    background: #f9f9f9; 
                    padding: 20px; 
                    border-radius: 8px; 
                    box-shadow: 0 4px 6px rgba(0,0,0,0.08); 
                    border: 1px solid #e0e0e0;
                    border-left: 5px solid #3498db; 
                }
                .card.aceptada { border-left-color: #2ecc71; }
                .card.rechazada { border-left-color: #e74c3c; }
                .card.pendiente { border-left-color: #f39c12; }
                .card.expirada { border-left-color: #95a5a6; }
                
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
                .badge.expirado { background: #95a5a6; color: white; }
                .badge-tipo { background: #e0e0e0; color: #333333; padding: 3px 8px; border-radius: 4px; font-size: 0.85em; font-weight: bold; }
                
                .response-box {
                    background: #f1f1f1;
                    padding: 12px;
                    border-radius: 6px;
                    margin-top: 10px;
                    border: 1px solid #ddd;
                }
                
                .btn-apelar {
                    display: inline-block;
                    margin-top: 10px;
                    padding: 8px 16px;
                    background: #3498db;
                    color: white;
                    border-radius: 4px;
                    font-weight: bold;
                    text-decoration: none;
                }
                .btn-apelar:hover { background: #2980b9; }

                a { color: #3498db; text-decoration: none; }
                a:hover { text-decoration: underline; }
            </style>
        </head>
        <body>
            <h2>Tus Sanciones y Apelaciones</h2>
            <p style="color: #666666;">Usuario conectado: <b>${nombreUsuario}</b></p>
            <hr style="margin: 20px auto; width: 60%; border: 1px solid #dddddd;">
            
            ${sancionesList.length === 0 ? '<p style="color:#666666;">No tienes ninguna sanción registrada.</p>' : ''}

            <div class="container">
                ${sancionesList.map(item => {
                    const ap = item.apelacion;
                    let estadoCardClass = 'pendiente';

                    if (ap) {
                        const estado = ap.estadoResolucion ? ap.estadoResolucion.toLowerCase() : 'pendiente';
                        estadoCardClass = estado;
                    } else if (!item.plazoExpirado) {
                        estadoCardClass = 'pendiente';
                    } else {
                        estadoCardClass = 'expirada';
                    }

                    return `
                        <div class="card ${estadoCardClass}">
                            <p style="margin:5px 0;"><b>ID de Sanción:</b> ${item.id}</p>
                            <p style="margin:5px 0;"><b>Tipo de Sanción:</b> <span class="badge-tipo">${item.tipoSancionFormateada}</span></p>
                            <p style="margin:5px 0;"><b>Motivo:</b> ${item.motivo || 'N/A'}</p>
                            <p style="margin:5px 0;"><b>Instructor:</b> ${item.instructor || 'N/A'}</p>
                            <p style="margin:5px 0;"><b>Fecha de Sanción:</b> ${item.fechaFormateada}</p>
                            
                            <p style="margin:10px 0 5px 0;"><b>Estado / Plazo:</b> 
                                ${ap ? `<span class="badge ${ap.estadoResolucion ? ap.estadoResolucion.toLowerCase() : 'pendiente'}">${ap.estadoResolucion || 'Pendiente'}</span>` : 
                                  (!item.plazoExpirado ? `<span class="badge pendiente">Disponible para Apelar (${item.diasLimite} días)</span>` : `<span class="badge expirado">Plazo Expirado (${item.diasLimite} días)</span>`)}
                            </p>

                            ${ap ? `
                                <div class="response-box">
                                    <p style="margin:0 0 5px 0; color: #111;"><b>Respuesta del Staff (${ap.revisadoPor || 'Administración'}):</b></p>
                                    <p style="margin:0; color: #444;">${ap.motivoResolucion || 'Pendiente de revisión por superiores.'}</p>
                                    <p style="margin:5px 0 0 0; font-size: 0.8em; color: #666;">Fecha revisión: ${ap.fechaRevision || 'Pendiente'}</p>
                                </div>
                            ` : (
                                !item.plazoExpirado ? `
                                    <a href="/api/crear-apelacion?sancionId=${item.id}" class="btn-apelar">Apelar Sanción</a>
                                ` : `
                                    <p style="margin:8px 0 0 0; font-size: 0.85em; color: #c0392b; font-style: italic;">El plazo de ${item.diasLimite} días para apelar esta sanción ha finalizado.</p>
                                `
                            )}
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
