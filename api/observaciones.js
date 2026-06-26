const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');
const { parse } = require('cookie');

// Configuración limpia
const firebaseConfig = {
    apiKey: "AIzaSyAcBmdyP0rJE7x0FQxIp4FEnKuTsO5wH14",
    authDomain: "bombctrp131344.firebaseapp.com",
    projectId: "bombctrp131344",
    storageBucket: "bombctrp131344.firebasestorage.app",
    messagingSenderId: "286186204549",
    appId: "1:286186204549:web:cc707dcc23cc664f1c28ec"
};

// Inicialización correcta
const db = getFirestore(initializeApp(firebaseConfig));

module.exports = async (req, res) => {
    const cookies = parse(req.headers.cookie || '');
    if (!cookies.uid) return res.redirect('/api/login');

    // Consulta a la colección
    const q = query(collection(db, 'observaciones'), where("usuarioId", "==", cookies.uid));
    const snapshot = await getDocs(q);
    
    let html = `<a href="/api/index">← Volver</a><h1>Observaciones</h1>`;
    
    if (snapshot.empty) {
        html += `<p>No hay observaciones registradas.</p>`;
    } else {
        snapshot.forEach(doc => {
            const d = doc.data();
            html += `<div style="border:1px solid #ccc; padding:10px; margin:5px;">Tipo: ${d.tipo || 'N/A'} | Nota: ${d.nota || 0}</div>`;
        });
    }
    
    res.send(html);
};
