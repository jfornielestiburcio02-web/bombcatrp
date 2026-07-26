const { parse } = require('cookie');
const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, deleteDoc } = require('firebase/firestore');

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

// Tu Webhook de Discord
const WEBHOOK_URL = 'https://discord.com/api/webhooks/1530955276813992086/0JGm5Kn9uxVMVbWmZse8Fj3R-EN1PVgSolgtOLB7vnB2UK51pRwxkkBKDu4tWHIp6eJM';

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

    // 2. Manejar la acción cuando se pulsa Aceptar o Denegar (Método POST)
    if (req.method === 'POST') {
        let body = '';
        for await (const chunk of req) {
            body += chunk;
        }
        const params = new URLSearchParams(body);
        const docId = params.get('docId');
        const action = params.get('action'); // 'aceptar' o 'denegar'
        const usuarioId = params.get('usuarioId');
        const motivo = params.get('motivo');

        if (docId && usuarioId) {
            const mensaje = action === 'aceptar'
                ? `<@${usuarioId}>, se te ha aceptado la solicitud con la descripción: ${motivo}`
                : `<@${usuarioId}>, se te ha denegado la solicitud con la descripción: ${motivo}`;

            // Enviar alerta por Webhook de Discord
            try {
                await fetch(WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: mensaje })
                });
            } catch (webhookErr) {
                console.error('Error enviando webhook:', webhookErr);
            }

            // Eliminar la solicitud de Firestore
            try {
                await deleteDoc(doc(db, 'inactividades', docId));
            } catch (dbErr) {
                console.error('Error eliminando documento de Firestore:', dbErr);
            }
        }

        return res.redirect('/api/admin/gestionarFal');
    }

    // 3. Obtener los documentos de Firestore (Método GET)
    let solicitudes = [];
    try {
        const querySnapshot = await getDocs(collection(db, 'inactividades'));
        querySnapshot.forEach((document) => {
            solicitudes.push({ id: document.id, ...document.data() });
        });
    } catch (err) {
        console.error('Error leyendo Firestore:', err);
    }

    const nombreUsuario = cookies.username || 'Desconocido';

    // 4. Renderizar el panel HTML con los datos de Firestore
    res.setHeader('Content-Type', 'text/html');
    res.send(`
        <html>
        <head><title>Gestionar Faltas de Asistencia</title></head>
        <body style="font-family:sans-serif; text-align:center; padding:30px; background:#f4f4f9;">
            <h2>Acceso Activo de administración como: ${nombreUsuario}</h2>
            <hr style="margin: 20px auto; width: 60%; border: 1px solid #ddd;">
            
            <h3>Gestión de Faltas / Inactividades</h3>
            
            ${solicitudes.length === 0 ? '<p style="color:#7f8c8d;">No hay solicitudes pendientes en este momento.</p>' : ''}

            <div style="display:grid; gap:15px; max-width:600px; margin:auto; text-align:left;">
                ${solicitudes.map(s => `
                    <div style="background:white; padding:20px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
                        <p style="margin:5px 0;"><b>Usuario:</b> ${s.usuarioNombre || 'Desconocido'} (<code>${s.usuarioId}</code>)</p>
                        <p style="margin:5px 0;"><b>Inicio:</b> ${s.inicio} | <b>Fin:</b> ${s.fin}</p>
                        <p style="margin:5px 0;"><b>Motivo:</b> ${s.motivo}</p>
                        
                        <form method="POST" style="display:flex; gap:10px; margin-top:15px;">
                            <input type="hidden" name="docId" value="${s.id}">
                            <input type="hidden" name="usuarioId" value="${s.usuarioId}">
                            <input type="hidden" name="motivo" value="${s.motivo}">
                            <button type="submit" name="action" value="aceptar" style="background:#27ae60; color:white; border:none; padding:10px 15px; border-radius:4px; cursor:pointer; flex:1; font-weight:bold;">Aceptar</button>
                            <button type="submit" name="action" value="denegar" style="background:#c0392b; color:white; border:none; padding:10px 15px; border-radius:4px; cursor:pointer; flex:1; font-weight:bold;">Denegar</button>
                        </form>
                    </div>
                `).join('')}
            </div>

            <br><br>
            <a href="/api/administracion" style="padding:12px 25px; background:#7f8c8d; color:white; text-decoration:none; border-radius:4px; font-weight:bold;">Volver al panel de administración</a>
        </body>
        </html>
    `);
};
