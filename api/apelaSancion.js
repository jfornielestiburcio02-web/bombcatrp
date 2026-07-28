const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, addDoc } = require('firebase/firestore');
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

// Helper para parsear el body en peticiones POST (compatible con entornos serverless / Node puro)
async function parseBody(req) {
    return new Promise((resolve) => {
        if (req.body) return resolve(req.body);
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
                try { resolve(JSON.parse(body)); } catch(e) { resolve({}); }
            } else {
                const params = new URLSearchParams(body);
                const obj = {};
                for (const [key, value] of params.entries()) { obj[key] = value; }
                resolve(obj);
            }
        });
    });
}

module.exports = async (req, res) => {
    const cookies = parse(req.headers.cookie || '');
    if (!cookies.uid) return res.redirect('/api/login');

    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const sancionId = urlObj.searchParams.get('id');

    if (!sancionId) {
        return res.redirect('/api/portalApelaciones');
    }

    // Comprobar si ya existe una apelación enviada para esta sanción por este usuario
    const qCheck = query(
        collection(db, 'revisionASuperiores'), 
        where("sancionId", "==", sancionId), 
        where("usuarioId", "==", cookies.uid)
    );
    const existingSnapshot = await getDocs(qCheck);
    const yaApeleo = !existingSnapshot.empty;

    // Procesar envío del formulario (POST)
    if (req.method === 'POST') {
        if (yaApeleo) {
            return res.redirect('/api/portalApelaciones');
        }

        const body = await parseBody(req);
        const motivo = body.motivo || '';
        const detalles = body.detalles || '';
        const notas = body.notas || '';

        await addDoc(collection(db, 'revisionASuperiores'), {
            usuarioId: cookies.uid,
            sancionId: sancionId,
            motivo: motivo,
            detalles: detalles,
            notas: notas,
            esAceptada: false,
            fechaRegistro: new Date().toISOString()
        });

        return res.redirect('/api/portalApelaciones');
    }

    // Renderizar vista (GET)
    let html = `
    <html>
    <head>
        <meta charset="UTF-8">
        <script>
            // Ocultar rápidamente el ?id de la URL para que quede limpio
            window.history.replaceState(null, '', window.location.pathname);
        </script>
        <style>
            body { font-family: sans-serif; background-color: #f4f7f9; padding: 20px; color: #333; }
            .container { max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .back-btn { display: inline-block; margin-bottom: 15px; color: #34495e; text-decoration: none; font-weight: bold; }
            .form-group { margin-bottom: 15px; }
            label { display: block; font-weight: bold; margin-bottom: 5px; color: #555; }
            textarea { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-family: sans-serif; resize: vertical; height: 90px; }
            .btn-submit { background-color: #2ecc71; color: white; padding: 10px 20px; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; width: 100%; }
            .btn-submit:hover { background-color: #27ae60; }
            .pending-box { text-align: center; padding: 30px; font-size: 1.4em; font-weight: bold; color: #e67e22; background: #fdf3e7; border-radius: 6px; border: 1px dashed #f39c12; margin-top: 20px; }
            h1 { color: #2c3e50; }
        </style>
    </head>
    <body>
        <div class="container">
            <a href="/api/portalApelaciones" class="back-btn">← Volver al Portal de Apelaciones</a>
            <h1>Formulario de Apelación</h1>
    `;

    if (yaApeleo) {
        html += `
            <div class="pending-box">Resolución Pendiente...</div>
            <p style="text-align: center; color: #666; margin-top: 15px;">Ya has enviado una solicitud de revisión para esta sanción. No puedes enviar más solicitudes.</p>
        `;
    } else {
        html += `
            <form method="POST">
                <div class="form-group">
                    <label>Justificar Por motivo:</label>
                    <textarea name="motivo" required placeholder="Escribe el motivo principal de tu apelación..."></textarea>
                </div>
                <div class="form-group">
                    <label>Detalles:</label>
                    <textarea name="detalles" required placeholder="Aporta detalles o contexto de lo ocurrido..."></textarea>
                </div>
                <div class="form-group">
                    <label>Notas:</label>
                    <textarea name="notas" placeholder="Notas o información adicional (opcional)..."></textarea>
                </div>
                <button type="submit" class="btn-submit">Enviar Solicitud</button>
            </form>
        `;
    }

    html += `</div></body></html>`;
    res.send(html);
};
