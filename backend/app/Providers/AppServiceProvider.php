<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('api', function (Request $request) {
            $user = $request->user('sanctum') ?? $request->user();
            $principal = $user
                ? 'user:'.$user->getKey()
                : 'ip:'.($request->ip() ?: 'unknown');

            $input = $request->all();
            ksort($input);

            $fingerprint = 'api-identical:'.hash(
                'sha256',
                $principal
                .'|'.$request->method()
                .'|'.trim($request->path(), '/')
                .'|'.json_encode($input)
                .'|'.$request->getContent()
            );

            // Pour les requêtes de consultation GET (lecture seule, actualisations, polling, navigation),
            // appliquer un quota fluide de 120 requêtes par minute par utilisateur/IP.
            if ($request->isMethod('GET')) {
                return Limit::perMinute(120)->by($principal);
            }

            // Toute mutation (POST, PUT, DELETE, PATCH) identique envoyée une 10e fois dans la même minute est refusée
            return Limit::perMinute(9)->by($fingerprint)->response(function (Request $request, array $headers) {
                return response()->json([
                    'message' => 'Trop de requêtes identiques envoyées en moins d’une minute. Veuillez patienter avant de réessayer.',
                ], 429, $headers);
            });
        });
    }
}
