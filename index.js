const express = require('express');
const app = express();

// Middleware para leer datos de formularios y JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Ruta principal (la página de bienvenida con tu diseño)
app.get('/', (req, res) => {
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
            <img class="logo" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJQAAACUCAMAAABC4vDmAAAAn1BMVEXjJxf////8wzDhAAD9yDH8xTD1wsL+zDLhABTiFQD+yjHiHRbtjInjJRTpZl/iFRXlPzr7vS/41NL98/L3qCvjIQ35si30vrz529rwoqHlOhnoTxz64N/ueiP4rizkMhj2y8ntdCLsaiDyjyfqYB/0mynvmJXpamrlREDpWR7jLirwhiX76OfnVFDsgHzoXFfztbTrdG3kMSLyq6rmT0frDaLLAAATKUlEQVR4nM2cCXuyuhKAgQRZIkVkqQLibt2X2v//2+5MWAQERDznPHeee3v6tRVeJrMlZCKIn4gdDmf3zfnnsv39FQThd3v5OW/us2Fof3RZoTtQr/9z2muEaJrmGgYwCYbhavADov2efvrf3cJ6QYXXM9K4Lmd5FsN14ffu+QR+V1DH8WVPtBqcAppG9pfN8d+HCu9/oIIWRKnKCNmO39XXe1Czrz1x2wKl4pL9z/Dfgjrem0bNBGEo1eM4uL5h962h7M1AwsL1HDXlPugcu/jXhK1D7n6tL0nK7B61fT4vS/6k0vW7Z42+2dZz+j0c9uOaC0lP/Z9A5HqY91YfG2v4fI0P6w8o5Oup2Xj7a8o5Ptwz76+W99O860bWf2wX9zWv2e6p332n476b9uK9d9n8+o+d/a7L/a3O4D+z9p93b/n88A232+7lq975+80v/r96f+169t8aXv//8p9f+/rfbvvj3Xf+/6/r32w==" alt="Logo">
            <h1>BOMBERS - BARCELONA</h1>
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
});

// Mantener el servidor abierto en el puerto que asigne Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
