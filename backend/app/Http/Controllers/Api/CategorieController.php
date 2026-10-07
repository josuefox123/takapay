<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Categorie;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use App\Http\Resources\CategorieResource;
use App\Http\Resources\SousCategorieResource;
use App\Http\Requests\StoreCategorieRequest;
use App\Http\Requests\UpdateCategorieRequest;
use Illuminate\Http\JsonResponse;

class CategorieController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index():AnonymousResourceCollection
    {
        return CategorieResource::collection(Categorie::latest()->paginate(15));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreCategorieRequest $request)
    {
        $category = Categorie::create($request->validated());

        return (new CategorieResource($category))
            ->response()
            ->setStatusCode(201);

    }

    /**
     * Display the specified resource.
     */
    public function show(Categorie $category)
    {
         return new CategorieResource($category);
    }

    /**
     * Update the specified resource in storage.
     */
 public function update(UpdateCategorieRequest $request,Categorie $category): CategorieResource
  {
        $category->update($request->validated());

        return new CategorieResource($category);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Categorie $category): JsonResponse
    {
        $category->delete();

        return response()->json(['message' => 'Catégorie supprimée avec succès.']);
    }
    public function sousCategories(Categorie $category): AnonymousResourceCollection
{
    return SousCategorieResource::collection(
        $category->sousCategories()->get()
    );
}
}
