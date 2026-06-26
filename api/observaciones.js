// ... (tu código anterior de consulta)

let html = `
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f9; padding: 40px; }
        .container { max-width: 600px; margin: auto; }
        .back-btn { display: inline-block; margin-bottom: 20px; color: #34495e; text-decoration: none; font-weight: bold; }
        .card { 
            background: white; 
            padding: 20px; 
            margin-bottom: 15px; 
            border-radius: 8px; 
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            border-left: 5px solid #2c3e50;
            transition: transform 0.2s;
        }
        .card:hover { transform: translateX(5px); }
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
    html += `<p>No tienes observaciones registradas.</p>`;
} else {
    snapshot.forEach(doc => {
        const d = doc.data();
        html += `
            <div class="card">
                <span class="nota">Nota: ${d.nota || 0}</span>
                <div class="tipo">${d.tipo || 'Sin título'}</div>
                <p style="color: #666;">Registrado en el sistema institucional.</p>
            </div>
        `;
    });
}

html += `</div></body></html>`;
res.send(html);
