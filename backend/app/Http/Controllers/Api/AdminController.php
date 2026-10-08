<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Resources\DocumentResource;
use App\Http\Resources\LivreurResource;
use App\Http\Resources\UserResource;
use App\Models\Document;
use App\Models\Livreur;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    /**
     * Créer un compte administrateur ou livreur (Réservé Super Admin)
     */
    public function createAdminUser(StoreUserRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['statut_compte'] = 'actif';

        $user = User::create($data);

        return (new UserResource($user))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Modifier le statut d'un compte utilisateur (actif, inactif, suspendu)
     */
    public function updateUserStatus(Request $request, User $user): JsonResponse
    {
        $request->validate([
            'statut_compte' => ['required', 'string', 'in:actif,inactif,suspendu'],
        ]);

        $user->update([
            'statut_compte' => $request->statut_compte,
        ]);

        return response()->json([
            'message' => 'Statut du compte mis à jour avec succès.',
            'user' => new UserResource($user),
        ]);
    }

    /**
     * Valider ou refuser un document KYC
     */
    public function verifyDocument(Request $request, Document $document): JsonResponse
    {
        $request->validate([
            'statut' => ['required', 'string', 'in:valide,refuse,en_attente'],
            'motif' => ['nullable', 'string', 'max:500'],
        ]);

        $document->update([
            'statut' => $request->statut,
            'motif' => $request->motif,
            'verifier_par' => $request->user()->id,
            'date_modification' => now(),
        ]);

        return response()->json([
            'message' => 'Statut du document mis à jour.',
            'document' => new DocumentResource($document),
        ]);
    }

    /**
     * Modifier le statut d'un livreur (actif, inactif, en_livraison)
     */
    public function updateLivreurStatus(Request $request, Livreur $livreur): JsonResponse
    {
        $request->validate([
            'statut' => ['required', 'string', 'in:actif,inactif,en_livraison'],
        ]);

        $livreur->update([
            'statut' => $request->statut,
        ]);

        return response()->json([
            'message' => 'Statut du livreur mis à jour.',
            'livreur' => new LivreurResource($livreur),
        ]);
    }
}
