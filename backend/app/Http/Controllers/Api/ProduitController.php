<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProduitRequest;
use App\Http\Requests\UpdateProduitRequest;
use App\Http\Resources\ProduitResource;
use App\Models\Produit;
use App\Services\ImageStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ProduitController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): AnonymousResourceCollection
    {
        return ProduitResource::collection(
            Produit::with(['sousCategorie.categorie', 'parametreProduit.promotion', 'imageProduits'])->latest()->paginate(25)
        );
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreProduitRequest $request)
    {
        $produit = Produit::create($request->validated());

        return (new ProduitResource($produit))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Produit $produit)
    {
        return new ProduitResource($produit->load(['sousCategorie.categorie', 'parametreProduit.promotion', 'imageProduits']));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateProduitRequest $request, Produit $produit)
    {
        $produit->update($request->validated());

        return new ProduitResource($produit->load(['sousCategorie.categorie', 'parametreProduit.promotion', 'imageProduits']));
    }

    /**
     * Supprimer un produit : base d'abord, fichiers ensuite.
     */
    public function destroy(Produit $produit): JsonResponse
    {
        $chemins = $produit->imageProduits()->pluck('chemin');

        DB::transaction(function () use ($produit) {
            $produit->imageProduits()->delete();
            $produit->parametreProduit()->delete();
            $produit->delete();
        });

        $images = app(ImageStorageService::class);
        foreach ($chemins as $chemin) {
            $images->delete($chemin);
        }

        return response()->json(['message' => 'Produit supprimé avec succès']);
    }
}
