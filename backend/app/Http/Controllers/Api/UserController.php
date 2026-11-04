<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Mail\AdminWelcomeMail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class UserController extends Controller
{
    /**
     * Liste paginée des utilisateurs.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = User::orderBy('nom', 'asc')->orderBy('prenom', 'asc');

        if ($request->user()?->role !== 'super_admin') {
            $query->where('role', '!=', 'super_admin');
        }

        return UserResource::collection($query->paginate(15));
    }

    /**
     * Créer un utilisateur.
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        $data = $request->validated();
        if (! empty($data['email'])) {
            $data['email'] = trim($data['email']);
        }
        $plainPassword = trim($data['password']);
        $data['password'] = $plainPassword;

        if (in_array($data['role'] ?? '', ['admin', 'super_admin'])) {
            $data['must_change_password'] = true;
        }

        $user = User::create($data);

        // Envoi de l'email d'accueil avec les identifiants temporaires pour les administrateurs
        if (in_array($user->role, ['admin', 'super_admin']) && !empty($user->email)) {
            try {
                Mail::to($user->email)->send(new AdminWelcomeMail($user, $plainPassword));
            } catch (\Throwable $e) {
                Log::warning("Impossible d'envoyer l'email d'accueil admin : " . $e->getMessage());
            }
        }

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
        $data = $request->validated();
        $plainPassword = null;

        if (! empty($data['email'])) {
            $data['email'] = trim($data['email']);
        }

        if (array_key_exists('password', $data)) {
            if (empty($data['password'])) {
                unset($data['password']);
            } else {
                $plainPassword = trim($data['password']);
                $data['password'] = $plainPassword;
                if (in_array($data['role'] ?? $user->role, ['admin', 'super_admin'])) {
                    $data['must_change_password'] = true;
                }
            }
        }

        if (isset($data['telephone']) && $data['telephone'] === '') {
            $data['telephone'] = null;
        }

        $user->update($data);
        $updatedUser = $user->fresh();

        if (! empty($updatedUser->email)) {
            try {
                Mail::to($updatedUser->email)->send(new AdminWelcomeMail($updatedUser, $plainPassword, true));
            } catch (\Throwable $e) {
                Log::warning("Impossible d'envoyer l'email de mise à jour du compte : " . $e->getMessage());
            }
        }

        return new UserResource($updatedUser);
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
