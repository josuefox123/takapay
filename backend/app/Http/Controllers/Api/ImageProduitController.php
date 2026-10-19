<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreImageProduitRequest;
use App\Http\Requests\UpdateImageProduitRequest;
use App\Http\Resources\ImageProduitResource;
use App\Models\ImageProduit;
use App\Services\ImageStorageService;

class ImageProduitController extends Controller
{
    public function __construct(private readonly ImageStorageService $images) {}

    /**
     * Liste paginée des images de produit.
     */
    public function index()
    {
        return ImageProduitResource::collection(
            ImageProduit::latest()->paginate(15)
        );
    }

    /**
     * Enregistrer une image de produit.
     */
    public function store(StoreImageProduitRequest $request)
    {
        $data = $request->validated();
        $preferredName = $request->input('nom_fichier') ?? ($request->file('chemin')?->getClientOriginalName()) ?? null;

        $data['chemin'] = $this->images->process($data['chemin'], 'produits', null, 'chemin', $preferredName);

        $imageProduit = ImageProduit::create($data);

        return (new ImageProduitResource($imageProduit))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Afficher une image de produit.
     */
    public function show(ImageProduit $image_produit)
    {
        return new ImageProduitResource($image_produit);
    }

    /**
     * Modifier une image de produit.
     */
    public function update(UpdateImageProduitRequest $request, ImageProduit $image_produit)
    {
        $data = $request->validated();

        $oldPath = null;

        if (array_key_exists('chemin', $data)) {
            if ($data['chemin'] === null || $data['chemin'] === '') {
                $oldPath = $image_produit->chemin;
                $data['chemin'] = null;
            } else {
                $preferredName = $request->input('nom_fichier') ?? ($request->file('chemin')?->getClientOriginalName()) ?? null;
                $newPath = $this->images->process($data['chemin'], 'produits', $image_produit->chemin, 'chemin', $preferredName);

                if ($newPath !== $image_produit->chemin) {
                    $oldPath = $image_produit->chemin;
                    $data['chemin'] = $newPath;
                } else {
                    unset($data['chemin']);
                }
            }
        }

        $image_produit->update($data);

        if ($oldPath !== null) {
            $this->images->delete($oldPath);
        }

        return new ImageProduitResource($image_produit->fresh());
    }

    /**
     * Supprimer une image de produit.
     */
    public function destroy(ImageProduit $image_produit)
    {
        $chemin = $image_produit->chemin;

        $image_produit->delete();

        $this->images->delete($chemin);

        return response()->json(['message' => 'Image du produit supprimée avec succès.']);
    }
}
