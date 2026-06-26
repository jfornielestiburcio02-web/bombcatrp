<?php
// Configuración (REEMPLAZA ESTOS DATOS)
$client_id = '1519766493070495844';
$client_secret = 'xITCUyPFMgCxcnfqNyD47YJeLpFJrxDO';
$redirect_uri = 'https://bomberscatrp.vercel.app/inicio/index.php';

// 1. Verificar si recibimos el código
if (!isset($_GET['code'])) {
    die("Error: No se recibió código de autorización.");
}

$code = $_GET['code'];

// 2. Intercambiar código por Token de acceso
$token_url = "https://discord.com/api/oauth2/token";
$data = [
    'client_id' => $client_id,
    'client_secret' => $client_secret,
    'grant_type' => 'authorization_code',
    'code' => $code,
    'redirect_uri' => $redirect_uri,
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $token_url);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = json_decode(curl_exec($ch), true);
curl_close($ch);

if (!isset($response['access_token'])) {
    die("Error al obtener el token.");
}

// 3. Obtener datos del usuario con el token
$user_url = "https://discord.com/api/users/@me";
$headers = ["Authorization: Bearer " . $response['access_token']];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $user_url);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$user = json_decode(curl_exec($ch), true);
curl_close($ch);
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Panel Bombers CATRP</title>
    <style>
        body { font-family: sans-serif; background: #f4f4f4; padding: 50px; text-align: center; }
        .card { background: white; padding: 30px; border-radius: 8px; display: inline-block; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .btn { display: block; width: 200px; margin: 10px auto; padding: 10px; background: #2c3e50; color: white; text-decoration: none; border-radius: 4px; }
    </style>
</head>
<body>

<div class="card">
    <h1>Bienvenido, <?php echo htmlspecialchars($user['username']); ?></h1>
    <p><strong>Email:</strong> <?php echo htmlspecialchars($user['email']); ?></p>
    
    <hr>
    <h3>Acceso a Módulos</h3>
    <a href="#" class="btn">Panel de Control</a>
    <a href="#" class="btn">Registros de Actividad</a>
    <a href="#" class="btn">Configuración</a>
</div>

</body>
</html>
