<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLivraisonRequest;
use App\Http\Requests\UpdateLivraisonRequest;
use App\Http\Resources\LivraisonResource;
use App\Models\Livraison;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class LivraisonController extends Controller
{
    /**
     * Liste paginée des livraisons.
     */
    public function index(): AnonymousResourceCollection
    {
        return LivraisonResource::collection(Livraison::latest()->paginate(15));
    }

    /**
     * Créer une livraison.
     */
    public function store(StoreLivraisonRequest $request): JsonResponse
    {
        $livraison = Livraison::create($request->validated());

        return (new LivraisonResource($livraison))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Afficher une livraison.
     */
    public function show(Livraison $livraison): LivraisonResource
    {
        return new LivraisonResource($livraison);
    }

    /**
     * Modifier une livraison.
     */
    public function update(
        UpdateLivraisonRequest $request,
        Livraison $livraison
    ): LivraisonResource {
        $livraison->update($request->validated());

        return new LivraisonResource($livraison);
    }

    /**
     * Supprimer une livraison.
     */
    public function destroy(Livraison $livraison): JsonResponse
    {
        $livraison->delete();

        return response()->json([
            'message' => 'Livraison supprimée avec succès.'
        ]);
    }
}
