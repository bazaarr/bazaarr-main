<?php
$mobile_url = 'http://m.bazaarr.dev';

if (defined('PANTHEON_ENVIRONMENT')) {
    switch (PANTHEON_ENVIRONMENT) {
        case 'dev':
            $mobile_url = 'https://m.bazaarr.org';
        break;
        case 'test':
            $mobile_url = 'https://m.bazaarr.net';
        break;
        case 'live':
            $mobile_url = 'https://m.bazaarr.com';
        break;
    }
}

if(substr($_SERVER['HTTP_HOST'], 0, 1) != 'm'){
    $uri = explode('/', $_SERVER['REQUEST_URI']);
    if(!in_array($uri[1], array("services", "api", "sites"))){
        header('HTTP/1.0 301 Moved Permanently');
        header('Location: ' . $mobile_url . '/m/');
        exit();
    }
}
if (isset($_GET["_escaped_fragment_"])) {
    $headers = array('X-Prerender-Token: ShhIFO2QwS05lmWiCLAh');
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://service.prerender.io/https%3A%2F%2F" . $_SERVER["HTTP_HOST"] . "%2Fm%2F%23!" . $_GET["_escaped_fragment_"]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    $output = curl_exec($ch);
    curl_close($ch);
    echo $output;
    exit();
}
include 'index.html';
?>
