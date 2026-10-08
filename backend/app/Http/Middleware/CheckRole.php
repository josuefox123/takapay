<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Non authentifié.'], 401);
        }

        // Le Super Admin a accès à toutes les fonctionnalités d'administration
        if ($user->role === 'super_admin') {
            return $next($request);
        }

        // Vérification si l'utilisateur possède l'un des rôles requis
        if (!in_array($user->role, $roles, true)) {
            return response()->json([
                'message' => 'Accès refusé. Vous n\'avez pas les autorisations nécessaires.',
            ], 403);
        }

        return $next($request);
    }
}
