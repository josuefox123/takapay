<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProduitRequest;
use App\Http\Requests\UpdateProduitRequest;
use App\Http\Resources\ProduitResource;
use App\Models\ImageProduit;
use App\Models\ParametreProduit;
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
        $validated = $request->validated();

        DB::transaction(function () use ($produit, $validated) {
            $produitFields = ['nom', 'sous_categorie_id', 'description', 'stock', 'duree', 'couleur'];
            $produitData = array_intersect_key($validated, array_flip($produitFields));
            if (!empty($produitData)) {
                $produit->update($produitData);
            }

            $paramFields = [
                'reference', 'prix_total', 'prix_minimum', 'prix_echelonne',
                'prix_cash', 'mode_paiement', 'frequence', 'seuil_livraison', 'promotion_id'
            ];
            $paramData = array_intersect_key($validated, array_flip($paramFields));

            if (!empty($paramData)) {
                if ($produit->parametreProduit) {
                    $produit->parametreProduit->update($paramData);
                } else {
                    $paramData['produit_id'] = $produit->id;
                    if (empty($paramData['reference'])) {
                        $paramData['reference'] = 'PRD-' . str_pad($produit->id, 4, '0', STR_PAD_LEFT);
                    }
                    if (!isset($paramData['prix_total'])) {
                        $paramData['prix_total'] = 0;
                    }
                    ParametreProduit::create($paramData);
                }
            }

            if (isset($validated['images']) && is_array($validated['images'])) {
                $imagesService = app(ImageStorageService::class);
                foreach ($validated['images'] as $idx => $img) {
                    if (is_array($img) && !empty($img['chemin']) && str_starts_with($img['chemin'], 'data:image')) {
                        $preferredName = $img['nom_fichier'] ?? $img['nom'] ?? null;
                        $savedPath = $imagesService->process($img['chemin'], 'produits', null, "images.{$idx}.chemin", $preferredName);
                        if ($savedPath) {
                            ImageProduit::create([
                                'produit_id' => $produit->id,
                                'chemin' => $savedPath,
                                'position' => isset($img['position']) ? (int) $img['position'] : ($idx + 1),
                                'is_principal' => !empty($img['is_principal']),
                            ]);
                        }
                    }
                }
            }
        });

        return new ProduitResource($produit->fresh(['sousCategorie.categorie', 'parametreProduit.promotion', 'imageProduits']));
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
