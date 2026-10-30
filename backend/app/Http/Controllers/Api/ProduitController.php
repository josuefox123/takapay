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
            Produit::with(['sousCategorie.categorie', 'parametreProduit.promotion', 'imageProduits'])
                ->withCount(['cagnottes as cagnottes_actives_count' => function ($query) {
                    $query->whereIn('statut', ['en_cours', 'active']);
                }])
                ->latest()
                ->paginate(25)
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

        $deletedImagePaths = [];

        DB::transaction(function () use ($produit, $validated, &$deletedImagePaths) {
$produitFields = ['nom', 'sous_categorie_id', 'description', 'stock', 'duree', 'couleur', 'video'];
            $produitData = array_intersect_key($validated, array_flip($produitFields));
            if (!empty($produitData)) {
                if (!empty($produitData['video']) && is_array($produitData['video'])) {
                    $produitData['video'] = $produitData['video']['chemin'] ?? null;
                }
                if (!empty($produitData['video']) && is_string($produitData['video'])) {
                    if (str_starts_with($produitData['video'], 'blob:')) {
                        unset($produitData['video']);
                    } elseif (str_starts_with($produitData['video'], 'data:video/')) {
                        $comma = strpos($produitData['video'], ',');
                        $header = substr($produitData['video'], 0, $comma);
                        $binary = base64_decode(substr($produitData['video'], $comma + 1), true);
                        if ($binary !== false) {
                            $ext = 'mp4';
                            if (preg_match('#data:video/(webm|ogg|quicktime|mp4)#i', $header, $m)) {
                                $ext = $m[1] === 'quicktime' ? 'mov' : $m[1];
                            }
                            $videoFileName = 'video_'.time().'_'.\Illuminate\Support\Str::random(6).'.'.$ext;
                            Storage::disk('public')->put('produits/'.$videoFileName, $binary);
                            Storage::disk('public')->put($videoFileName, $binary);
                            $produitData['video'] = 'produits/'.$videoFileName;
                        }
                    }
                }
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

            if (array_key_exists('images', $validated) && is_array($validated['images'])) {
                $imagesService = app(ImageStorageService::class);
                $existingImages = $produit->imageProduits()->get()->keyBy('id');
                $keptImageIds = [];

                foreach ($validated['images'] as $idx => $img) {
                    if (!is_array($img)) {
                        continue;
                    }

                    $position = isset($img['position']) ? (int) $img['position'] : ($idx + 1);
                    $isPrincipal = filter_var($img['is_principal'] ?? false, FILTER_VALIDATE_BOOLEAN);
                    $chemin = $img['chemin'] ?? null;
                    $existingImage = !empty($img['id']) ? $existingImages->get((int) $img['id']) : null;
                    $isDataImage = is_string($chemin) && preg_match('#^data:(?:image/|application/octet-stream)#i', $chemin);

                    if ($existingImage) {
                        $attributes = [
                            'position' => $position,
                            'is_principal' => $isPrincipal,
                        ];

                        if ($isDataImage) {
                            $savedPath = $imagesService->process(
                                $chemin,
                                'produits',
                                null,
                                "images.{$idx}.chemin"
                            );
                            if ($savedPath && $savedPath !== $existingImage->chemin) {
                                $deletedImagePaths[] = $existingImage->chemin;
                                $attributes['chemin'] = $savedPath;
                            }
                        }

                        $existingImage->update($attributes);
                        $keptImageIds[] = $existingImage->id;
                        continue;
                    }

                    if (is_string($chemin) && trim($chemin) !== '') {
                        $savedPath = $imagesService->process(
                            $chemin,
                            'produits',
                            null,
                            "images.{$idx}.chemin"
                        );
                        if ($savedPath) {
                            $newImage = ImageProduit::create([
                                'produit_id' => $produit->id,
                                'chemin' => $savedPath,
                                'position' => $position,
                                'is_principal' => $isPrincipal,
                            ]);
                            $keptImageIds[] = $newImage->id;
                        }
                    }
                }

                foreach ($existingImages as $existingImage) {
                    if (!in_array($existingImage->id, $keptImageIds, true)) {
                        $deletedImagePaths[] = $existingImage->chemin;
                        $existingImage->delete();
                    }
                }

                $remainingImages = $produit->imageProduits()->orderBy('position')->orderBy('id')->get();
                if ($remainingImages->isNotEmpty()) {
                    $principalId = $remainingImages->firstWhere('is_principal', true)?->id
                        ?? $remainingImages->first()->id;
                    foreach ($remainingImages as $remainingImage) {
                        $shouldBePrincipal = $remainingImage->id === $principalId;
                        if ($remainingImage->is_principal !== $shouldBePrincipal) {
                            $remainingImage->update(['is_principal' => $shouldBePrincipal]);
                        }
                    }
                }
            }
        });

        foreach (array_unique(array_filter($deletedImagePaths)) as $deletedPath) {
            $legacyFilename = basename(str_replace('\\', '/', $deletedPath));
            $stillUsed = ImageProduit::where('chemin', $deletedPath)
                ->orWhere('chemin', $legacyFilename)
                ->exists();

            if (!$stillUsed) {
                app(ImageStorageService::class)->delete($deletedPath);
            }
        }

        return new ProduitResource($produit->fresh(['sousCategorie.categorie', 'parametreProduit.promotion', 'imageProduits']));
    }

    /**
     * Supprimer un produit : base d'abord, fichiers ensuite.
     */
    public function destroy(Produit $produit): JsonResponse
    {
        $activeCagnottesCount = $produit->cagnottes()
            ->whereIn('statut', ['en_cours', 'active'])
            ->count();

        if ($activeCagnottesCount > 0) {
            return response()->json([
                'message' => 'Impossible de supprimer ce produit car une ou plusieurs cagnottes sont actuellement en cours chez un utilisateur.',
                'has_active_cagnotte' => true,
                'cagnottes_actives_count' => $activeCagnottesCount,
            ], 422);
        }

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
