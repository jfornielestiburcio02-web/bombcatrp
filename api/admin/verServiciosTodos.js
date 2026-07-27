const { parse } = require('cookie');
const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, deleteDoc, updateDoc } = require('firebase/firestore');

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

    // 2. Manejar acciones POST (Eliminar o Modificar servicio)
    if (req.method === 'POST') {
        const action = req.body.action;

        if (action === 'eliminar_servicio') {
            const servicioId = req.body.servicioId;
            if (servicioId) {
                try {
                    await deleteDoc(doc(db, 'servicios', servicioId));
                } catch (dbErr) {
                    console.error('Error eliminando servicio:', dbErr);
                }
            }
        } else if (action === 'modificar_servicio') {
            const servicioId = req.body.servicioId;
            const fechaInicio = req.body.fechaInicio;
            const horaInicio = req.body.horaInicio;
            const fechaFin = req.body.fechaFin;
            const horaFin = req.body.horaFin;
            const estado = req.body.estado;

            if (servicioId) {
                let updateData = {
                    fechaInicio,
                    horaInicio
                };

                if (estado === 'cerrado' && fechaFin && horaFin) {
                    updateData.fechaFin = fechaFin;
                    updateData.horaFin = horaFin;

                    // Recalcular tiempo trabajado
                    try {
                        const inicioMs = new Date(`${fechaInicio}T${horaInicio}`).getTime();
                        const finMs = new Date(`${fechaFin}T${horaFin}`).getTime();
                        const diffMs = finMs - inicioMs;

                        if (diffMs > 0) {
                            const totalMinutos = Math.floor(diffMs / 60000);
                            const horas = Math.floor(totalMinutos / 60);
                            const minutos = totalMinutos % 60;
                            updateData.tiempoTrabajado = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
                        }
                    } catch (e) {
                        console.error('Error recalculando tiempo trabajado:', e);
                    }
                }

                try {
                    await updateDoc(doc(db, 'servicios', servicioId), updateData);
                } catch (dbErr) {
                    console.error('Error modificando servicio:', dbErr);
                }
            }
        }

        res.statusCode = 303;
        res.setHeader('Location', req.url);
        return res.end();
    }

    // 3. Obtener los servicios de Firestore y agrupar por usuario
    let usuariosMap = {};
    try {
        const querySnapshot = await getDocs(collection(db, 'servicios'));
        querySnapshot.forEach((document) => {
            const data = document.data();
            const userId = data.userId;
            const usuarioNombre = data.usuarioNombre || userId || 'Desconocido';

            if (!userId) return;

            if (!usuariosMap[userId]) {
                usuariosMap[userId] = {
                    userId: userId,
                    usuarioNombre: usuarioNombre,
                    servicios: []
                };
            }

            usuariosMap[userId].servicios.push({
                id: document.id,
                estado: data.estado || 'abierto',
                fechaInicio: data.fechaInicio || '',
                horaInicio: data.horaInicio || '',
                fechaFin: data.fechaFin || '',
                horaFin: data.horaFin || '',
                tiempoTrabajado: data.tiempoTrabajado || '00:00',
                timestampInicio: data.timestampInicio || 0
            });
        });
    } catch (err) {
        console.error('Error leyendo Firestore:', err);
    }

    // Calcular avatar por usuario
    const resultadosUsuarios = Object.values(usuariosMap).map(user => {
        let avatarUrl;
        try {
            const userIdBigInt = BigInt(user.userId);
            const defaultAvatarIndex = Number((userIdBigInt >> 22n) % 6n);
            avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
        } catch (e) {
            avatarUrl = 'https://cdn.discordapp.com/embed/avatars/0.png';
        }

        return {
            ...user,
            avatarUrl,
            totalServicios: user.servicios.length
        };
    });

    const nombreUsuario = cookies.username || 'Desconocido';

    // 4. Renderizar panel HTML
    res.setHeader('Content-Type', 'text/html');
    res.send(`
        <html>
        <head>
            <title>Gestión de Todos los Servicios</title>
            <script>
                function toggleMostrarMas(userId) {
                    const hiddenItems = document.querySelectorAll('.extra-servicio-' + userId);
                    const btn = document.getElementById('btn-mas-' + userId);
                    
                    let isOpen = btn.getAttribute('data-open') === 'true';
                    if (isOpen) {
                        hiddenItems.forEach(el => el.style.display = 'none');
                        btn.innerText = 'Mostrar Más (' + hiddenItems.length + ' más)';
                        btn.setAttribute('data-open', 'false');
                    } else {
                        hiddenItems.forEach(el => el.style.display = 'block');
                        btn.innerText = 'Mostrar Menos';
                        btn.setAttribute('data-open', 'true');
                    }
                }
            </script>
        </head>
        <body style="font-family:sans-serif; text-align:center; padding:30px; background:#f4f4f9;">
            <h2>Panel de Servicios - Administrador: ${nombreUsuario}</h2>
            <hr style="margin: 20px auto; width: 60%; border: 1px solid #ddd;">
            
            <h3>Servicios Registrados por Usuario</h3>
            
            ${resultadosUsuarios.length === 0 ? '<p style="color:#7f8c8d;">No hay servicios registrados en este momento.</p>' : ''}

            <div style="display:grid; gap:15px; max-width:750px; margin:auto; text-align:left;">
                ${resultadosUsuarios.map(u => `
                    <div style="background:white; padding:20px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
                        <div style="display:flex; align-items:center; gap:15px; margin-bottom: 15px;">
                            <img src="${u.avatarUrl}" alt="Avatar" style="width:60px; height:60px; border-radius:50%; object-fit:cover; background:#ddd;">
                            <div style="flex:1;">
                                <p style="margin:0 0 5px 0; font-size:18px;"><b>${u.usuarioNombre}</b></p>
                                <p style="margin:0 0 5px 0; color:#555; font-size:13px;">ID: <code>${u.userId}</code></p>
                                <p style="margin:0; color:#555; font-size:14px;">Total servicios: <b>${u.totalServicios}</b></p>
                            </div>
                        </div>

                        <div style="display:grid; gap:10px;">
                            ${u.servicios.map((s, index) => {
                                const isHidden = index >= 5;
                                return `
                                    <div class="${isHidden ? 'extra-servicio-' + u.userId : ''}" style="background: #f9f9f9; padding: 12px; border-radius: 6px; border-left: 4px solid ${s.estado === 'abierto' ? '#3498db' : '#27ae60'}; display: ${isHidden ? 'none' : 'block'};">
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                            <div>
                                                <span style="font-weight: bold; font-size: 13px; color: ${s.estado === 'abierto' ? '#2980b9' : '#27ae60'};">
                                                    Estado: ${s.estado === 'abierto' ? 'En progreso...' : 'Cerrado (Tiempo trabajado: ' + s.tiempoTrabajado + ' hrs)'}
                                                </span>
                                            </div>
                                            <form method="POST" onsubmit="return confirm('¿Estás seguro de eliminar este servicio?');" style="margin:0;">
                                                <input type="hidden" name="action" value="eliminar_servicio">
                                                <input type="hidden" name="servicioId" value="${s.id}">
                                                <button type="submit" style="background:#c0392b; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:11px; font-weight:bold;">Eliminar</button>
                                            </form>
                                        </div>

                                        <form method="POST" style="display: grid; gap: 8px; background: #fff; padding: 10px; border-radius: 4px; border: 1px solid #e1e1e1;">
                                            <input type="hidden" name="action" value="modificar_servicio">
                                            <input type="hidden" name="servicioId" value="${s.id}">
                                            <input type="hidden" name="estado" value="${s.estado}">

                                            <div style="display: flex; gap: 10px; font-size: 12px;">
                                                <div style="flex: 1;">
                                                    <label style="font-weight: bold; display: block; margin-bottom: 2px;">Fecha Inicio:</label>
                                                    <input type="date" name="fechaInicio" value="${s.fechaInicio}" style="width: 100%; padding: 4px; box-sizing: border-box;" required>
                                                </div>
                                                <div style="flex: 1;">
                                                    <label style="font-weight: bold; display: block; margin-bottom: 2px;">Hora Inicio:</label>
                                                    <input type="text" name="horaInicio" value="${s.horaInicio}" style="width: 100%; padding: 4px; box-sizing: border-box;" required>
                                                </div>
                                            </div>

                                            ${s.estado === 'cerrado' ? `
                                                <div style="display: flex; gap: 10px; font-size: 12px;">
                                                    <div style="flex: 1;">
                                                        <label style="font-weight: bold; display: block; margin-bottom: 2px;">Fecha Fin:</label>
                                                        <input type="date" name="fechaFin" value="${s.fechaFin}" style="width: 100%; padding: 4px; box-sizing: border-box;" required>
                                                    </div>
                                                    <div style="flex: 1;">
                                                        <label style="font-weight: bold; display: block; margin-bottom: 2px;">Hora Fin:</label>
                                                        <input type="text" name="horaFin" value="${s.horaFin}" style="width: 100%; padding: 4px; box-sizing: border-box;" required>
                                                    </div>
                                                </div>
                                            ` : ''}

                                            <button type="submit" style="background:#2980b9; color:white; border:none; padding:6px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:12px; margin-top:4px;">Guardar Cambios y Recalcular</button>
                                        </form>
                                    </div>
                                `;
                            }).join('')}
                        </div>

                        ${u.servicios.length > 5 ? `
                            <button id="btn-mas-${u.userId}" onclick="toggleMostrarMas('${u.userId}')" data-open="false" style="margin-top: 10px; background: #7f8c8d; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; width: 100%;">Mostrar Más (${u.servicios.length - 5} más)</button>
                        ` : ''}
                    </div>
                `).join('')}
            </div>

            <br><br>
            <a href="/api/administracion" style="padding:12px 25px; background:#7f8c8d; color:white; text-decoration:none; border-radius:4px; font-weight:bold;">Volver al panel de administración</a>
        </body>
        </html>
    `);
};
