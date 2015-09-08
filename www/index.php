<?php      
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
