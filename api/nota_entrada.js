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
    if (!cookies.username) return res.redirect('/api/login'); // Usamos el nombre de usuario guardado en la cookie

    // Consultamos la colección 'corregidos' filtrando por 'usuario'
    const q = query(collection(db, 'corregidos'), where("usuario", "==", cookies.username));
    const snapshot = await getDocs(q);
    
    let html = `
    <html>
    <head>
        <style>
            body { font-family: sans-serif; background-color: #f4f7f9; padding: 20px; }
            .container { max-width: 600px; margin: auto; }
            .card { background: white; padding: 20px; margin-bottom: 10px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 5px solid #3498db; text-align: center; }
            .nota-grande { font-size: 3em; font-weight: bold; color: #2c3e50; }
            .back-btn { display: inline-block; margin-bottom: 15px; color: #34495e; text-decoration: none; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <a href="/api/index" class="back-btn">← Volver al panel</a>
            <h1>Nota de Entrada</h1>
    `;

    if (snapshot.empty) {
        html += `<div class="card">No se encontró nota de entrada para este usuario.</div>`;
    } else {
        snapshot.forEach(doc => {
            const d = doc.data();
            html += `
                <div class="card">
                    <p>Tu nota final es:</p>
                    <div class="nota-grande">${d.notaFinal}</div>
                </div>
            `;
        });
    }

    html += `</div></body></html>`;
    res.send(html);
};
