<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLivreurRequest;
use App\Http\Requests\UpdateLivreurRequest;
use App\Http\Resources\LivreurResource;
use App\Models\Livreur;
use Illuminate\Http\JsonResponse;


class LivreurController extends Controller
{
    /**
     * Liste paginée des livreurs.
     */
    public function index()
    {
        return LivreurResource::collection(Livreur::all());
    }

    /**
     * Créer un Livreur.
     */
    public function store(StoreLivreurRequest $request): JsonResponse
    {
        $livreur = Livreur::create($request->validated());

        return (new LivreurResource($livreur))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Afficher un livreur.
     */
    public function show(Livreur $livreur): LivreurResource
    {
        return new LivreurResource($livreur);
    }

    /**
     * Modifier un livreur.
     */
    public function update(UpdateLivreurRequest $request, Livreur $livreur): LivreurResource
    {
        $livreur->update($request->validated());

        return new LivreurResource($livreur);
    }

    /**
     * Supprimer un livreur.
     */
    public function destroy(Livreur $livreur): JsonResponse
    {
        $livreur->delete();

        return response()->noContent;
    }
}
