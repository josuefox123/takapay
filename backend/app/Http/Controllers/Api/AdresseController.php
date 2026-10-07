<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAdresseRequest;
use App\Http\Requests\UpdateAdresseRequest;
use App\Http\Resources\AdresseResource;
use App\Models\Adresse;
use Illuminate\Http\JsonResponse;


class AdresseController extends Controller
{
    /**
     * Liste paginée des adresses.
     */
    public function index()
    {
        return AdresseResource::collection(Adresse::all());
    }

    /**
     * Créer une adresse.
     */
    public function store(StoreAdresseRequest $request): JsonResponse
    {
        $adresse = Adresse::create($request->validated());

        return (new AdresseResource($adresse))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Afficher un adresse.
     */
    public function show(Adresse $adresse): AdresseResource
    {
        return new AdresseResource($adresse);
    }

    /**
     * Modifier un adresse.
     */
    public function update(UpdateAdresseRequest $request, Adresse $adresse): AdresseResource
    {
        $adresse->update($request->validated());

        return new AdresseResource($adresse);
    }

    /**
     * Supprimer un adresse.
     */
    public function destroy(Adresse $adresse): JsonResponse
    {
        $adresse->delete();

        return response()->json(['message' => 'Adresse supprimé avec succes']);
    }
}
