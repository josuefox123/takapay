<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSousCategorieRequest;
use App\Http\Requests\UpdateSousCategorieRequest;
use App\Http\Resources\ProduitResource;
use App\Http\Resources\SousCategorieResource;
use App\Models\SousCategorie;
use App\Services\ImageStorageService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SousCategorieController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): AnonymousResourceCollection
    {
        return SousCategorieResource::collection(SousCategorie::with('categorie')->orderBy('nom', 'asc')->get());
    }

    //

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreSousCategorieRequest $request)
    {
        $sous_category = SousCategorie::create($request->validated());

        return new SousCategorieResource($sous_category);
    }

    /**
     * Display the specified resource.
     */
    public function show(SousCategorie $sous_category)
    {
        return new SousCategorieResource($sous_category);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateSousCategorieRequest $request, SousCategorie $sous_category)
    {
        $sous_category->update($request->validated());

        return new SousCategorieResource($sous_category);
    }

    /**
     * Supprimer une sous-catégorie (cascade SQL) et les fichiers images associés.
     */
    public function destroy(SousCategorie $sous_category)
    {
        $fichiers = $sous_category->produits()
            ->with('imageProduits')
            ->get()
            ->flatMap->imageProduits
            ->pluck('chemin');

        $sous_category->delete();

        $images = app(ImageStorageService::class);
        foreach ($fichiers as $chemin) {
            $images->delete($chemin);
        }

        return response()->json(['message' => 'Sous-catégorie supprimée avec succès.']);
    }

    public function produits(SousCategorie $sous_category): AnonymousResourceCollection
    {
        return ProduitResource::collection(
            $sous_category->produits()->latest()->paginate(15)
        );
    }
}
