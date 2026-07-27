const { parse } = require('cookie');
const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, collection, getDocs, addDoc } = require('firebase/firestore');

// Tu configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAcBmdyP0rJE7x0FQxIp4FEnKuTsO5wH14",
    authDomain: "bombctrp131344.firebaseapp.com",
    projectId: "bombctrp131344",
    storageBucket: "bombctrp131344.firebasestorage.app",
    messagingSenderId: "286186204549",
    appId: "1:286186204549:web:cc707dcc23cc664f1c28ec"
};

// Inicializar Firebase Web SDK
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// Webhook para nuevas observaciones
const NUEVA_OBSERVACION_WEBHOOK_URL = 'https://discord.com/api/webhooks/1531285172115472424/OwkqlKq4zxkdddW48JhjuArZqRqDbj25qslR1mbZpwI3hgX0KqnN6c_-T64HH71_3_zx';

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

    // 2. Manejar POST (Crear nueva observación)
    if (req.method === 'POST') {
        const action = req.body.action;

        if (action === 'crear_observacion') {
            const usuarioId = req.body.usuarioId;
            const usuarioNombre = req.body.usuarioNombre;
            const motivo = req.body.motivo;
            const nota = Number(req.body.nota) || 0;
            const tipo = req.body.tipo || 'positiva';
            const instructor = cookies.username || 'Administrador';
            const fechaRegistro = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });

            if (usuarioId && motivo) {
                // Guardar en Firestore
                try {
                    await addDoc(collection(db, 'observaciones'), {
                        usuarioId,
                        usuarioNombre,
                        motivo,
                        nota,
                        tipo,
                        instructor,
                        fechaRegistro
                    });
                } catch (dbErr) {
                    console.error('Error guardando observación en Firestore:', dbErr);
                }

                // Enviar Webhook
                try {
                    const mensaje = `📝 **Nueva Observación Registrada**\n👤 **Usuario:** ${usuarioNombre} (<@${usuarioId}>)\n🛠️ **Instructor:** ${instructor}\n📌 **Tipo:** ${tipo}\n⭐ **Nota:** ${nota}\n💬 **Motivo:** ${motivo}`;
                    await fetch(NUEVA_OBSERVACION_WEBHOOK_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ content: mensaje })
                    });
                } catch (webhookErr) {
                    console.error('Error enviando webhook de nueva observación:', webhookErr);
                }
            }
        }

        res.statusCode = 303;
        res.setHeader('Location', req.url);
        return res.end();
    }

    // 3. Obtener las observaciones de Firestore y agrupar por usuario
    let usuariosMap = {};
    try {
        const querySnapshot = await getDocs(collection(db, 'observaciones'));
        querySnapshot.forEach((document) => {
            const data = document.data();
            const usuarioId = data.usuarioId;
            const usuarioNombre = data.usuarioNombre || 'Desconocido';
            const nota = Number(data.nota) || 0;

            if (!usuarioId) return;

            if (!usuariosMap[usuarioId]) {
                usuariosMap[usuarioId] = {
                    usuarioId: usuarioId,
                    usuarioNombre: usuarioNombre,
                    sumaNotas: 0,
                    totalValidas: 0,
                    observaciones: []
                };
            }

            usuariosMap[usuarioId].observaciones.push({
                id: document.id,
                motivo: data.motivo || 'Sin motivo',
                nota: nota,
                tipo: data.tipo || 'positiva',
                instructor: data.instructor || 'Desconocido',
                fechaRegistro: data.fechaRegistro || 'Fecha desconocida'
            });

            if (nota > 0) {
                usuariosMap[usuarioId].sumaNotas += nota;
                usuariosMap[usuarioId].totalValidas += 1;
            }
        });
    } catch (err) {
        console.error('Error leyendo Firestore:', err);
    }

    // Calcular la media final y avatar por usuario
    const resultadosUsuarios = Object.values(usuariosMap).map(user => {
        const media = user.totalValidas > 0 ? (user.sumaNotas / user.totalValidas).toFixed(2) : 'Sin notas válidas';
        
        let avatarUrl;
        try {
            const userIdBigInt = BigInt(user.usuarioId);
            const defaultAvatarIndex = Number((userIdBigInt >> 22n) % 6n);
            avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
        } catch (e) {
            avatarUrl = 'https://cdn.discordapp.com/embed/avatars/0.png';
        }

        return {
            ...user,
            media,
            avatarUrl,
            totalObservaciones: user.observaciones.length
        };
    });

    const nombreUsuario = cookies.username || 'Desconocido';

    // 4. Renderizar el panel HTML
    res.setHeader('Content-Type', 'text/html');
    res.send(`
        <html>
        <head>
            <title>Medias y Gestión de Observaciones</title>
        </head>
        <body style="font-family:sans-serif; text-align:center; padding:30px; background:#f4f4f9;">
            <h2>Panel de Observaciones - Administrador: ${nombreUsuario}</h2>
            <hr style="margin: 20px auto; width: 60%; border: 1px solid #ddd;">
            
            <h3>Medias de Observaciones por Usuario</h3>
            
            ${resultadosUsuarios.length === 0 ? '<p style="color:#7f8c8d;">No hay registros de observaciones en este momento.</p>' : ''}

            <div style="display:grid; gap:15px; max-width:700px; margin:auto; text-align:left;">
                ${resultadosUsuarios.map(u => `
                    <div style="background:white; padding:20px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
                        <div style="display:flex; align-items:center; gap:15px;">
                            <img src="${u.avatarUrl}" alt="Avatar" style="width:60px; height:60px; border-radius:50%; object-fit:cover; background:#ddd;">
                            <div style="flex:1;">
                                <p style="margin:0 0 5px 0; font-size:18px;"><b>${u.usuarioNombre}</b></p>
                                <p style="margin:0 0 5px 0; color:#555; font-size:13px;">ID: <code>${u.usuarioId}</code></p>
                                <p style="margin:0 0 3px 0; color:#555; font-size:14px;">Total observaciones: <b>${u.totalObservaciones}</b> (Válidas para media: ${u.totalValidas})</p>
                                <p style="margin:0; font-size:16px; color:#2c3e50;">Media de observaciones: <b style="color: ${u.media === 'Sin notas válidas' ? '#e74c3c' : '#27ae60'};">${u.media}</b></p>
                            </div>
                        </div>

                        <!-- Desplegable para ver observaciones y añadir nueva -->
                        <details style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px;">
                            <summary style="cursor:pointer; font-weight:bold; color:#2980b9;">Ver observaciones y añadir nueva</summary>
                            
                            <div style="margin-top: 10px; display: grid; gap: 10px;">
                                <h4 style="margin: 5px 0; color: #333;">Observaciones registradas:</h4>
                                ${u.observaciones.map(obs => `
                                    <div style="background: #f9f9f9; padding: 10px; border-radius: 6px; border-left: 4px solid ${obs.nota > 0 ? '#27ae60' : '#e67e22'}; font-size: 13px;">
                                        <p style="margin: 0 0 3px 0;"><b>Motivo:</b> ${obs.motivo}</p>
                                        <p style="margin: 0 0 3px 0;"><b>Nota:</b> ${obs.nota} | <b>Tipo:</b> ${obs.tipo} | <b>Instructor:</b> ${obs.instructor}</p>
                                        <p style="margin: 0; color: #7f8c8d; font-size: 11px;">Fecha: ${obs.fechaRegistro}</p>
                                    </div>
                                `).join('')}

                                <hr style="border:0; border-top:1px dashed #ccc; margin: 10px 0;">

                                <!-- Formulario para Nueva Observación -->
                                <form method="POST" style="background: #fdfdfd; padding: 12px; border-radius: 6px; border: 1px solid #ddd;">
                                    <h4 style="margin: 0 0 10px 0; color: #2c3e50;">Nueva Observación</h4>
                                    <input type="hidden" name="action" value="crear_observacion">
                                    <input type="hidden" name="usuarioId" value="${u.usuarioId}">
                                    <input type="hidden" name="usuarioNombre" value="${u.usuarioNombre}">

                                    <div style="margin-bottom: 8px;">
                                        <label style="font-size: 12px; font-weight: bold; display: block; margin-bottom: 3px;">Motivo:</label>
                                        <textarea name="motivo" style="width: 100%; height: 50px; padding: 6px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-family: sans-serif;" required></textarea>
                                    </div>

                                    <div style="display: flex; gap: 10px; margin-bottom: 8px;">
                                        <div style="flex: 1;">
                                            <label style="font-size: 12px; font-weight: bold; display: block; margin-bottom: 3px;">Nota (0 si no aplica):</label>
                                            <input type="number" name="nota" min="0" max="10" value="0" style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" required>
                                        </div>
                                        <div style="flex: 1;">
                                            <label style="font-size: 12px; font-weight: bold; display: block; margin-bottom: 3px;">Tipo:</label>
                                            <select name="tipo" style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
                                                <option value="positiva">Positiva</option>
                                                <option value="negativa">Negativa</option>
                                                <option value="neutral">Neutral</option>
                                            </select>
                                        </div>
                                    </div>

                                    <button type="submit" style="background:#2980b9; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; font-weight:bold; width: 100%;">Enviar Nueva Observación</button>
                                </form>
                            </div>
                        </details>
                    </div>
                `).join('')}
            </div>

            <br><br>
            <a href="/api/administracion" style="padding:12px 25px; background:#7f8c8d; color:white; text-decoration:none; border-radius:4px; font-weight:bold;">Volver al panel de administración</a>
        </body>
        </html>
    `);
};
