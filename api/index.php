<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Acceso Institucional - Bombers CATRP</title>
    <style>
        /* Reset y base */
        body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f0f2f5;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        /* Contenedor principal */
        .login-card {
            background: #ffffff;
            padding: 48px;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border: 1px solid #dcdcdc;
            text-align: center;
            width: 100%;
            max-width: 380px;
        }

        /* Logo */
        .logo {
            width: 120px;
            margin-bottom: 24px;
        }

        /* Títulos */
        h2 {
            color: #1a1a1a;
            font-size: 1.25rem;
            margin: 0 0 8px 0;
            font-weight: 600;
            letter-spacing: -0.5px;
        }

        p {
            color: #555;
            font-size: 0.9rem;
            margin-bottom: 32px;
        }

        /* Botón de acceso */
        .btn-discord {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            background-color: #2c3e50;
            color: #ffffff;
            padding: 12px 20px;
            text-decoration: none;
            border-radius: 2px;
            font-weight: 500;
            transition: background-color 0.2s ease;
            font-size: 0.95rem;
        }

        .btn-discord:hover {
            background-color: #1a252f;
        }

        .btn-discord img {
            width: 20px;
            filter: brightness(0) invert(1);
        }

        /* Pie de página */
        .footer {
            margin-top: 32px;
            font-size: 0.75rem;
            color: #999;
        }
    </style>
</head>
<body>

    <div class="login-card">
        <!-- Reemplaza el src con tu enlace de imagen -->
        <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRJsMydNmb39vQFmlSOvm2lhiqZtW2unmzq7ZV99iwAbbUhqbM22xTrhoI&s=10" alt="Logo Bombers" class="logo">
        
        <h2>ACCESO - BOMBERS CATRP</h2>
        <p>Sistema de gestión institucional restringido.</p>
        
        <a href="https://discord.com/oauth2/authorize?client_id=1519766493070495844&response_type=code&redirect_uri=https%3A%2F%2Fbomberscatrp.vercel.app%2Finicio%2Findex.php&scope=identify" class="btn-discord">
            <img src="https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png" alt="Discord Icon">
            Iniciar sesión con Discord
        </a>

        <div class="footer">
            &copy; 2026 Bombers CATRP. Todos los derechos reservados.
        </div>
    </div>

</body>
</html>
