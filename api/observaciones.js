const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');
const { parse } = require('cookie');

// CONFIGURACIÓN INTEGRADA
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

    const q = query(collection(db, 'observaciones'), where("usuarioId", "==", cookies.uid));
    const snapshot = await getDocs(q);
    
    let html = `
    <html>
    <head>
        <style>
            body { font-family: sans-serif; background-color: #f4f7f9; padding: 40px; }
            .container { max-width: 600px; margin: auto; }
            .back-btn { display: inline-block; margin-bottom: 20px; color: #34495e; text-decoration: none; font-weight: bold; }
            .card { 
                background: white; padding: 20px; margin-bottom: 15px; border-radius: 8px; 
                box-shadow: 0 2px 5px rgba(0,0,0,0.1); border-left: 5px solid #2c3e50;
            }
            .tipo { font-weight: bold; color: #2c3e50; font-size: 1.1em; }
            .nota { float: right; background: #e8f6f3; color: #27ae60; padding: 5px 10px; border-radius: 4px; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <a href="/api/index" class="back-btn">← Volver al panel</a>
            <h1>Mis Observaciones</h1>
    `;

    if (snapshot.empty) {
        html += `<div class="card">No tienes observaciones.</div>`;
    } else {
        snapshot.forEach(doc => {
            const d = doc.data();
            // Filtramos nota > 0
            if (d.nota > 0) {
                html += `
                    <div class="card">
                        <span class="nota">Nota: ${d.nota}</span>
                        <div class="tipo">${d.tipo || 'Sin título'}</div>
                    </div>
                `;
            }
        });
    }

    html += `</div></body></html>`;
    res.send(html);
};
