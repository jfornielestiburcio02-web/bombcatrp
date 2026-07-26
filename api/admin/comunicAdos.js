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

// Webhooks de Discord para comunicados
const WEBHOOKS = {
    sanitarios: 'https://discord.com/api/webhooks/1530973161993277592/5yd93avrBQiOcIIzqQ2xEnN9P4chUT0_0wdjDK_Wbsx0qfaIFGc_rGyLo22b8P8OA3ye',
    bomberos: 'https://discord.com/api/webhooks/1530973262295728179/8Lyep6iQO9HN0jPDddeH2cj2tHd2zJvLd-P1eHFOL7x3SMeq4813osivplB-p92E1y-3',
    opositores: 'https://discord.com/api/webhooks/1530973379128201407/IKYrGZuTDWVQgp76f4NhmVc8yzy7_pwt1F3RfUtnwqKCpnp51DXAttynyGJz56X8Es-p'
};

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

    // 2. Manejar acciones POST (Crear o Eliminar comunicado)
    if (req.method === 'POST') {
        const action = req.body.action;

        if (action === 'eliminar') {
            const docId = req.body.docId;
            if (docId) {
                try {
                    await deleteDoc(doc(db, 'comunicados', docId));
                } catch (err) {
                    console.error('Error eliminando comunicado:', err);
                }
            }
        } else if (action === 'crear') {
            const descripcion = req.body.descripcion;
            const comunicado = req.body.comunicado;
            const destino = req.body.destino;

            if (descripcion && comunicado && destino) {
                const fechaRegistro = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
                const docId = `comunicado-${Date.now()}`;

                // Guardar en Firestore
                try {
                    await setDoc(doc(db, 'comunicados', docId), {
                        fechaRegistro,
                        instructor: nombreUsuario,
                        descripcion,
                        comunicado,
                        destino
                    });
                } catch (dbErr) {
                    console.error('Error guardando comunicado en Firestore:', dbErr);
                }

                // Determinar webhooks según el destino seleccionado
                let urlsWebhooks = [];
                if (destino === 'todos') {
                    urlsWebhooks = [WEBHOOKS.sanitarios, WEBHOOKS.bomberos, WEBHOOKS.opositores];
                } else if (destino === 'opositores') {
                    urlsWebhooks = [WEBHOOKS.opositores];
                } else if (destino === 'bomberos') {
                    urlsWebhooks = [WEBHOOKS.bomberos];
                } else if (destino === 'sanitarios') {
                    urlsWebhooks = [WEBHOOKS.sanitarios];
                }

                // Mensaje con ping a @here
                const mensaje = `@here\n📢 **NUEVO COMUNICADO**\n\n📌 **Descripción:** ${descripcion}\n\n📝 **Comunicado:**\n${comunicado}\n\n👤 **Enviado por:** ${nombreUsuario}`;

                // Enviar webhooks en paralelo
                try {
                    await Promise.all(urlsWebhooks.map(url => 
                        fetch(url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ content: mensaje })
                        })
                    ));
                } catch (webhookErr) {
                    console.error('Error enviando webhooks de comunicados:', webhookErr);
                }
            }
        }

        // Redirección POST-redirect-GET
        res.statusCode = 303;
        res.setHeader('Location', '/api/admin/comunicados');
        return res.end();
    }

    // 3. Obtener todos los comunicados de Firestore (GET)
    let comunicados = [];
    try {
        const querySnapshot = await getDocs(collection(db, 'comunicados'));
        querySnapshot.forEach((document) => {
            comunicados.push({ id: document.id, ...document.data() });
        });
    } catch (err) {
        console.error('Error leyendo comunicados:', err);
    }

    // 4. Renderizar el panel HTML
    res.setHeader('Content-Type', 'text/html');
    res.send(`
        <html>
        <head>
            <title>Gestionar Comunicados</title>
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
            
            <h3>Enviar Nuevo Comunicado</h3>
            <div style="background:white; padding:20px; border-radius:8px; max-width:500px; margin:auto; box-shadow:0 2px 5px rgba(0,0,0,0.1); text-align:left;">
                <form method="POST" onsubmit="bloquearBotones(this)">
                    <input type="hidden" name="action" value="crear">
                    
                    <label style="display:block; margin-bottom:5px; font-weight:bold;">Descripción:</label>
                    <input type="text" name="descripcion" placeholder="Ej: Aviso importante sobre guardias" required style="width:100%; padding:8px; margin-bottom:12px; border:1px solid #ccc; border-radius:4px;">
                    
                    <label style="display:block; margin-bottom:5px; font-weight:bold;">Comunicado:</label>
                    <textarea name="comunicado" rows="4" placeholder="Escribe el contenido detallado del comunicado..." required style="width:100%; padding:8px; margin-bottom:12px; border:1px solid #ccc; border-radius:4px;"></textarea>
                    
                    <label style="display:block; margin-bottom:5px; font-weight:bold;">Canal de destino:</label>
                    <select name="destino" required style="width:100%; padding:8px; margin-bottom:15px; border:1px solid #ccc; border-radius:4px; background:white;">
                        <option value="todos">Todos los canales de anuncios</option>
                        <option value="opositores">Opositores</option>
                        <option value="bomberos">Anuncios bomberos</option>
                        <option value="sanitarios">Anuncios sanitarios</option>
                    </select>
                    
                    <button type="submit" style="width:100%; background:#2980b9; color:white; border:none; padding:12px; border-radius:4px; font-weight:bold; cursor:pointer;">Enviar Comunicado</button>
                </form>
            </div>

            <h3 style="margin-top:40px;">Comunicados Registrados en la BD</h3>
            
            ${comunicados.length === 0 ? '<p style="color:#7f8c8d;">No hay comunicados registrados.</p>' : ''}

            <div style="display:grid; gap:15px; max-width:600px; margin:auto; text-align:left;">
                ${comunicados.map(c => `
                    <div style="background:white; padding:20px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
                        <p style="margin:5px 0;"><b>Descripción:</b> ${c.descripcion || 'N/A'}</p>
                        <p style="margin:5px 0;"><b>Comunicado:</b> ${c.comunicado || 'N/A'}</p>
                        <p style="margin:5px 0;"><b>Destino:</b> ${c.destino} | <b>Fecha:</b> ${c.fechaRegistro}</p>
                        <p style="margin:5px 0;"><b>Enviado por:</b> ${c.instructor}</p>
                        
                        <form method="POST" onsubmit="bloquearBotones(this)" style="margin-top:15px;">
                            <input type="hidden" name="action" value="eliminar">
                            <input type="hidden" name="docId" value="${c.id}">
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
