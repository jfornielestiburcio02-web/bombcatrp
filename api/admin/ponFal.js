const { parse } = require('cookie');
const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } = require('firebase/firestore');

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

// Tu Webhook de Discord para sanciones
const WEBHOOK_URL = 'https://discord.com/api/webhooks/1530957005613826239/HC6pmwV47D3Bfk-iyeOyT6HiaSLncb_DG6bFjFuDiS8qHQ9VSLxm_iykkX8BgXaiH7an';

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

    // 2. Manejar acciones POST (Crear o Eliminar sanción)
    if (req.method === 'POST') {
        let body = '';
        for await (const chunk of req) {
            body += chunk;
        }
        const params = new URLSearchParams(body);
        const action = params.get('action');

        if (action === 'eliminar') {
            const docId = params.get('docId');
            if (docId) {
                try {
                    await deleteDoc(doc(db, 'sanciones', docId));
                } catch (err) {
                    console.error('Error eliminando sanción:', err);
                }
            }
        } else if (action === 'crear') {
            const usuarioId = params.get('usuarioId');
            const usuarioNombre = params.get('usuarioNombre');
            const tipo = params.get('tipo');
            const motivo = params.get('motivo');

            if (usuarioId && motivo && tipo) {
                const fechaRegistro = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
                const docId = `${usuarioId}-${Date.now()}`;

                // Guardar en Firestore
                try {
                    await setDoc(doc(db, 'sanciones', docId), {
                        fechaRegistro,
                        instructor: nombreUsuario,
                        motivo,
                        tipo,
                        usuarioId,
                        usuarioNombre: usuarioNombre || 'Usuario'
                    });
                } catch (dbErr) {
                    console.error('Error guardando sanción en Firestore:', dbErr);
                }

                // Enviar Webhook haciendo ping al usuario
                try {
                    const mensaje = `<@${usuarioId}>, has recibido una sanción de tipo **${tipo}**.\n**Motivo:** ${motivo}\n**Instructor:** ${nombreUsuario}`;
                    await fetch(WEBHOOK_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ content: mensaje })
                    });
                } catch (webhookErr) {
                    console.error('Error enviando webhook de sanción:', webhookErr);
                }
            }
        }

        // Redirección segura POST-redirect-GET para evitar reenvíos
        res.statusCode = 303;
        res.setHeader('Location', '/api/admin/sancionar');
        return res.end();
    }

    // 3. Obtener todas las sanciones de Firestore (GET)
    let sanciones = [];
    try {
        const querySnapshot = await getDocs(collection(db, 'sanciones'));
        querySnapshot.forEach((document) => {
            sanciones.push({ id: document.id, ...document.data() });
        });
    } catch (err) {
        console.error('Error leyendo sanciones:', err);
    }

    // 4. Renderizar el panel HTML
    res.setHeader('Content-Type', 'text/html');
    res.send(`
        <html>
        <head>
            <title>Gestionar Sanciones</title>
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
        </head>
        <body style="font-family:sans-serif; text-align:center; padding:30px; background:#f4f4f9;">
            <h2>Acceso Activo de administración como: ${nombreUsuario}</h2>
            <hr style="margin: 20px auto; width: 60%; border: 1px solid #ddd;">
            
            <h3>Crear Nueva Sanción</h3>
            <div style="background:white; padding:20px; border-radius:8px; max-width:500px; margin:auto; box-shadow:0 2px 5px rgba(0,0,0,0.1); text-align:left;">
                <form method="POST" onsubmit="bloquearBotones(this)">
                    <input type="hidden" name="action" value="crear">
                    
                    <label style="display:block; margin-bottom:5px; font-weight:bold;">ID de Discord del usuario:</label>
                    <input type="text" name="usuarioId" placeholder="Ej: 1146942069433184317" required style="width:100%; padding:8px; margin-bottom:12px; border:1px solid #ccc; border-radius:4px;">
                    
                    <label style="display:block; margin-bottom:5px; font-weight:bold;">Nombre de usuario en Discord (OFICIAL, NO APODO):</label>
                    <input type="text" name="usuarioNombre" placeholder="Ej: _senorx_" required style="width:100%; padding:8px; margin-bottom:12px; border:1px solid #ccc; border-radius:4px;">
                    
                    <label style="display:block; margin-bottom:5px; font-weight:bold;">Tipo de sanción:</label>
                    <input type="text" name="tipo" placeholder="Ej: Moderada / Grave" required style="width:100%; padding:8px; margin-bottom:12px; border:1px solid #ccc; border-radius:4px;">
                    
                    <label style="display:block; margin-bottom:5px; font-weight:bold;">Motivo:</label>
                    <textarea name="motivo" rows="3" placeholder="Escribe el motivo detallado..." required style="width:100%; padding:8px; margin-bottom:15px; border:1px solid #ccc; border-radius:4px;"></textarea>
                    
                    <button type="submit" style="width:100%; background:#c0392b; color:white; border:none; padding:12px; border-radius:4px; font-weight:bold; cursor:pointer;">Aplicar Sanción y Notificar</button>
                </form>
            </div>

            <h3 style="margin-top:40px;">Sanciones Registradas</h3>
            
            ${sanciones.length === 0 ? '<p style="color:#7f8c8d;">No hay sanciones registradas.</p>' : ''}

            <div style="display:grid; gap:15px; max-width:600px; margin:auto; text-align:left;">
                ${sanciones.map(s => `
                    <div style="background:white; padding:20px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
                        <p style="margin:5px 0;"><b>Usuario:</b> ${s.usuarioNombre || 'Desconocido'} (<code>${s.usuarioId}</code>)</p>
                        <p style="margin:5px 0;"><b>Tipo:</b> ${s.tipo} | <b>Fecha:</b> ${s.fechaRegistro}</p>
                        <p style="margin:5px 0;"><b>Instructor:</b> ${s.instructor}</p>
                        <p style="margin:5px 0;"><b>Motivo:</b> ${s.motivo}</p>
                        
                        <form method="POST" onsubmit="bloquearBotones(this)" style="margin-top:15px;">
                            <input type="hidden" name="action" value="eliminar">
                            <input type="hidden" name="docId" value="${s.id}">
                            <button type="submit" style="background:#7f8c8d; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; font-weight:bold;">Eliminar de la BD</button>
                        </form>
                    </div>
                `).join('')}
            </div>

            <br><br>
            <a href="/api/administracion" style="padding:12px 25px; background:#2c3e50; color:white; text-decoration:none; border-radius:4px; font-weight:bold;">Volver al panel de administración</a>
        </body>
        </html>
    `);
};
