<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\LoginRequest;
use App\Http\Requests\Api\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Hash factuel exécuté quand l'utilisateur n'existe pas,
     * afin d'égaler le temps de réponse et d'éviter l'énumération de comptes.
     */
    private const DUMMY_HASH = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

    /**
     * Inscription d'un nouvel utilisateur avec code PIN
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();

        $data['role'] = 'client';
        $data['statut_compte'] = 'actif';

        // Si l'utilisateur n'a pas spécifié d'email mais un téléphone
        if (empty($data['email']) && ! empty($data['telephone'])) {
            $cleanedPhone = preg_replace('/\D/', '', $data['telephone']);
            $data['email'] = $cleanedPhone.'@client.takapay.bj';
        }

        // Le code PIN saisi devient le mot de passe haché
        if (! empty($data['code_pin'])) {
            $data['password'] = Hash::make($data['code_pin']);
        } elseif (! empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            $data['password'] = Hash::make(Str::random(16));
        }

        unset($data['code_pin'], $data['code_pin_confirmation']);

        $user = User::create($data);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Compte créé avec succès !',
            'user' => new UserResource($user),
            'access_token' => $token,
            'token_type' => 'Bearer',
        ], 201);
    }

    /**
     * Connexion ou création directe via Google
     */
    public function googleAuth(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'string', 'email'],
            'nom' => ['required', 'string', 'max:255'],
            'prenom' => ['nullable', 'string', 'max:255'],
            'telephone' => ['nullable', 'string', 'max:30'],
            'photo_profil' => ['nullable', 'string'],
        ]);

        $user = User::where('email', $request->email)
            ->when($request->filled('telephone'), function ($query) use ($request) {
                $cleanPhone = preg_replace('/[^\d+]/', '', $request->telephone);
                $query->orWhere('telephone', $request->telephone)
                    ->orWhere('telephone', $cleanPhone);
            })
            ->first();

        $isNewUser = false;
        if (! $user) {
            $isNewUser = true;
            $user = User::create([
                'nom' => $request->nom,
                'prenom' => $request->prenom,
                'email' => $request->email,
                'telephone' => $request->telephone,
                'photo_profil' => $request->photo_profil,
                'password' => Hash::make(Str::random(24)),
                'role' => 'client',
                'statut_compte' => 'actif',
            ]);
        } else {
            $user->update(array_filter([
                'nom' => $user->nom ?: $request->nom,
                'prenom' => $user->prenom ?: $request->prenom,
                'telephone' => $user->telephone ?: $request->telephone,
                'photo_profil' => $user->photo_profil ?: $request->photo_profil,
            ]));
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => $isNewUser ? 'Compte créé avec succès via Google !' : 'Connexion réussie via Google.',
            'created' => $isNewUser,
            'user' => new UserResource($user),
            'access_token' => $token,
            'token_type' => 'Bearer',
        ]);
    }

    /**
     * Connexion d'un utilisateur existant (par identifiant et mot de passe ou code PIN)
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $identifiant = trim($request->identifiant);
        $cleanPhone = preg_replace('/[^\d+]/', '', $identifiant);

        $user = User::where('email', $identifiant)
            ->orWhere('telephone', $identifiant)
            ->when(! empty($cleanPhone), function ($query) use ($cleanPhone) {
                $query->orWhere('telephone', $cleanPhone)
                    ->orWhere('telephone', 'like', "%{$cleanPhone}%");
            })
            ->first();

        $passwordValid = Hash::check($request->password, $user?->password ?? self::DUMMY_HASH);

        if (! $user || ! $passwordValid) {
            throw ValidationException::withMessages([
                'identifiant' => ['Les identifiants ou le code PIN fournis sont incorrects.'],
            ]);
        }

        if ($user->statut_compte !== 'actif') {
            return response()->json([
                'message' => 'Votre compte est suspendu ou inactif.',
            ], 403);
        }

        // Révocation des anciens jetons : une connexion invalide toutes les sessions précédentes
        $user->tokens()->delete();

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Connexion réussie.',
            'user' => new UserResource($user),
            'access_token' => $token,
            'token_type' => 'Bearer',
        ]);
    }

    /**
     * Obtenir le profil de l'utilisateur authentifié
     */
    public function me(Request $request): UserResource
    {
        return new UserResource($request->user());
    }

    /**
     * Déconnexion et révocation du jeton courant
     */
    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()->currentAccessToken();

        if ($token) {
            $token->delete();
        }

        return response()->json([
            'message' => 'Déconnexion réussie.',
        ]);
    }
}
