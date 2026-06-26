<?php
// 1. Configuración de sesión global
session_set_cookie_params(86400, '/'); 
session_start();

// 2. Si NO tenemos sesión, pero SÍ tenemos un código de Discord, procesamos el login
if (!isset($_SESSION['user']) && isset($_GET['code'])) {
    
    $token_url = "https://discord.com/api/oauth2/token";
    $params = [
        'client_id' => '1519766493070495844',
        'client_secret' => 'xITCUyPFMgCxcnfqNyD47YJeLpFJrxDO',
        'grant_type' => 'authorization_code',
        'code' => $_GET['code'],
        'redirect_uri' => 'https://bomberscatrp.vercel.app/inicio/index.php'
    ];

    // Petición a Discord para obtener el token
    $ch = curl_init($token_url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = json_decode(curl_exec($ch), true);
    curl_close($ch);

    if (isset($response['access_token'])) {
        // Obtenemos los datos del usuario
        $ch = curl_init("https://discord.com/api/users/@me");
        curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer " . $response['access_token']]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $user = json_decode(curl_exec($ch), true);
        curl_close($ch);

        // AQUÍ ESTÁ EL PASO CLAVE: Guardamos en sesión
        $_SESSION['user'] = $user;
        
        // Redirigimos para limpiar el ?code=... de la URL y evitar errores al refrescar
        header("Location: /inicio/index.php");
        exit;
    }
}

// 3. Si después de intentar loguear seguimos sin sesión, enviamos al login
if (!isset($_SESSION['user'])) {
    header("Location: /login.php");
    exit;
}

// Si llegamos aquí, la sesión está activa y lista
$user = $_SESSION['user'];
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Panel - Bombers CATRP</title>
    <style>
        body { font-family: sans-serif; background: #f4f7f9; padding: 50px; text-align: center; }
        .card { background: white; padding: 40px; border-radius: 4px; border-top: 4px solid #2c3e50; display: inline-block; box-shadow: 0 2px 10px rgba(0,0,0,0.1); width: 320px; }
        h1 { font-size: 1.2rem; color: #333; margin-bottom: 25px; }
        .btn { display: block; width: 100%; margin: 10px 0; padding: 12px; background: #f8f9fa; border: 1px solid #dee2e6; color: #333; text-decoration: none; border-radius: 2px; font-weight: 500; }
        .btn:hover { background: #e9ecef; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Bienvenido, <strong><?php echo htmlspecialchars($user['username']); ?></strong></h1>
        <a href="/inicio/observaciones.php" class="btn">Observaciones</a>
        <a href="/inicio/index.php/sanciones.php" class="btn">Sanciones</a>
        <a href="/ascensos" class="btn">Ascensos / Descensos</a>
        <a href="/minota" class="btn">Mi nota de entrada</a>
        <br>
        <a href="logout.php" style="font-size: 0.8rem; color: #999;">Cerrar sesión</a>
    </div>
</body>
</html>
