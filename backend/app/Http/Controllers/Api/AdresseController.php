<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAdresseRequest;
use App\Http\Requests\UpdateAdresseRequest;
use App\Http\Resources\AdresseResource;
use App\Models\Adresse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdresseController extends Controller
{
    /**
     * Liste des adresses : les siennes, ou toutes pour un administrateur.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = $user->isAdmin()
            ? Adresse::query()
            : Adresse::where('utilisateur_id', $user->id);

        return AdresseResource::collection($query->latest()->get());
    }

    /**
     * Créer une adresse.
     */
    public function store(StoreAdresseRequest $request): JsonResponse
    {
        $data = $request->validated();

        // Le propriétaire est toujours dérivé du jeton d'authentification
        $data['utilisateur_id'] ??= $request->user()->id;

        $adresse = Adresse::create($data);

        return (new AdresseResource($adresse))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Afficher une adresse.
     */
    public function show(Request $request, Adresse $adresse): AdresseResource
    {
        $this->authorizeOwnerOrAdmin($request, $adresse);

        return new AdresseResource($adresse);
    }

    /**
     * Modifier une adresse.
     */
    public function update(UpdateAdresseRequest $request, Adresse $adresse): AdresseResource
    {
        $adresse->update($request->validated());

        return new AdresseResource($adresse);
    }

    /**
     * Supprimer une adresse.
     */
    public function destroy(Request $request, Adresse $adresse): JsonResponse
    {
        $this->authorizeOwnerOrAdmin($request, $adresse);

        $adresse->delete();

        return response()->json(['message' => 'Adresse supprimée avec succès.']);
    }
}
