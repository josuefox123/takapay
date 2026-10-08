<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEcheanceRequest;
use App\Http\Requests\UpdateEcheanceRequest;
use App\Http\Resources\EcheanceResource;
use App\Models\Echeance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EcheanceController extends Controller
{
    /**
     * Liste paginée des échéances.
     */
    public function index(): AnonymousResourceCollection
    {
        return EcheanceResource::collection(Echeance::latest()->paginate(15));
    }

    /**
     * Créer une échéance.
     */
    public function store(StoreEcheanceRequest $request): JsonResponse
    {
        $echeance = Echeance::create($request->validated());

        return (new EcheanceResource($echeance))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Afficher une échéance.
     */
    public function show(Echeance $echeance): EcheanceResource
    {
        return new EcheanceResource($echeance);
    }

    /**
     * Modifier une échéance.
     */
    public function update(
        UpdateEcheanceRequest $request,
        Echeance $echeance
    ): EcheanceResource {
        $echeance->update($request->validated());

        return new EcheanceResource($echeance);
    }

    /**
     * Supprimer une échéance.
     */
    public function destroy(Echeance $echeance): JsonResponse
    {
        $echeance->delete();

        return response()->json([
            'message' => 'Échéance supprimée avec succès.'
        ]);
    }
}
