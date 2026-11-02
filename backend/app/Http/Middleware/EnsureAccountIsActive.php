<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountIsActive
{
    /**
     * Refuse toute requête dont le compte n'est plus actif,
     * même si un jeton a été émis avant la suspension.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->statut_compte !== 'actif') {
            return response()->json([
                'message' => 'Votre compte est suspendu ou inactif.',
            ], 403);
        }

        return $next($request);
    }
}
