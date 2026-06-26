const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');
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
    // Asumimos que la cookie tiene el nombre de usuario (el formato de tu base de datos)
    // Si la cookie guarda el ID numérico, deberás cambiar 'cookies.uid' por el nombre de usuario
    const user = cookies.username; 
    
    if (!user) return res.redirect('/api/login');

    // FILTRO POR CAMPO 'usuario' (según tu base de datos)
    const q = query(collection(db, 'registrosRangos'), where("usuario", "==", user));
    const snapshot = await getDocs(q);
    
    let html = `
    <html>
    <head>
        <style>
            body { font-family: sans-serif; background-color: #f4f7f9; padding: 20px; }
            .container { max-width: 600px; margin: auto; }
            .card { background: white; padding: 15px; margin-bottom: 10px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 5px solid #f39c12; }
            .row { margin-bottom: 5px; }
            .label { font-weight: bold; color: #555; }
            .back-btn { display: inline-block; margin-bottom: 15px; color: #34495e; text-decoration: none; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <a href="/api/acceso" class="back-btn">← Volver al panel</a>
            <h1>Ascensos / Descensos</h1>
    `;

    if (snapshot.empty) {
        html += `<p>No hay registros de ascensos/descensos.</p>`;
    } else {
        snapshot.forEach(doc => {
            const d = doc.data();
            html += `
                <div class="card">
                    <div class="row"><span class="label">Tipo:</span> ${d.tipo || 'N/A'}</div>
                    <div class="row"><span class="label">Nuevo Rango:</span> ${d.nuevoRango || 'N/A'}</div>
                    <div class="row"><span class="label">Motivo:</span> ${d.motivo || 'N/A'}</div>
                </div>
            `;
        });
    }

    html += `</div></body></html>`;
    res.send(html);
};
