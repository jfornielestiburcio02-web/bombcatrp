const { parse } = require('cookie');
const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, query, where } = require('firebase/firestore');

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

// Rol de Discord a filtrar
const ROL_ID_OBJETIVO = '1332417833979740302';

// Funciones auxiliares para sumar tiempos (formato "HH:MM")
function convertirAMinutos(tiempoStr) {
    if (!tiempoStr || !tiempoStr.includes(':')) return 0;
    const [h, m] = tiempoStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}

function formatearMinutos(totalMinutos) {
    const h = Math.floor(totalMinutos / 60);
    const m = totalMinutos % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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

    // Obtener parámetros de la URL (Mes seleccionado, por defecto el actual)
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const mesSeleccionado = urlObj.searchParams.get('mes') || new Date().toISOString().slice(0, 7); // Formato YYYY-MM
    const [anioStr, mesStr] = mesSeleccionado.split('-');
    const anio = parseInt(anioStr, 10);
    const mes = parseInt(mesStr, 10);

    // 2. Manejar acciones POST (Crear o Eliminar justificación 'JUST') de forma asíncrona sin redirección
    if (req.method === 'POST') {
        const action = req.body?.action;

        if (action === 'toggleJust') {
            const usuarioId = req.body.usuarioId;
            const fechaDia = req.body.fecha; // YYYY-MM-DD
            const estadoActual = req.body.estadoActual === 'true' || req.body.estadoActual === true; // si ya estaba justificado o no

            if (usuarioId && fechaDia) {
                try {
                    // Buscar si ya existe un documento para este usuario y fecha en 'diasJust'
                    const q = query(collection(db, 'diasJust'), where('usuarioId', '==', usuarioId), where('fecha', '==', fechaDia));
                    const snapshot = await getDocs(q);

                    if (estadoActual) {
                        // Si ya estaba marcado, lo eliminamos
                        const deletePromises = [];
                        snapshot.forEach((documento) => {
                            deletePromises.push(deleteDoc(doc(db, 'diasJust', documento.id)));
                        });
                        await Promise.all(deletePromises);
                    } else {
                        // Si no estaba marcado, lo creamos
                        const horaActual = new Date().toISOString().replace(/:/g, '-');
                        const docId = `${usuarioId}-${fechaDia}-${horaActual}`;
                        await setDoc(doc(db, 'diasJust', docId), {
                            usuarioId,
                            fecha: fechaDia,
                            registradoPor: nombreUsuario,
                            timestamp: Date.now()
                        });
                    }

                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ success: true }));
                } catch (err) {
                    console.error('Error actualizando justificación:', err);
                    res.setHeader('Content-Type', 'application/json');
                    res.statusCode = 500;
                    return res.end(JSON.stringify({ success: false, error: err.message }));
                }
            }
        }

        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ success: false, message: 'Acción no válida' }));
    }

    // 3. Obtener usuarios con el rol específico mediante el bot
    let usuariosConRol = [];
    try {
        const rolRes = await fetch('http://nc.lynxnodes.es:25700/usuarios-rol', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roleId: ROL_ID_OBJETIVO })
        });
        const rolData = await rolRes.json();
        usuariosConRol = rolData.usuarios || [];
    } catch (err) {
        console.error('Error obteniendo usuarios por rol:', err);
    }

    // 4. Obtener servicios y justificaciones de Firestore
    let serviciosMap = {}; // Clave: "userId_YYYY-MM-DD", Valor: { count, totalMinutos }
    let justificacionesMap = {}; // Clave: "userId_YYYY-MM-DD", Valor: true

    try {
        const serviciosSnapshot = await getDocs(collection(db, 'servicios'));
        serviciosSnapshot.forEach((documento) => {
            const data = documento.data();
            const uid = data.userId;
            const fechaIni = data.fechaInicio; // Formato YYYY-MM-DD esperado
            if (uid && fechaIni && fechaIni.startsWith(mesSeleccionado)) {
                const key = `${uid}_${fechaIni}`;
                if (!serviciosMap[key]) {
                    serviciosMap[key] = { count: 0, totalMinutos: 0 };
                }
                serviciosMap[key].count += 1;
                serviciosMap[key].totalMinutos += convertirAMinutos(data.tiempoTrabajo);
            }
        });

        const justSnapshot = await getDocs(collection(db, 'diasJust'));
        justSnapshot.forEach((documento) => {
            const data = documento.data();
            if (data.usuarioId && data.fecha && data.fecha.startsWith(mesSeleccionado)) {
                justificacionesMap[`${data.usuarioId}_${data.fecha}`] = true;
            }
        });
    } catch (err) {
        console.error('Error leyendo colecciones de Firestore:', err);
    }

    // Calcular días del mes seleccionado
    const totalDiasMes = new Date(anio, mes, 0).getDate();
    const diasDelMes = [];
    for (let d = 1; d <= totalDiasMes; d++) {
        const diaStr = String(d).padStart(2, '0');
        diasDelMes.push(`${mesSeleccionado}-${diaStr}`);
    }

    // 5. Renderizar el panel HTML con la tabla de control
    res.setHeader('Content-Type', 'text/html');
    res.send(`
        <html>
        <head>
            <title>Control de Asistencia y Justificaciones</title>
            <script>
                async function enviarJust(event, form, usuarioId, fecha) {
                    event.preventDefault();
                    const btn = form.querySelector('button');
                    const inputEstado = form.querySelector('input[name="estadoActual"]');
                    const estadoActual = inputEstado.value === 'true';
                    
                    btn.disabled = true;
                    btn.style.opacity = '0.5';

                    try {
                        const response = await fetch(window.location.href, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                action: 'toggleJust',
                                usuarioId: usuarioId,
                                fecha: fecha,
                                estadoActual: estadoActual
                            })
                        });

                        const data = await response.json();

                        if (response.ok && data.success) {
                            // Alternar estado visual y valor del input sin recargar
                            const nuevoEstado = !estadoActual;
                            inputEstado.value = nuevoEstado;
                            
                            if (nuevoEstado) {
                                btn.className = 'btn-just btn-checked';
                            } else {
                                btn.className = 'btn-just btn-unchecked';
                            }
                        } else {
                            alert('Hubo un error al actualizar la justificación.');
                        }
                    } catch (err) {
                        console.error('Error:', err);
                    } finally {
                        btn.disabled = false;
                        btn.style.opacity = '1';
                    }
                }

                function cambiarMes(input) {
                    window.location.href = '?mes=' + input.value;
                }
            </script>
            <style>
                body { font-family: sans-serif; text-align: center; padding: 20px; background: #f4f4f9; }
                .table-container { overflow-x: auto; max-width: 100%; background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); margin-top: 20px; }
                table { border-collapse: collapse; width: 100%; font-size: 13px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: center; vertical-align: middle; }
                th { background-color: #2c3e50; color: white; position: sticky; left: 0; z-index: 2; }
                .user-col { position: sticky; left: 0; background: #fff; z-index: 1; font-weight: bold; text-align: left; min-width: 150px; }
                th.user-col { z-index: 3; }
                .btn-just { padding: 5px 10px; font-size: 11px; font-weight: bold; border: none; border-radius: 4px; cursor: pointer; transition: opacity 0.2s; }
                .btn-checked { background: #27ae60; color: white; }
                .btn-unchecked { background: #bdc3c7; color: #333; }
                .servicio-info { font-size: 11px; color: #2980b9; margin-top: 4px; display: block; }
            </style>
        </head>
        <body>
            <h2>Panel de Administración - Control por Rol</h2>
            <p>Administrador activo: <b>${nombreUsuario}</b></p>
            <hr style="margin: 20px auto; width: 60%; border: 1px solid #ddd;">

            <div>
                <label for="mesPicker" style="font-weight: bold;">Seleccionar Mes:</label>
                <input type="month" id="mesPicker" value="${mesSeleccionado}" onchange="cambiarMes(this)" style="padding: 6px; border-radius: 4px; border: 1px solid #ccc; margin-left: 10px;">
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th class="user-col">Usuario / ID</th>
                            ${diasDelMes.map(dia => `<th>${dia.split('-')[2]}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${usuariosConRol.length === 0 ? `<tr><td colspan="${totalDiasMes + 1}" style="padding: 20px; color: #7f8c8d;">No se encontraron usuarios con el rol especificado.</td></tr>` : ''}
                        ${usuariosConRol.map(user => `
                            <tr>
                                <td class="user-col">
                                    ${user.username || 'Desconocido'}<br>
                                    <code style="font-size:10px; color:#555;">${user.id}</code>
                                </td>
                                ${diasDelMes.map(fechaDia => {
                                    const key = `${user.id}_${fechaDia}`;
                                    const estaJustificado = !!justificacionesMap[key];
                                    const servicioData = serviciosMap[key];

                                    return `
                                        <td>
                                            <form onsubmit="enviarJust(event, this, '${user.id}', '${fechaDia}')" style="margin:0;">
                                                <input type="hidden" name="estadoActual" value="${estaJustificado}">
                                                <button type="submit" class="btn-just ${estaJustificado ? 'btn-checked' : 'btn-unchecked'}">
                                                    JUST
                                                </button>
                                            </form>
                                            ${servicioData ? `
                                                <span class="servicio-info" title="Servicios registrados en este día">
                                                    <b>${servicioData.count}</b> serv.<br>
                                                    <b>${formatearMinutos(servicioData.totalMinutos)}</b> hrs
                                                </span>
                                            ` : ''}
                                        </td>
                                    `;
                                }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <br><br>
            <a href="/api/administracion" style="padding:12px 25px; background:#2c3e50; color:white; text-decoration:none; border-radius:4px; font-weight:bold;">Volver al panel de administración</a>
        </body>
        </html>
    `);
};
