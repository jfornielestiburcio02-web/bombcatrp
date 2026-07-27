const { parse } = require('cookie');
const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

    // 2. Obtener las observaciones de Firestore y calcular medias por usuario
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
                    totalObservaciones: 0
                };
            }

            usuariosMap[usuarioId].totalObservaciones += 1;

            // Si la nota es mayor que 0, se cuenta para la media
            if (nota > 0) {
                usuariosMap[usuarioId].sumaNotas += nota;
                usuariosMap[usuarioId].totalValidas += 1;
            }
        });
    } catch (err) {
        console.error('Error leyendo Firestore:', err);
    }

    // Calcular la media final para cada usuario
    const resultadosUsuarios = Object.values(usuariosMap).map(user => {
        const media = user.totalValidas > 0 ? (user.sumaNotas / user.totalValidas).toFixed(2) : null;
        
        // Calcular avatar por defecto de Discord basado en el ID si no se dispone de hash
        let avatarUrl;
        try {
            const discordEpoch = 1420070400000n;
            const userIdBigInt = BigInt(user.usuarioId);
            const defaultAvatarIndex = Number((userIdBigInt >> 22n) % 6n);
            avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
        } catch (e) {
            avatarUrl = 'https://cdn.discordapp.com/embed/avatars/0.png';
        }

        return {
            ...user,
            media: media !== null ? media : 'Sin notas válidas',
            avatarUrl
        };
    });

    const nombreUsuario = cookies.username || 'Desconocido';

    // 3. Renderizar el panel HTML con las medias por usuario
    res.setHeader('Content-Type', 'text/html');
    res.send(`
        <html>
        <head>
            <title>Medias de Observaciones por Usuario</title>
        </head>
        <body style="font-family:sans-serif; text-align:center; padding:30px; background:#f4f4f9;">
            <h2>Panel de Medias - Administrador: ${nombreUsuario}</h2>
            <hr style="margin: 20px auto; width: 60%; border: 1px solid #ddd;">
            
            <h3>Media de Observaciones por Usuario</h3>
            
            ${resultadosUsuarios.length === 0 ? '<p style="color:#7f8c8d;">No hay registros de observaciones en este momento.</p>' : ''}

            <div style="display:grid; gap:15px; max-width:600px; margin:auto; text-align:left;">
                ${resultadosUsuarios.map(u => `
                    <div style="background:white; padding:20px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.1); display:flex; align-items:center; gap:15px;">
                        <img src="${u.avatarUrl}" alt="Avatar" style="width:60px; height:60px; border-radius:50%; object-fit:cover; background:#ddd;">
                        <div style="flex:1;">
                            <p style="margin:0 0 5px 0; font-size:18px;"><b>${u.usuarioNombre}</b></p>
                            <p style="margin:0 0 5px 0; color:#555; font-size:13px;">ID: <code>${u.usuarioId}</code></p>
                            <p style="margin:0 0 3px 0; color:#555; font-size:14px;">Total observaciones: <b>${u.totalObservaciones}</b> (Válidas para media: ${u.totalValidas})</p>
                            <p style="margin:0; font-size:16px; color:#2c3e50;">Media de observaciones: <b style="color: ${u.media === 'Sin notas válidas' ? '#e74c3c' : '#27ae60'};">${u.media}</b></p>
                        </div>
                    </div>
                `).join('')}
            </div>

            <br><br>
            <a href="/api/administracion" style="padding:12px 25px; background:#7f8c8d; color:white; text-decoration:none; border-radius:4px; font-weight:bold;">Volver al panel de administración</a>
        </body>
        </html>
    `);
};
