<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreImageProduitRequest;
use App\Http\Requests\UpdateImageProduitRequest;
use App\Models\ImageProduit;
use Illuminate\Http\Request;
use App\Http\Resources\ImageProduitResource;

class ImageProduitController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
 return ImageProduitResource::collection(
            ImageProduit::latest()->paginate(15)
        );    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreImageProduitRequest $request)
    {
       $image_produit = ImageProduit::create($request->validated());

        return new ImageProduitResource($image_produit);
        
    }

    /**
     * Display the specified resource.
     */
    public function show(ImageProduit $image_produit)
    {
        return new ImageProduitResource($image_produit);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateImageProduitRequest $request, ImageProduit $image_produit)
    {
        $image_produit->update($request->validated());

        return new ImageProduitResource($image_produit);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(ImageProduit $image_produit)
    {
        $image_produit->delete();
        return response()->json(['message' => 'Image du produit supprimée avec succès.']);
    }
}
