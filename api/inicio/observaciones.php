<?php
session_set_cookie_params(0, '/'); 
session_start();

// 1. Verificación de sesión
if (!isset($_SESSION['user'])) {
    header("Location: login.php");
    exit;
}

$discordId = $_SESSION['user']['id'];
$projectId = "studio-2205130965-43d57";
$apiKey = "AIzaSyCaKqY3JuR-5EkaUYRxK9lslX2qL0gOcic";

// 2. Preparar el Structured Query para Firestore
$url = "https://firestore.googleapis.com/v1/projects/$projectId/databases/(default)/documents:runQuery?key=$apiKey";

$query = [
    'structuredQuery' => [
        'from' => [['collectionId' => 'observaciones']],
        'where' => [
            'compositeFilter' => [
                'op' => 'AND',
                'filters' => [
                    ['fieldFilter' => ['field' => ['fieldPath' => 'usuarioId'], 'op' => 'EQUAL', 'value' => ['stringValue' => $discordId]]],
                    ['fieldFilter' => ['field' => ['fieldPath' => 'nota'], 'op' => 'GREATER_THAN', 'value' => ['integerValue' => 0]]]
                ]
            ]
        ]
    ]
];

// 3. Petición a Firestore
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($query));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$response = curl_exec($ch);
curl_close($ch);

$results = json_decode($response, true);
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Observaciones - Bombers CATRP</title>
    <style>
        body { font-family: sans-serif; background: #f4f7f9; padding: 40px; }
        .container { max-width: 600px; margin: auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .item { border-bottom: 1px solid #eee; padding: 10px 0; }
        .btn-back { display: inline-block; margin-bottom: 20px; color: #555; text-decoration: none; }
    </style>
</head>
<body>

<div class="container">
    <a href="/inicio/index.php" class="btn-back">← Volver al inicio</a>
    <h1>Mis Observaciones</h1>

    <?php
    if (empty($results) || !isset($results[0]['document'])) {
        echo "<p>No tienes observaciones registradas o no hay notas positivas.</p>";
    } else {
        foreach ($results as $row) {
            if (!isset($row['document'])) continue;
            $fields = $row['document']['fields'];
            echo "<div class='item'>";
            echo "<strong>Tipo:</strong> " . $fields['tipo']['stringValue'] . "<br>";
            echo "<strong>Nota:</strong> " . $fields['nota']['integerValue'] . "<br>";
            echo "<strong>Fecha:</strong> " . date("d/m/Y", strtotime($fields['fechaRegistro']['timestampValue'])) . "<br>";
            echo "</div>";
        }
    }
    ?>
</div>

</body>
</html>
