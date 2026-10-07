<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCommandeProduitRequest;
use App\Http\Requests\UpdateCommandeProduitRequest;
use App\Http\Resources\CommandeProduitResource;
use App\Models\CommandeProduit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CommandeProduitController extends Controller
{
    /**
     * Liste paginée des produits de commande.
     */
    public function index(): AnonymousResourceCollection
    {
        return CommandeProduitResource::collection(
            CommandeProduit::latest()->paginate(15)
        );
    }

    /**
     * Ajouter un produit à une commande.
     */
    public function store(StoreCommandeProduitRequest $request): JsonResponse
    {
        $commandeProduit = CommandeProduit::create($request->validated());

        return (new CommandeProduitResource($commandeProduit))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Afficher un produit de commande.
     */
    public function show(CommandeProduit $commandeProduit): CommandeProduitResource
    {
        return new CommandeProduitResource($commandeProduit);
    }

    /**
     * Modifier un produit de commande.
     */
    public function update(
        UpdateCommandeProduitRequest $request,
        CommandeProduit $commandeProduit
    ): CommandeProduitResource {
        $commandeProduit->update($request->validated());

        return new CommandeProduitResource($commandeProduit);
    }

    /**
     * Supprimer un produit de commande.
     */
    public function destroy(CommandeProduit $commandeProduit): JsonResponse
    {
        $commandeProduit->delete();

        return response()->json([
            'message' => 'Produit de commande supprimé avec succès.'
        ]);
    }
}
