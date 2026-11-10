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
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class UserController extends Controller
{
    /**
     * Liste paginée des utilisateurs.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $baseQuery = User::query();

        // Si l'utilisateur connecté n'est pas super_admin, masquer les comptes super_admin
        if ($request->user()?->role !== 'super_admin') {
            $baseQuery->where('role', '!=', 'super_admin');
        }

        // Compteurs réels sur l'ensemble de la base
        $counts = [
            'total' => (clone $baseQuery)->count(),
            'client' => (clone $baseQuery)->where('role', 'client')->count(),
            'livreur' => (clone $baseQuery)->where('role', 'livreur')->count(),
            'admin' => (clone $baseQuery)->where(function ($q) use ($request) {
                if ($request->user()?->role === 'super_admin') {
                    $q->whereIn('role', ['admin', 'super_admin']);
                } else {
                    $q->where('role', 'admin');
                }
            })->count(),
        ];

        $query = clone $baseQuery;

        if ($request->filled('role') && $request->role !== 'tous') {
            $query->where('role', $request->role);
        }

        if ($request->filled('q')) {
            $q = trim($request->q);
            $query->where(function ($sub) use ($q) {
                $sub->where('nom', 'like', "%{$q}%")
                    ->orWhere('prenom', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%")
                    ->orWhere('telephone', 'like', "%{$q}%");
            });
        }

        $query->latest();

        $perPage = (int) $request->input('per_page', 15);
        if ($perPage <= 0 || $perPage > 100) {
            $perPage = 15;
        }

        return UserResource::collection($query->paginate($perPage))
            ->additional(['counts' => $counts]);
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

        // Révoquer immédiatement toutes les sessions actives en cas de réinitialisation du mot de passe ou suspension du compte
        if (! empty($plainPassword) || in_array($updatedUser->statut_compte, ['suspendu', 'inactif'], true)) {
            $user->tokens()->delete();
        } elseif ($updatedUser->statut_compte === 'actif') {
            try {
                Cache::forget('login_lockout_'.$user->id);
                if ($user->email) {
                    Cache::forget('login_attempts_'.md5(strtolower($user->email)));
                }
                if ($user->telephone) {
                    Cache::forget('login_attempts_'.md5(preg_replace('/\D/', '', $user->telephone)));
                }
            } catch (\Throwable $e) {
                // Ignorer
            }
        }

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
        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Utilisateur supprimé avec succès.']);
    }
}
