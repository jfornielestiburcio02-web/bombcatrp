const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, doc, deleteDoc } = require('firebase/firestore');
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

    // LÓGICA DE ELIMINACIÓN
    if (req.query.action === 'delete' && req.query.id) {
        await deleteDoc(doc(db, 'inactividades', req.query.id));
        return res.redirect('/api/inactividades'); // Refresca la página tras borrar
    }

    const q = query(collection(db, 'inactividades'), where("usuarioId", "==", cookies.uid));
    const snapshot = await getDocs(q);
    
    let html = `
    <html>
    <head>
        <style>
            body { font-family: sans-serif; background-color: #f4f7f9; padding: 20px; }
            .container { max-width: 600px; margin: auto; }
            .card { background: white; padding: 15px; margin-bottom: 10px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 5px solid #9b59b6; display: flex; justify-content: space-between; align-items: center; }
            .back-btn { display: inline-block; margin-bottom: 15px; color: #34495e; text-decoration: none; font-weight: bold; }
            .trash-btn { cursor: pointer; color: red; font-size: 1.2em; text-decoration: none; }
        </style>
    </head>
    <body>
        <div class="container">
            <a href="/api/acceso" class="back-btn">← Volver al panel</a>
            <h1>Inactividades</h1>
    `;

    if (snapshot.empty) {
        html += `<p>No tienes inactividades registradas.</p>`;
    } else {
        snapshot.forEach(d => {
            const data = d.data();
            html += `
                <div class="card">
                    <div>
                        <strong>Motivo:</strong> ${data.motivo}<br>
                        <small>Inicio: ${data.inicio} | Fin: ${data.fin}</small>
                    </div>
                    <a href="/api/inactividades?action=delete&id=${d.id}" class="trash-btn" title="Eliminar">🗑️</a>
                </div>
            `;
        });
    }

    html += `</div></body></html>`;
    res.send(html);
};
