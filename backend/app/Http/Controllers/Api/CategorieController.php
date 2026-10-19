<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCategorieRequest;
use App\Http\Requests\UpdateCategorieRequest;
use App\Http\Resources\CategorieResource;
use App\Http\Resources\SousCategorieResource;
use App\Models\Categorie;
use App\Models\ImageProduit;
use App\Models\Produit;
use App\Services\ImageStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class CategorieController extends Controller
{
    public function __construct(private readonly ImageStorageService $images) {}

    /**
     * Liste des catégories (publique).
     */
    public function index(): AnonymousResourceCollection
    {
        return CategorieResource::collection(Categorie::with('sousCategories')->orderBy('nom', 'asc')->get());
    }

    /**
     * Créer une catégorie.
     */
    public function store(StoreCategorieRequest $request)
    {
        $data = $request->validated();
        $preferredName = $request->input('nom_fichier') ?? ($request->file('image')?->getClientOriginalName()) ?? null;

        $data['image'] = $this->images->process($data['image'] ?? null, 'categories', null, 'image', $preferredName);

        $category = Categorie::create($data);

        return (new CategorieResource($category))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Afficher une catégorie.
     */
    public function show(Categorie $category)
    {
        return new CategorieResource($category);
    }

    /**
     * Modifier une catégorie.
     * L'ancien fichier n'est supprimé qu'après la mise à jour en base.
     */
    public function update(UpdateCategorieRequest $request, Categorie $category): CategorieResource
    {
        $data = $request->validated();

        $oldPath = null;

        if (array_key_exists('image', $data)) {
            if ($data['image'] === null || $data['image'] === '') {
                $oldPath = $category->image;
                $data['image'] = null;
            } else {
                $preferredName = $request->input('nom_fichier') ?? ($request->file('image')?->getClientOriginalName()) ?? null;
                $newPath = $this->images->process($data['image'], 'categories', $category->image, 'image', $preferredName);

                if ($newPath !== $category->image) {
                    $oldPath = $category->image;
                    $data['image'] = $newPath;
                } else {
                    unset($data['image']);
                }
            }
        }

        $category->update($data);

        if ($oldPath !== null) {
            $this->images->delete($oldPath);
        }

        return new CategorieResource($category->fresh());
    }

    /**
     * Supprimer une catégorie et, par cascade, ses sous-catégories,
     * produits et images — physiquement inclus.
     */
    public function destroy(Categorie $category): JsonResponse
    {
        // Collecte des fichiers avant la cascade SQL
        $filesToDelete = collect($category->image ? [$category->image] : []);

        $produitIds = Produit::whereHas('sousCategorie', fn ($q) => $q->where('categorie_id', $category->id))
            ->pluck('id');

        $filesToDelete = $filesToDelete->merge(
            ImageProduit::whereIn('produit_id', $produitIds)->pluck('chemin')
        );

        DB::transaction(function () use ($category) {
            $category->delete();
        });

        foreach ($filesToDelete as $file) {
            $this->images->delete($file);
        }

        return response()->json(['message' => 'Catégorie supprimée avec succès.']);
    }

    public function sousCategories(Categorie $category): AnonymousResourceCollection
    {
        return SousCategorieResource::collection(
            $category->sousCategories()->get()
        );
    }
}
