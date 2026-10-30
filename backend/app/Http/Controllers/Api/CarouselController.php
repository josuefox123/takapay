<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CarouselResource;
use App\Models\Carousel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;

class CarouselController extends Controller
{
    /**
     * Liste publique des bannières actives pour le carrousel client.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $carousels = Carousel::with('produit')
            ->where('is_actif', true)
            ->orderBy('ordre', 'asc')
            ->orderBy('id', 'desc')
            ->get();

        return CarouselResource::collection($carousels);
    }

    /**
     * Liste complète pour l'administration (avec bannières masquées/inactives).
     */
    public function adminIndex(Request $request): AnonymousResourceCollection
    {
        $carousels = Carousel::with('produit')
            ->orderBy('ordre', 'asc')
            ->orderBy('id', 'desc')
            ->get();

        return CarouselResource::collection($carousels);
    }

    /**
     * Créer une nouvelle bannière carrousel.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'titre' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'kicker' => ['nullable', 'string', 'max:100'],
            'image' => ['required', 'file', 'image', 'mimes:jpeg,png,jpg,webp,gif', 'max:10240'],
            'texte_bouton' => ['nullable', 'string', 'max:100'],
            'lien' => ['nullable', 'string', 'max:255'],
            'produit_id' => ['nullable', 'integer', 'exists:produits,id'],
            'ordre' => ['nullable', 'integer'],
            'is_actif' => ['nullable'],
        ]);

        // Les bannières visuelles sans texte sont autorisées, mais la colonne SQL titre est obligatoire.
        $validated['titre'] = $validated['titre'] ?? '';

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('carousels', 'public');
            $validated['image'] = $path;
        }

        if ($request->has('is_actif')) {
            $val = $request->input('is_actif');
            $validated['is_actif'] = ($val === true || $val === 'true' || $val === '1' || $val === 1);
        }

        $carousel = Carousel::create($validated);

        return (new CarouselResource($carousel->load('produit')))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Modifier une bannière existante.
     */
    public function update(Request $request, Carousel $carousel): JsonResponse
    {
        $validated = $request->validate([
            'titre' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'kicker' => ['nullable', 'string', 'max:100'],
            'image' => ['nullable', 'file', 'image', 'mimes:jpeg,png,jpg,webp,gif', 'max:10240'],
            'texte_bouton' => ['nullable', 'string', 'max:100'],
            'lien' => ['nullable', 'string', 'max:255'],
            'produit_id' => ['nullable', 'integer', 'exists:produits,id'],
            'ordre' => ['nullable', 'integer'],
            'is_actif' => ['nullable'],
        ]);

        // Laravel convertit un titre vide en NULL ; on conserve une chaîne vide pour MySQL.
        if (array_key_exists('titre', $validated) && $validated['titre'] === null) {
            $validated['titre'] = '';
        }

        if ($request->hasFile('image')) {
            if ($carousel->image && Storage::disk('public')->exists($carousel->image)) {
                Storage::disk('public')->delete($carousel->image);
            }
            $path = $request->file('image')->store('carousels', 'public');
            $validated['image'] = $path;
        }

        if ($request->has('is_actif')) {
            $val = $request->input('is_actif');
            $validated['is_actif'] = ($val === true || $val === 'true' || $val === '1' || $val === 1);
        }

        $carousel->update($validated);

        return response()->json([
            'message' => 'Bannière mise à jour avec succès.',
            'data' => new CarouselResource($carousel->fresh()->load('produit')),
        ]);
    }

    /**
     * Supprimer une bannière carrousel.
     */
    public function destroy(Carousel $carousel): JsonResponse
    {
        if ($carousel->image && Storage::disk('public')->exists($carousel->image)) {
            Storage::disk('public')->delete($carousel->image);
        }

        $carousel->delete();

        return response()->json([
            'message' => 'Bannière carrousel supprimée avec succès.',
        ]);
    }
}
