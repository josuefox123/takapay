<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SousCategorie;
use Illuminate\Http\Request;
use App\Http\Resources\SousCategorieResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use App\Http\Requests\StoreSousCategorieRequest;
use App\Http\Requests\UpdateSousCategorieRequest;
use App\Http\Resources\ProduitResource;

class SousCategorieController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index() : AnonymousResourceCollection
    {
        return SousCategorieResource::collection(SousCategorie::latest()->paginate(15));
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
     * Remove the specified resource from storage.
     */
    public function destroy(SousCategorie $sous_category)
    {
        $sous_category->delete();
        return response()->json(['message' => 'Sous-catégorie supprimée avec succès.']);
    }

     public function produits(SousCategorie $sous_category): AnonymousResourceCollection
{
    return ProduitResource::collection(
        $sous_category->produits()->latest()->paginate(15)
    );
}
}