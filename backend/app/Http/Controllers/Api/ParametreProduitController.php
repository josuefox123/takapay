<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ParametreProduit;
use Illuminate\Http\Request;
use App\Http\Requests\StoreParametreProduitRequest;
use App\Http\Requests\UpdateParametreProduitRequest;
use App\Http\Resources\ParametreProduitResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ParametreProduitController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): AnonymousResourceCollection
    {

        return ParametreProduitResource::collection(ParametreProduit::latest()->paginate(15));
    }

    /**
     * Store a newly created resource in storage.
     */
   public function store(StoreParametreProduitRequest $request): ParametreProduitResource
    {
        $parametre_produit = ParametreProduit::create( $request->validated());

        return new ParametreProduitResource($parametre_produit);
    }

    /**
     * Display the specified resource.
     */
    public function show(ParametreProduit $parametre_produit)
    {
        return new ParametreProduitResource($parametre_produit);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateParametreProduitRequest $request, ParametreProduit $parametre_produit)
    {
        $parametre_produit->update($request->validated());

        return new ParametreProduitResource($parametre_produit);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(ParametreProduit $parametre_produit):JsonResponse
    {
        $parametre_produit->delete();

        return response()->json(['message' => 'ParametreProduit supprimé avec succès']);
    }
}
