const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

// Configuración de Firebase
const firebaseConfig = { /* TU CONFIGURACIÓN DE FIREBASE AQUÍ */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

module.exports = async (req, res) => {
    // 1. Lógica simple de sesión (simulada por cookie/token)
    // En Vercel/Node, gestionamos el estado mediante cookies firmadas
    const discordId = req.cookies.discordId; 

    if (!discordId) {
        return res.send(`<h1>Acceso Restringido</h1><a href="https://discord.com/api/oauth2/authorize?client_id=1519766493070495844&redirect_uri=https://bomberscatrp.vercel.app/inicio/index.php&response_type=code&scope=identify">Login con Discord</a>`);
    }

    // 2. Consultar Firestore
    const collections = ['observaciones', 'sanciones', 'registrosRangos', 'inactividades'];
    let html = `<h1>Bienvenido, ${discordId}</h1>`;

    for (let colName of collections) {
        html += `<h2>${colName.toUpperCase()}</h2>`;
        const q = query(collection(db, colName), where("usuarioId", "==", discordId));
        const snapshot = await getDocs(q);
        
        snapshot.forEach((doc) => {
            html += `<div style="border:1px solid #ccc; padding:10px; margin:5px;">${JSON.stringify(doc.data())}</div>`;
        });
    }

    res.send(html);
};
