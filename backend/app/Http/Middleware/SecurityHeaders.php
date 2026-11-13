<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    /**
     * En-têtes de sécurité HTTP stricts pour la défense en profondeur (anti-XSS, anti-clickjacking, CSP).
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // 1. Anti-clickjacking (empêche l'inclusion du site dans des iframes tierces)
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');

        // 2. Anti-MIME-sniffing
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        // 3. Politique de référent (protège la fuite d'URL complètes)
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        // 4. Protection XSS historique pour navigateurs compatibles
        $response->headers->set('X-XSS-Protection', '1; mode=block');

        // 5. Restriction des fonctionnalités matérielles sensibles
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');

        // 6. HSTS (Strict-Transport-Security) en HTTPS ou production
        if ($request->isSecure() || app()->environment('production')) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        }

        // 7. Content-Security-Policy (CSP) stricte adaptée à React, Google Auth et FeexPay
        $cspDirectives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://api.feexpay.me https://api-v2.feexpay.me",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com data:",
            "img-src 'self' data: blob: https: http:",
            "media-src 'self' data: blob: https: http:",
            "connect-src 'self' https://accounts.google.com https://api.feexpay.me https://api-v2.feexpay.me https://sandbox-api.feexpay.me wss: https:",
            "frame-src 'self' https://accounts.google.com https://api.feexpay.me https://api-v2.feexpay.me",
            "frame-ancestors 'self'",
            "form-action 'self'",
            "base-uri 'self'",
        ];

        $response->headers->set('Content-Security-Policy', implode('; ', $cspDirectives));

        return $response;
    }
}
