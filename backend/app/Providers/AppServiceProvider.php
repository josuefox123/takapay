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

            // Autoriser le polling automatique en arrière-plan du chat support ouvert (toutes les 2,5s à 4s)
            if ($request->isMethod('GET') && ($request->is('api/support/messages') || $request->is('api/admin/support/*'))) {
                return Limit::perMinute(35)->by($fingerprint);
            }

            // Toute requête identique envoyée une 10e fois dans la même minute est refusée (max 9 autorisées/min)
            return Limit::perMinute(9)->by($fingerprint)->response(function (Request $request, array $headers) {
                return response()->json([
                    'message' => 'Trop de requêtes identiques envoyées en moins d’une minute. Veuillez patienter avant de réessayer.',
                ], 429, $headers);
            });
        });
    }
}
