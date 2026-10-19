<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCommandeRequest;
use App\Http\Requests\UpdateCommandeRequest;
use App\Http\Resources\CommandeResource;
use App\Models\Commande;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class CommandeController extends Controller
{
    /**
     * Liste paginée des commandes : les siennes, ou toutes pour un administrateur.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();

        $query = $user->isAdmin()
            ? Commande::query()
            : Commande::where('utilisateur_id', $user->id);

        return CommandeResource::collection($query->latest()->paginate(15));
    }

    /**
     * Créer une commande (le total reste à 0 tant qu'aucune ligne n'est ajoutée).
     */
    public function store(StoreCommandeRequest $request): JsonResponse
    {
        $data = $request->validated();

        // Le propriétaire est toujours dérivé du jeton d'authentification
        $data['utilisateur_id'] ??= $request->user()->id;
        // Total initial : recalculé par le serveur à chaque ligne ajoutée
        $data['prix_total'] ??= 0;

        $commande = Commande::create($data);

        return (new CommandeResource($commande))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Afficher une commande.
     */
    public function show(Request $request, Commande $commande): CommandeResource
    {
        $this->authorizeOwnerOrAdmin($request, $commande);

        return new CommandeResource($commande);
    }

    /**
     * Modifier une commande.
     */
    public function update(
        UpdateCommandeRequest $request,
        Commande $commande
    ): CommandeResource {
        $commande->update($request->validated());

        return new CommandeResource($commande);
    }

    /**
     * Supprimer une commande.
     */
    public function destroy(Request $request, Commande $commande): JsonResponse
    {
        $this->authorizeOwnerOrAdmin($request, $commande);

        DB::transaction(function () use ($commande) {
            $commande->commandeProduits()->delete();
            $commande->delete();
        });

        return response()->json([
            'message' => 'Commande supprimée avec succès.',
        ]);
    }
}
