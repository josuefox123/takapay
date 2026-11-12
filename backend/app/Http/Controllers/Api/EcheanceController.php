<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEcheanceRequest;
use App\Http\Requests\UpdateEcheanceRequest;
use App\Http\Resources\EcheanceResource;
use App\Models\Cagnotte;
use App\Models\Echeance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EcheanceController extends Controller
{
    /**
     * Vérifie que l'admin standard accède uniquement aux échéances de ses propres produits.
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
            abort(403, 'Accès refusé. Cette échéance ne concerne pas vos produits.');
        }
    }

    /**
     * Liste paginée des échéances.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $query = Echeance::latest();

        if ($user && $user->role === 'admin') {
            $query->whereHas('cagnotte.produit', fn ($p) => $p->where('admin_id', $user->id));
        }

        return EcheanceResource::collection($query->paginate(15));
    }

    /**
     * Créer une échéance.
     */
    public function store(StoreEcheanceRequest $request): JsonResponse
    {
        $data = $request->validated();
        $this->authorizeCagnotteAccess($request, (int) ($data['cagnotte_id'] ?? 0));

        $echeance = Echeance::create($data);

        return (new EcheanceResource($echeance))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Afficher une échéance.
     */
    public function show(Request $request, Echeance $echeance): EcheanceResource
    {
        $this->authorizeCagnotteAccess($request, $echeance->cagnotte_id);

        return new EcheanceResource($echeance);
    }

    /**
     * Modifier une échéance.
     */
    public function update(
        UpdateEcheanceRequest $request,
        Echeance $echeance
    ): EcheanceResource {
        $this->authorizeCagnotteAccess($request, $echeance->cagnotte_id);

        $data = $request->validated();
        if (isset($data['cagnotte_id']) && (int) $data['cagnotte_id'] !== (int) $echeance->cagnotte_id) {
            $this->authorizeCagnotteAccess($request, (int) $data['cagnotte_id']);
        }

        $echeance->update($data);

        return new EcheanceResource($echeance);
    }

    /**
     * Supprimer une échéance.
     */
    public function destroy(Request $request, Echeance $echeance): JsonResponse
    {
        $this->authorizeCagnotteAccess($request, $echeance->cagnotte_id);

        $echeance->delete();

        return response()->json([
            'message' => 'Échéance supprimée avec succès.'
        ]);
    }
}
