<?php

namespace App\Http\Controllers;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

abstract class Controller
{
    /**
     * Vérifie que l'utilisateur est propriétaire de la ressource ou administrateur.
     */
    protected function authorizeOwnerOrAdmin(Request $request, Model $model, string $column = 'utilisateur_id'): void
    {
        $user = $request->user();

        if (! $user) {
            abort(401, 'Non authentifié.');
        }

        if ($user->isAdmin()) {
            return;
        }

        abort_unless((int) $model->{$column} === (int) $user->id, 403, 'Accès refusé.');
    }
}
