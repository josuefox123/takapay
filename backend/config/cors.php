<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Configure les autorisations d'accès cross-origin pour le frontend SPA.
    | Autorise automatiquement les environnements de développement locaux
    | et se configure via CORS_ALLOWED_ORIGINS dans le fichier .env en production.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_filter(array_map('trim', explode(',', env('CORS_ALLOWED_ORIGINS', ''))))),

    'allowed_origins_patterns' => [
        // Environnements de développement et tests locaux sur tout port (5173, 3000, etc.)
        '#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#',
        // Réseaux locaux privés pour tests sur téléphone en Wi-Fi (192.168.x.x, 10.x.x.x)
        '#^https?://(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => ['Retry-After'],

    'max_age' => 86400,

    'supports_credentials' => true,

];
