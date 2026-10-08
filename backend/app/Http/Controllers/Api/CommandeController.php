<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCommandeRequest;
use App\Http\Requests\UpdateCommandeRequest;
use App\Http\Resources\CommandeResource;
use App\Models\Commande;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CommandeController extends Controller
{
    /**
     * Liste paginée des commandes.
     */
    public function index(): AnonymousResourceCollection
    {
        return CommandeResource::collection(Commande::latest()->paginate(15));
    }

    /**
     * Créer une commande.
     */
    public function store(StoreCommandeRequest $request): JsonResponse
    {
        $commande = Commande::create($request->validated());

        return (new CommandeResource($commande))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Afficher une commande.
     */
    public function show(Commande $commande): CommandeResource
    {
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
    public function destroy(Commande $commande): JsonResponse
    {
        $commande->delete();

        return response()->json([
            'message' => 'Commande supprimée avec succès.'
        ]);
    }
}
