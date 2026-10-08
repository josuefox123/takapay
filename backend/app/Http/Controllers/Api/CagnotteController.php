<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCagnotteRequest;
use App\Http\Requests\UpdateCagnotteRequest;
use App\Http\Resources\CagnotteResource;
use App\Models\Cagnotte;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CagnotteController extends Controller
{
    /**
     * Liste paginée des cagnottes.
     */
    public function index(): AnonymousResourceCollection
    {
        return CagnotteResource::collection(
            Cagnotte::latest()->paginate(15)
        );
    }

    /**
     * Créer une cagnotte.
     */
    public function store(StoreCagnotteRequest $request): JsonResponse
    {
        $cagnotte = Cagnotte::create($request->validated());

        return (new CagnotteResource($cagnotte))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Afficher une cagnotte.
     */
    public function show(Cagnotte $cagnotte): CagnotteResource
    {
        return new CagnotteResource($cagnotte);
    }

    /**
     * Modifier une cagnotte.
     */
    public function update(
        UpdateCagnotteRequest $request,
        Cagnotte $cagnotte
    ): CagnotteResource {
        $cagnotte->update($request->validated());

        return new CagnotteResource($cagnotte);
    }

    /**
     * Supprimer une cagnotte.
     */
    public function destroy(Cagnotte $cagnotte): JsonResponse
    {
        $cagnotte->delete();

        return response()->json([
            'message' => 'Cagnotte supprimée avec succès.'
        ]);
    }
}
