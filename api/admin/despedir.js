const { parse } = require('cookie');
const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc } = require('firebase/firestore');

// Configuración de Firebase
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

module.exports = async (req, res) => {
    const cookies = parse(req.headers.cookie || '');
    if (!cookies.uid) return res.redirect('/api/login');

    // 1. Validar ADMIN con el bot
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

    // 2. Manejar acciones POST (Dar de baja o dar de alta)
    if (req.method === 'POST') {
        const action = req.body.action; // 'dar_baja' o 'dar_alta'
        const targetUserId = req.body.targetUserId;
        const motivo = req.body.motivo || 'Sin motivo especificado';

        if (targetUserId && (action === 'dar_baja' || action === 'dar_alta')) {
            const botAction = action === 'dar_baja' ? 'baja' : 'alta';

            try {
                // Comunicar con el bot para cambiar roles en Discord
                await fetch('http://nc.lynxnodes.es:25700/cambiar-estado', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: targetUserId,
                        action: botAction,
                        executor: nombreUsuario,
                        motivo: motivo
                    })
                });

                // Si la acción es dar de baja, guardar el registro justificado en Firestore
                if (botAction === 'baja') {
                    const fechaRegistro = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
                    const docId = `despido-${targetUserId}-${Date.now()}`;
                    await setDoc(doc(db, 'despedidos', docId), {
                        fechaRegistro,
                        instructor: nombreUsuario,
                        motivo,
                        targetUserId
                    });
                }
            } catch (err) {
                console.error('Error procesando el cambio de estado en el bot:', err);
            }
        }

        // Redirección POST-redirect-GET
        res.statusCode = 303;
        res.setHeader('Location', '/api/admin/despedir');
        return res.end();
    }

    // 3. Obtener la lista de usuarios desde el bot (filtrados por los roles correspondientes)
    let usuarios = [];
    try {
        const listRes = await fetch('http://nc.lynxnodes.es:25700/listar-usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const listData = await listRes.json();
        if (listData.success) {
            usuarios = listData.usuarios || [];
        }
    } catch (err) {
        console.error('Error obteniendo usuarios del bot:', err);
    }

    // 4. Renderizar panel HTML interactivo
    res.setHeader('Content-Type', 'text/html');
    res.send(`
        <html>
        <head>
            <title>Gestión de Personal</title>
            <script>
                function bloquearBotones(form) {
                    const botones = form.querySelectorAll('button');
                    botones.forEach(b => {
                        b.disabled = true;
                        b.style.opacity = '0.5';
                        b.innerText = 'Procesando...';
                    });
                }
                function toggleAccion(userId) {
                    const select = document.getElementById('select-' + userId);
                    const formBaja = document.getElementById('form-baja-' + userId);
                    const formAlta = document.getElementById('form-alta-' + userId);
                    
                    if (select.value === 'baja') {
                        formBaja.style.display = 'block';
                        if(formAlta) formAlta.style.display = 'none';
                    } else if (select.value === 'alta') {
                        formBaja.style.display = 'none';
                        if(formAlta) formAlta.style.display = 'block';
                    } else {
                        formBaja.style.display = 'none';
                        if(formAlta) formAlta.style.display = 'none';
                    }
                }
            </script>
        </head>
        <body style="font-family:sans-serif; text-align:center; padding:30px; background:#f4f4f9;">
            <h2>Panel de Gestión de Personal - Admin: ${nombreUsuario}</h2>
            <hr style="margin: 20px auto; width: 60%; border: 1px solid #ddd;">
            
            <h3>Listado de Usuarios</h3>
            
            ${usuarios.length === 0 ? '<p style="color:#7f8c8d;">No hay usuarios con los roles requeridos.</p>' : ''}

            <div style="display:grid; gap:15px; max-width:650px; margin:auto; text-align:left;">
                ${usuarios.map(u => `
                    <div style="background:white; padding:20px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.1); display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <p style="margin:5px 0;"><b>Nombre:</b> ${u.username}</p>
                            <p style="margin:5px 0; color:#666; font-size:14px;"><b>ID:</b> ${u.id}</p>
                            <p style="margin:5px 0;"><b>Estado:</b> <span style="color: ${u.status === 'baja' ? '#c0392b' : '#27ae60'}; font-weight:bold;">${u.status === 'baja' ? 'De baja' : 'De alta'}</span></p>
                        </div>
                        <div>
                            <select id="select-${u.id}" onchange="toggleAccion('${u.id}')" style="padding:8px; border:1px solid #ccc; border-radius:4px; background:white; cursor:pointer;">
                                <option value="">Desplegar acción...</option>
                                ${u.status === 'baja' ? '<option value="alta">Dar de alta</option>' : '<option value="baja">Dar de baja</option>'}
                            </select>

                            <!-- Formulario Dar de Baja -->
                            <form id="form-baja-${u.id}" method="POST" onsubmit="bloquearBotones(this)" style="display:none; margin-top:10px;">
                                <input type="hidden" name="action" value="dar_baja">
                                <input type="hidden" name="targetUserId" value="${u.id}">
                                <input type="text" name="motivo" placeholder="Motivo de la baja..." required style="padding:6px; width:180px; border:1px solid #ccc; border-radius:4px; margin-bottom:5px; display:block;">
                                <button type="submit" style="background:#c0392b; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; width:100%;">Confirmar Baja</button>
                            </form>

                            <!-- Formulario Dar de Alta -->
                            <form id="form-alta-${u.id}" method="POST" onsubmit="bloquearBotones(this)" style="display:none; margin-top:10px;">
                                <input type="hidden" name="action" value="dar_alta">
                                <input type="hidden" name="targetUserId" value="${u.id}">
                                <button type="submit" style="background:#27ae60; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; width:100%;">Confirmar Alta</button>
                            </form>
                        </div>
                    </div>
                `).join('')}
            </div>

            <br><br>
            <a href="/api/administracion" style="padding:12px 25px; background:#2c3e50; color:white; text-decoration:none; border-radius:4px; font-weight:bold;">Volver al panel de administración</a>
        </body>
        </html>
    `);
};
