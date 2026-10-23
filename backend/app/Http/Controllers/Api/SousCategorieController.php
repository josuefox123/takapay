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
    public function __construct(private readonly ImageStorageService $images) {}

    public function index(): AnonymousResourceCollection
    {
        return SousCategorieResource::collection(SousCategorie::with('categorie')->orderBy('nom', 'asc')->get());
    }

    public function store(StoreSousCategorieRequest $request)
    {
        $data = $request->validated();
        if ($request->filled('image') || $request->hasFile('image')) {
            $preferredName = $request->input('nom_fichier') ?? ($request->file('image')?->getClientOriginalName()) ?? null;
            $data['image'] = $this->images->process($data['image'] ?? $request->file('image'), 'sous_categories', null, 'image', $preferredName);
        }

        $sous_category = SousCategorie::create($data);

        return (new SousCategorieResource($sous_category))
            ->response()
            ->setStatusCode(201);
    }

    public function show(SousCategorie $sous_category)
    {
        return new SousCategorieResource($sous_category);
    }

    public function update(UpdateSousCategorieRequest $request, SousCategorie $sous_category)
    {
        $data = $request->validated();
        if (array_key_exists('image', $data)) {
            if ($data['image'] === null || $data['image'] === '') {
                $this->images->delete($sous_category->image);
                $data['image'] = null;
            } else {
                $preferredName = $request->input('nom_fichier') ?? ($request->file('image')?->getClientOriginalName()) ?? null;
                $data['image'] = $this->images->process($data['image'], 'sous_categories', $sous_category->image, 'image', $preferredName);
            }
        }

        $sous_category->update($data);

        return new SousCategorieResource($sous_category->fresh());
    }

    public function destroy(SousCategorie $sous_category)
    {
        $fichiers = $sous_category->produits()
            ->with('imageProduits')
            ->get()
            ->flatMap->imageProduits
            ->pluck('chemin');

        if ($sous_category->image) {
            $this->images->delete($sous_category->image);
        }

        $sous_category->delete();

        foreach ($fichiers as $chemin) {
            $this->images->delete($chemin);
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
