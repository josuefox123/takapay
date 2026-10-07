<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProduitRequest;
use App\Models\Produit;
use App\Http\Requests\UpdateProduitRequest;
use App\Http\Resources\ProduitResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProduitController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index():AnonymousResourceCollection
    {
   return ProduitResource::collection(
        Produit::latest()->paginate(15)
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
        return new ProduitResource($produit);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateProduitRequest $request, Produit $produit)
    {
        $produit->update($request->validated());

        return new ProduitResource($produit);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Produit $produit) : JsonResponse
    {
        $produit->delete();

        return response()->json(['message' => 'Produit supprimé avec succès']);
    }
}
