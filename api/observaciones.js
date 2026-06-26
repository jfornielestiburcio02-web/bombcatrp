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
    const uid = cookies.uid;

    if (!uid) return res.send("Error: No tienes cookie de sesión (uid).");

    // DEBUG: AQUÍ VEREMOS QUÉ ESTÁ BUSCANDO
    console.log("Buscando en Firestore documentos donde usuarioId == " + uid);

    const q = query(collection(db, 'observaciones'), where("usuarioId", "==", uid));
    const snapshot = await getDocs(q);
    
    let html = `<html><body>
    <p>Depuración: Se está buscando usuarioId: <strong>${uid}</strong></p>
    <p>Documentos encontrados: <strong>${snapshot.size}</strong></p>`;

    snapshot.forEach(doc => {
        const d = doc.data();
        html += `<div style="border:1px solid red; margin:10px;">Encontrado: ${JSON.stringify(d)}</div>`;
    });

    html += `<a href="/api/index">Volver</a></body></html>`;
    res.send(html);
};
