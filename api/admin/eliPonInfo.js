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

    // 2. Manejar la acción POST para eliminar el informe de la BD
    if (req.method === 'POST') {
        const action = req.body.action;
        const docId = req.body.docId;

        if (action === 'eliminar' && docId) {
            try {
                await deleteDoc(doc(db, 'informes', docId));
            } catch (err) {
                console.error('Error eliminando informe de Firestore:', err);
            }
        }

        // Redirección segura POST-redirect-GET para evitar reenvíos
        res.statusCode = 303;
        res.setHeader('Location', '/api/admin/eliPonInfo');
        return res.end();
    }

    // 3. Obtener todos los informes de Firestore (GET)
    let informes = [];
    try {
        const querySnapshot = await getDocs(collection(db, 'informes'));
        querySnapshot.forEach((document) => {
            informes.push({ id: document.id, ...document.data() });
        });
    } catch (err) {
        console.error('Error leyendo informes:', err);
    }

    // 4. Renderizar el panel HTML
    res.setHeader('Content-Type', 'text/html');
    res.send(`
        <html>
        <head>
            <title>Visualizar y Eliminar Informes</title>
            <script>
                function bloquearBotones(form) {
                    const botones = form.querySelectorAll('button');
                    botones.forEach(b => {
                        b.disabled = true;
                        b.style.opacity = '0.5';
                        b.innerText = 'Eliminando...';
                    });
                }
            </script>
        </head>
        <body style="font-family:sans-serif; text-align:center; padding:30px; background:#f4f4f9;">
            <h2>Acceso Activo de administración como: ${nombreUsuario}</h2>
            <hr style="margin: 20px auto; width: 60%; border: 1px solid #ddd;">
            
            <h3>Informes Registrados</h3>
            
            ${informes.length === 0 ? '<p style="color:#7f8c8d;">No hay informes registrados en la base de datos.</p>' : ''}

            <div style="display:grid; gap:15px; max-width:650px; margin:auto; text-align:left;">
                ${informes.map(inf => `
                    <div style="background:white; padding:20px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
                        <p style="margin:5px 0;"><b>Tipo:</b> ${inf.tipo || 'N/A'}</p>
                        <p style="margin:5px 0;"><b>Fecha:</b> ${inf.fecha || 'N/A'} | <b>Hora Suceso:</b> ${inf.horaSuceso || 'N/A'}</p>
                        <p style="margin:5px 0;"><b>Participantes:</b> ${inf.participantes || 'N/A'}</p>
                        <p style="margin:5px 0;"><b>Detalles:</b> ${inf.detalles || 'N/A'}</p>
                        <p style="margin:5px 0;"><b>Notas:</b> ${inf.notas || 'N/A'}</p>
                        <p style="margin:5px 0; font-size: 12px; color: #555;"><b>ID Usuario:</b> <code>${inf.usuarioId || 'N/A'}</code></p>
                        
                        <form method="POST" onsubmit="bloquearBotones(this)" style="margin-top:15px;">
                            <input type="hidden" name="action" value="eliminar">
                            <input type="hidden" name="docId" value="${inf.id}">
                            <button type="submit" style="background:#c0392b; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; font-weight:bold;">Eliminar de la BD</button>
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
