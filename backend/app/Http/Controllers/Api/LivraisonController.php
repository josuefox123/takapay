<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLivraisonRequest;
use App\Http\Requests\UpdateLivraisonRequest;
use App\Http\Resources\LivraisonResource;
use App\Models\Cagnotte;
use App\Models\Livraison;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class LivraisonController extends Controller
{
    /**
     * Liste paginée des livraisons.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $query = Livraison::latest();

        if ($user && $user->role === 'admin') {
            $query->whereHas('cagnotte.produit', fn ($p) => $p->where('admin_id', $user->id));
        }

        return LivraisonResource::collection($query->paginate(15));
    }

    /**
     * Vérifie que l'admin standard accède uniquement aux livraisons de ses propres produits.
     */
    private function authorizeCagnotteAccess(Request $request, ?int $cagnotteId): void
    {
        $user = $request->user();
        if ($user?->role === 'super_admin') {
            return;
        }

        if (! $user || $user->role !== 'admin') {
            abort(403, 'Accès refusé.');
        }

        $cagnotte = $cagnotteId ? Cagnotte::with('produit')->find($cagnotteId) : null;
        if (! $cagnotte || (int) $cagnotte->produit?->admin_id !== (int) $user->id) {
            abort(403, 'Accès refusé. Cette livraison ne concerne pas vos produits.');
        }
    }

    /**
     * Créer une livraison.
     */
    public function store(StoreLivraisonRequest $request): JsonResponse
    {
        $data = $request->validated();
        $this->authorizeCagnotteAccess($request, (int) ($data['cagnotte_id'] ?? 0));

        $livraison = Livraison::create($data);

        return (new LivraisonResource($livraison))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Afficher une livraison.
     */
    public function show(Request $request, Livraison $livraison): LivraisonResource
    {
        $this->authorizeCagnotteAccess($request, $livraison->cagnotte_id);

        return new LivraisonResource($livraison);
    }

    /**
     * Modifier une livraison.
     */
    public function update(
        UpdateLivraisonRequest $request,
        Livraison $livraison
    ): LivraisonResource {
        $this->authorizeCagnotteAccess($request, $livraison->cagnotte_id);

        $data = $request->validated();
        if (isset($data['cagnotte_id']) && (int) $data['cagnotte_id'] !== (int) $livraison->cagnotte_id) {
            $this->authorizeCagnotteAccess($request, (int) $data['cagnotte_id']);
        }

        $livraison->update($data);

        return new LivraisonResource($livraison);
    }

    /**
     * Supprimer une livraison.
     */
    public function destroy(Request $request, Livraison $livraison): JsonResponse
    {
        $this->authorizeCagnotteAccess($request, $livraison->cagnotte_id);

        $livraison->delete();

        return response()->json([
            'message' => 'Livraison supprimée avec succès.'
        ]);
    }
}
