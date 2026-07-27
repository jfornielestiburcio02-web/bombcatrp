const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const { parse } = require('cookie');

const firebaseConfig = {
    apiKey: "AIzaSyAcBmdyP0rJE7x0FQxIp4FEnKuTsO5wH14",
    authDomain: "bombctrp131344.firebaseapp.com",
    projectId: "bombctrp131344",
    storageBucket: "bombctrp131344.firebasestorage.app",
    messagingSenderId: "286186204549",
    appId: "1:286186204549:web:cc707dcc23cc664f1c28ec"
};

const db = getFirestore(initializeApp(firebaseConfig));

module.exports = async (req, res) => {
    const cookies = parse(req.headers.cookie || '');
    if (!cookies.username) return res.redirect('/api/login');

    const loggedUser = cookies.username;

    let misServicios = [];
    let rankingMap = {};

    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    try {
        const querySnapshot = await getDocs(collection(db, 'servicios'));
        querySnapshot.forEach(doc => {
            const data = doc.data();
            const uName = data.usuarioName || data.usuarioNombre || 'Desconocido';

            // Filtrar servicios del usuario logueado
            if (uName === loggedUser) {
                misServicios.push({
                    id: doc.id,
                    estado: data.estado || 'abierto',
                    fechaInicio: data.fechaInicio || '',
                    horaInicio: data.horaInicio || '',
                    fechaFin: data.fechaFin || '',
                    horaFin: data.horaFin || '',
                    tiempoTrabajado: data.tiempoTrabajado || '00:00'
                });
            }

            // Calcular ranking mensual de todos los usuarios
            if (data.fechaInicio && data.fechaInicio.startsWith(currentYearMonth) && data.tiempoTrabajado) {
                if (!rankingMap[uName]) {
                    rankingMap[uName] = {
                        usuarioName: uName,
                        totalMinutos: 0
                    };
                }
                const partes = data.tiempoTrabajado.split(':');
                if (partes.length === 2) {
                    const h = parseInt(partes[0]) || 0;
                    const m = parseInt(partes[1]) || 0;
                    rankingMap[uName].totalMinutos += (h * 60) + m;
                }
            }
        });
    } catch (err) {
        console.error('Error leyendo Firestore:', err);
    }

    // Procesar y ordenar el ranking mensual de mayor a menor
    const rankingMensual = Object.values(rankingMap).map(item => {
        const horas = Math.floor(item.totalMinutos / 60);
        const minutos = item.totalMinutos % 60;
        return {
            ...item,
            tiempoTotalFormateado: `${String(horas).padStart(2, '0')}h ${String(minutos).padStart(2, '0')}m`
        };
    }).sort((a, b) => b.totalMinutos - a.totalMinutos);

    let html = `
    <html>
    <head>
        <title>Mis Servicios y Ranking</title>
        <style>
            body { font-family: sans-serif; background-color: #f4f7f9; padding: 20px; color: #333; }
            .container { max-width: 650px; margin: auto; }
            .card { background: white; padding: 20px; margin-bottom: 12px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 5px solid #3498db; }
            .card-cerrado { border-left-color: #27ae60; }
            .back-btn { display: inline-block; margin-bottom: 15px; color: #34495e; text-decoration: none; font-weight: bold; }
            h1, h2 { color: #2c3e50; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { padding: 10px; border-bottom: 1px solid #eee; text-align: left; font-size: 14px; }
            th { background: #f8f9fa; }
        </style>
    </head>
    <body>
        <div class="container">
            <a href="/api/acceso" class="back-btn">← Volver al panel</a>
            <h1>Mis Servicios</h1>
    `;

    if (misServicios.length === 0) {
        html += `<div class="card"><p style="margin:0; text-align:center;">No tienes servicios registrados.</p></div>`;
    } else {
        misServicios.forEach(s => {
            const isAbierto = s.estado === 'abierto';
            html += `
                <div class="card ${isAbierto ? '' : 'card-cerrado'}">
                    <p style="margin: 0 0 5px 0;"><b>Estado:</b> <span style="color: ${isAbierto ? '#3498db' : '#27ae60'};">${isAbierto ? 'En progreso...' : 'Cerrado'}</span></p>
                    <p style="margin: 0 0 5px 0;"><b>Inicio:</b> ${s.fechaInicio} a las ${s.horaInicio}</p>
                    ${!isAbierto ? `<p style="margin: 0 0 5px 0;"><b>Fin:</b> ${s.fechaFin} a las ${s.horaFin}</p>` : ''}
                    ${!isAbierto ? `<p style="margin: 0;"><b>Tiempo Trabajado:</b> ${s.tiempoTrabajado} hrs</p>` : ''}
                </div>
            `;
        });
    }

    html += `
            <h2 style="margin-top: 30px;">🏆 Ranking Mensual (${currentYearMonth})</h2>
            <div class="card" style="border-left-color: #f39c12;">
    `;

    if (rankingMensual.length === 0) {
        html += `<p style="margin:0; text-align:center;">No hay registros de horas para este mes.</p>`;
    } else {
        html += `
                <table>
                    <thead>
                        <tr>
                            <th>Pos.</th>
                            <th>Usuario</th>
                            <th style="text-align: right;">Total Horas</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        rankingMensual.forEach((r, index) => {
            html += `
                        <tr>
                            <td><b>#${index + 1}</b></td>
                            <td>${r.usuarioName}</td>
                            <td style="text-align: right; font-weight: bold; color: #27ae60;">${r.tiempoTotalFormateado}</td>
                        </tr>
            `;
        });
        html += `
                    </tbody>
                </table>
        `;
    }

    html += `
            </div>
        </div>
    </body>
    </html>
    `;

    res.send(html);
};
