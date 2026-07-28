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

    // 2. Manejar acciones POST (Despedir usuario o eliminar registro de la BD)
    if (req.method === 'POST') {
        const action = req.body.action;

        if (action === 'eliminar') {
            const docId = req.body.docId;
            if (docId) {
                try {
                    await deleteDoc(doc(db, 'despedidos', docId));
                } catch (err) {
                    console.error('Error eliminando registro de despido:', err);
                }
            }
        } else if (action === 'despedir') {
            const descripcion = req.body.descripcion;
            const detalle = req.body.detalle;
            const targetUserId = req.body.targetUserId;

            if (descripcion && detalle && targetUserId) {
                const fechaRegistro = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
                const docId = `despido-${Date.now()}`;
                
                let resultadoBot = "Se han quitado los roles que se han podido retirar de este usuario";

                // Comunicar con el bot para retirar los roles en Discord
                try {
                    const botDespedirRes = await fetch('http://nc.lynxnodes.es:25700/despedir', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: targetUserId,
                            executor: nombreUsuario,
                            rolesARetirar: [
                                '1332417833979740302',
                                '1332417740484509737',
                                '1483242674667520061'
                            ]
                        })
                    });
                    const botDespedirData = await botDespedirRes.json();
                    if (botDespedirData.message) {
                        resultadoBot = botDespedirData.message;
                    }
                } catch (botErr) {
                    console.error('Error comunicándose con el bot para despedir:', botErr);
                    resultadoBot = "Error de conexión con el bot al intentar retirar los roles.";
                }

                // Guardar registro en Firestore
                try {
                    await setDoc(doc(db, 'despedidos', docId), {
                        fechaRegistro,
                        instructor: nombreUsuario, // Usuario interno
                        descripcion,
                        detalle,
                        targetUserId,
                        resultadoBot
                    });
                } catch (dbErr) {
                    console.error('Error guardando despido en Firestore:', dbErr);
                }
            }
        }

        // Redirección POST-redirect-GET (Ajusta la ruta si tu archivo se llama diferente)
        res.statusCode = 303;
        res.setHeader('Location', '/api/admin/despedir');
        return res.end();
    }

    // 3. Obtener todos los registros de despidos de Firestore (GET)
    let despedidos = [];
    try {
        const querySnapshot = await getDocs(collection(db, 'despedidos'));
        querySnapshot.forEach((document) => {
            despedidos.push({ id: document.id, ...document.data() });
        });
    } catch (err) {
        console.error('Error leyendo despidos:', err);
    }

    // 4. Renderizar el panel HTML
    res.setHeader('Content-Type', 'text/html');
    res.send(`
        <html>
        <head>
            <title>Despedir Usuario</title>
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
            <h2>Panel de Despidos - Administrador: ${nombreUsuario}</h2>
            <hr style="margin: 20px auto; width: 60%; border: 1px solid #ddd;">
            
            <h3>Despedir Usuario</h3>
            <div style="background:white; padding:20px; border-radius:8px; max-width:500px; margin:auto; box-shadow:0 2px 5px rgba(0,0,0,0.1); text-align:left;">
                <form method="POST" onsubmit="bloquearBotones(this)">
                    <input type="hidden" name="action" value="despedir">
                    
                    <label style="display:block; margin-bottom:5px; font-weight:bold;">Descripción:</label>
                    <input type="text" name="descripcion" placeholder="Ej: Baja disciplinaria" required style="width:100%; padding:8px; margin-bottom:12px; border:1px solid #ccc; border-radius:4px;">
                    
                    <label style="display:block; margin-bottom:5px; font-weight:bold;">Detalle:</label>
                    <textarea name="detalle" rows="4" placeholder="Escribe el motivo detallado del despido..." required style="width:100%; padding:8px; margin-bottom:12px; border:1px solid #ccc; border-radius:4px;"></textarea>
                    
                    <label style="display:block; margin-bottom:5px; font-weight:bold;">Usuario a despedir (ID de Discord):</label>
                    <input type="text" name="targetUserId" placeholder="Ej: 987654321098765432" required style="width:100%; padding:8px; margin-bottom:15px; border:1px solid #ccc; border-radius:4px;">
                    
                    <button type="submit" style="width:100%; background:#c0392b; color:white; border:none; padding:12px; border-radius:4px; font-weight:bold; cursor:pointer;">Ejecutar Despido</button>
                </form>
            </div>

            <h3 style="margin-top:40px;">Registros de Despidos en la BD</h3>
            
            ${despedidos.length === 0 ? '<p style="color:#7f8c8d;">No hay despidos registrados.</p>' : ''}

            <div style="display:grid; gap:15px; max-width:600px; margin:auto; text-align:left;">
                ${despedidos.map(d => `
                    <div style="background:white; padding:20px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
                        <p style="margin:5px 0;"><b>Descripción:</b> ${d.descripcion || 'N/A'}</p>
                        <p style="margin:5px 0;"><b>Detalle:</b> ${d.detalle || 'N/A'}</p>
                        <p style="margin:5px 0;"><b>ID Usuario:</b> ${d.targetUserId}</p>
                        <p style="margin:5px 0;"><b>Resultado Bot:</b> <span style="color: #27ae60;">${d.resultadoBot || 'N/A'}</span></p>
                        <p style="margin:5px 0;"><b>Fecha:</b> ${d.fechaRegistro} | <b>Usuario Interno:</b> ${d.instructor}</p>
                        
                        <form method="POST" onsubmit="bloquearBotones(this)" style="margin-top:15px;">
                            <input type="hidden" name="action" value="eliminar">
                            <input type="hidden" name="docId" value="${d.id}">
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
