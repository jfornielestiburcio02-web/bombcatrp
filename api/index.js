module.exports = (req, res) => {
    res.send(`
    <html>
    <head>
        <title>Panel Bombers CATRP</title>
        <style>
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                background: white; 
                margin: 0; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
            }
            .container { text-align: center; padding: 40px; }
            .logo { width: 150px; margin-bottom: 20px; }
            h1 { color: #2c3e50; }
            .btn-discord {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                background-color: #5865F2;
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                font-size: 1.1em;
                transition: background 0.3s;
            }
            .btn-discord:hover { background-color: #4752c4; }
        </style>
    </head>
    <body>
        <div class="container">
            <img src="data:image/png;base64,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">
            <h1>Panel de Control Institucional</h1>
            <p>Acceso restringido a personal autorizado.</p>
            <br>
            <a href="/api/login" class="btn-discord">
                <img src="https://static.vecteezy.com/system/resources/thumbnails/018/930/718/small_2x/discord-logo-discord-icon-transparent-free-png.png" width="30" alt="Discord">
                Iniciar sesión con Discord
            </a>
        </div>
    </body>
    </html>
    `);
};
