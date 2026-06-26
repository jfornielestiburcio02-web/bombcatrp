<?php
// 1. Configuración de sesión FORZADA
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
session_start();

// 2. Si ya tienes sesión, saltamos al panel
if (isset($_SESSION['user'])) {
    // Ya está logueado, continuar al panel
} 
// 3. Si no hay sesión, pero hay código de Discord, procesar
elseif (isset($_GET['code'])) {
    $params = [
        'client_id' => '1519766493070495844',
        'client_secret' => 'xITCUyPFMgCxcnfqNyD47YJeLpFJrxDO',
        'grant_type' => 'authorization_code',
        'code' => $_GET['code'],
        'redirect_uri' => 'https://bomberscatrp.vercel.app/inicio/index.php'
    ];

    $ch = curl_init("https://discord.com/api/oauth2/token");
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = json_decode(curl_exec($ch), true);
    
    if (isset($response['access_token'])) {
        $ch = curl_init("https://discord.com/api/users/@me");
        curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer " . $response['access_token']]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $user = json_decode(curl_exec($ch), true);
        
        // ¡Aquí guardamos!
        $_SESSION['user'] = $user;
    } else {
        // ERROR: Discord rechazó el código
        die("Error de autenticación con Discord: " . print_r($response, true));
    }
} 
// 4. Si después de todo esto no hay sesión, forzar login
else {
    header("Location: ../login.php");
    exit;
}

// Si llegamos aquí, $user es real y la sesión vive
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
