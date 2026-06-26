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
    if (!cookies.uid) return res.redirect('/api/login');

    // Consulta específica para la colección 'sanciones'
    const q = query(collection(db, 'sanciones'), where("usuarioId", "==", cookies.uid));
    const snapshot = await getDocs(q);
    
    let html = `
    <html>
    <head>
        <style>
            body { font-family: sans-serif; background-color: #f4f7f9; padding: 20px; }
            .container { max-width: 600px; margin: auto; }
            .card { background: white; padding: 15px; margin-bottom: 10px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 5px solid #e74c3c; }
            .row { margin-bottom: 5px; }
            .label { font-weight: bold; color: #555; }
            .back-btn { display: inline-block; margin-bottom: 15px; color: #34495e; text-decoration: none; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <a href="/api/acceso" class="back-btn">← Volver al panel</a>
            <h1>Mis Sanciones</h1>
    `;

    if (snapshot.empty) {
        html += `<p>No tienes sanciones registradas.</p>`;
    } else {
        snapshot.forEach(doc => {
            const d = doc.data();
            const fecha = d.fechaRegistro ? new Date(d.fechaRegistro.seconds * 1000).toLocaleDateString() : 'N/A';
            
            html += `
                <div class="card">
                    <div class="row"><span class="label">Tipo:</span> ${d.tipo || 'N/A'}</div>
                    <div class="row"><span class="label">Motivo:</span> ${d.motivo || 'N/A'}</div>
                    <div class="row"><span class="label">Instructor:</span> ${d.instructor || 'N/A'}</div>
                    <div class="row"><span class="label">Fecha:</span> ${fecha}</div>
                </div>
            `;
        });
    }

    html += `</div></body></html>`;
    res.send(html);
};
