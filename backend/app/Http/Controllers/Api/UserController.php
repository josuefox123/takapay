<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UserController extends Controller
{
    /**
     * Liste paginée des utilisateurs.
     */
    public function index(): AnonymousResourceCollection
    {
        return UserResource::collection(User::latest()->paginate(15));
    }

    /**
     * Créer un utilisateur.
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = User::create($request->validated());

        return (new UserResource($user))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Afficher un utilisateur.
     */
    public function show(User $user): UserResource
    {
        return new UserResource($user);
    }

    /**
     * Modifier un utilisateur.
     */
    public function update(UpdateUserRequest $request, User $user): UserResource
    {
        $user->update($request->validated());

        return new UserResource($user);
    }

    /**
     * Supprimer un utilisateur.
     */
    public function destroy(User $user): JsonResponse
    {
        $user->delete();

        return response()->json(['message' => 'Utilisateur supprimé avec succès.']);
    }
}
