<?php
// Configuración de Sesión
session_set_cookie_params(86400, '/');
session_start();

$client_id = '1519766493070495844';
$client_secret = 'xITCUyPFMgCxcnfqNyD47YJeLpFJrxDO';
$project_id = "studio-2205130965-43d57";
$api_key = "AIzaSyCaKqY3JuR-5EkaUYRxK9lslX2qL0gOcic";

// 1. Lógica de Autenticación con Discord
if (!isset($_SESSION['user']) && isset($_GET['code'])) {
    $token_url = "https://discord.com/api/oauth2/token";
    $params = ['client_id' => $client_id, 'client_secret' => $client_secret, 'grant_type' => 'authorization_code', 'code' => $_GET['code'], 'redirect_uri' => 'https://bomberscatrp.vercel.app/inicio/index.php'];
    $ch = curl_init($token_url);
    curl_setopt($ch, CURLOPT_POST, 1); curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params)); curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = json_decode(curl_exec($ch), true);
    if (isset($response['access_token'])) {
        $ch = curl_init("https://discord.com/api/users/@me");
        curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer " . $response['access_token']]); curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $_SESSION['user'] = json_decode(curl_exec($ch), true);
    }
    header("Location: index.php"); exit;
}

if (!isset($_SESSION['user'])) { die("Acceso denegado. <a href='../login.php'>Ir al Login</a>"); }
$uId = $_SESSION['user']['id'];

// 2. Lógica para ELIMINAR inactividad
if (isset($_GET['delete_inactividad'])) {
    $docId = $_GET['delete_inactividad'];
    $ch = curl_init("https://firestore.googleapis.com/v1/projects/$project_id/databases/(default)/documents/inactividades/$docId?key=$api_key");
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "DELETE"); curl_exec($ch); curl_close($ch);
    header("Location: index.php"); exit;
}

// 3. Función para leer Firestore
function getFirestoreData($col, $uId, $project_id, $api_key) {
    $url = "https://firestore.googleapis.com/v1/projects/$project_id/databases/(default)/documents:runQuery?key=$api_key";
    $query = ['structuredQuery' => ['from' => [['collectionId' => $col]], 'where' => ['fieldFilter' => ['field' => ['fieldPath' => 'usuarioId'], 'op' => 'EQUAL', 'value' => ['stringValue' => $uId]]]]];
    $ch = curl_init($url); curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); curl_setopt($ch, CURLOPT_POST, true); curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($query));
    $res = json_decode(curl_exec($ch), true); curl_close($ch);
    return $res;
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Panel Institucional</title>
    <style>
        body { font-family: sans-serif; background: #f4f7f9; padding: 20px; }
        .card { background: white; padding: 20px; margin-bottom: 20px; border-radius: 4px; border-left: 5px solid #2c3e50; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        h2 { color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        .btn-del { color: red; font-size: 0.8rem; text-decoration: none; border: 1px solid red; padding: 2px 5px; }
    </style>
</head>
<body>
    <h1>Bienvenido, <?php echo $_SESSION['user']['username']; ?></h1>

    <h2>Observaciones</h2>
    <?php foreach(getFirestoreData('observaciones', $uId, $project_id, $api_key) as $d) { 
        if(!isset($d['document'])) continue; $f = $d['document']['fields'];
        echo "<div class='card'>{$f['tipo']['stringValue']} - Nota: {$f['nota']['integerValue']}</div>";
    } ?>

    <h2>Sanciones</h2>
    <?php foreach(getFirestoreData('sanciones', $uId, $project_id, $api_key) as $d) {
        if(!isset($d['document'])) continue; $f = $d['document']['fields'];
        echo "<div class='card'>Motivo: {$f['motivo']['stringValue']} - Tipo: {$f['tipo']['stringValue']}</div>";
    } ?>

    <h2>Ascensos / Descensos</h2>
    <?php foreach(getFirestoreData('registrosRangos', $uId, $project_id, $api_key) as $d) {
        if(!isset($d['document'])) continue; $f = $d['document']['fields'];
        echo "<div class='card'>{$f['tipo']['stringValue']} a rango: {$f['nuevoRango']['stringValue']}</div>";
    } ?>

    <h2>Inactividades</h2>
    <?php foreach(getFirestoreData('inactividades', $uId, $project_id, $api_key) as $d) {
        if(!isset($d['document'])) continue; $f = $d['document']['fields'];
        $docId = basename($d['document']['name']);
        echo "<div class='card'>Motivo: {$f['motivo']['stringValue']} <br> <a class='btn-del' href='?delete_inactividad=$docId'>Eliminar</a></div>";
    } ?>
</body>
</html>
