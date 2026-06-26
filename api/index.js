const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyCaKqY3JuR-5EkaUYRxK9lslX2qL0gOcic",
    authDomain: "studio-2205130965-43d57.firebaseapp.com",
    projectId: "studio-2205130965-43d57",
    storageBucket: "studio-2205130965-43d57.firebasestorage.app",
    messagingSenderId: "270382140390",
    appId: "1:270382140390:web:749abd3d5a6fdc02e7a427"
};

const db = getFirestore(initializeApp(firebaseConfig));

module.exports = async (req, res) => {
    // Aquí el ID de Discord que viene en la cookie (la sesión persistente)
    const discordId = req.cookies.uid; 
    
    if (!discordId) {
        return res.status(401).send('No has iniciado sesión. <a href="/api/login">Ir a Login</a>');
    }

    const collections = ['observaciones', 'sanciones', 'registrosRangos', 'inactividades'];
    let html = `<html><body style="font-family:sans-serif; padding:40px;"><h1>Panel Bombers CATRP</h1>`;

    for (let colName of collections) {
        html += `<h2>${colName.toUpperCase()}</h2>`;
        const q = query(collection(db, colName), where("usuarioId", "==", discordId));
        const snapshot = await getDocs(q);
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            html += `<div style="border:1px solid #ccc; padding:10px; margin-bottom:5px;">${JSON.stringify(data)}</div>`;
        });
    }
    html += `</body></html>`;
    res.send(html);
};
