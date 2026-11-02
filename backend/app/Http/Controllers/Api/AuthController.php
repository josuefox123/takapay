<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\LoginRequest;
use App\Http\Requests\Api\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Mail\PinChangedMail;
use App\Mail\ResetPinMail;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
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
     * Mettre à jour le profil de l'utilisateur (nom, prénom, téléphone, email).
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user('sanctum') ?? $request->user();

        if (! $user && $request->filled('user_id')) {
            $user = User::find($request->user_id);
        }

        if (! $user) {
            return response()->json(['message' => 'Non authentifié. Veuillez vous connecter.'], 401);
        }

        $request->validate([
            'nom' => ['nullable', 'string', 'max:255'],
            'prenom' => ['nullable', 'string', 'max:255'],
            'telephone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255', 'unique:users,email,'.$user->id],
        ]);

        if ($request->has('nom')) {
            $user->nom = trim($request->nom);
        }
        if ($request->has('prenom')) {
            $user->prenom = trim($request->prenom);
        }
        if ($request->has('telephone')) {
            $user->telephone = trim($request->telephone);
        }
        if ($request->has('email') && ! empty($request->email)) {
            $user->email = trim($request->email);
        }

        $user->save();

        return response()->json([
            'message' => 'Vos informations de profil ont été mises à jour avec succès.',
            'user' => new UserResource($user->fresh()),
        ]);
    }

    /**
     * Mettre à jour le code PIN de l'utilisateur.
     */
    public function updatePin(Request $request): JsonResponse
    {
        $user = $request->user('sanctum') ?? $request->user();

        if (! $user && $request->filled('user_id')) {
            $user = User::find($request->user_id);
        }

        if (! $user) {
            return response()->json(['message' => 'Non authentifié. Veuillez vous connecter.'], 401);
        }

        $request->validate([
            'current_pin' => ['nullable', 'string'],
            'new_pin' => ['required', 'string', 'size:6'],
            'confirm_pin' => ['required', 'string', 'same:new_pin'],
        ]);

        if ($request->filled('current_pin') && ! empty($user->password)) {
            if (! Hash::check($request->current_pin, $user->password)) {
                throw ValidationException::withMessages([
                    'current_pin' => ['Le code PIN actuel est incorrect.'],
                ]);
            }
        }

        $user->password = $request->new_pin;
        $user->save();

        // Notification in-app et email si renseigné
        $this->notifyPinChanged($user);

        return response()->json([
            'message' => 'Votre code PIN de sécurité a été modifié avec succès.',
        ]);
    }

    /**
     * Envoie un SMS OTP au numéro de l'utilisateur (Termii, passerelle générique ou journal local)
     */
    private function sendOtpSms(string $telephone, string $code): bool
    {
        $message = "Votre code de réinitialisation PIN TakaPay est : {$code}. Valide 15 minutes. Ne le partagez avec personne.";

        // Journalisation systématique
        Log::info("Code OTP SMS pour {$telephone} : {$code}");

        // Si une clé d'API SMS (Termii / Generic) est renseignée dans .env
        $smsApiKey = env('SMS_API_KEY') ?: env('TERMII_API_KEY');
        if (! empty($smsApiKey)) {
            try {
                $senderId = env('SMS_SENDER_ID', 'TakaPay');
                $response = Http::timeout(8)->post('https://api.ng.termii.com/api/sms/send', [
                    'to' => $telephone,
                    'from' => $senderId,
                    'sms' => $message,
                    'type' => 'plain',
                    'channel' => 'generic',
                    'api_key' => $smsApiKey,
                ]);

                return $response->successful();
            } catch (\Throwable $e) {
                Log::warning('Erreur envoi SMS externe : '.$e->getMessage());
            }
        }

        return true;
    }

    /**
     * Résout un utilisateur selon l'identifiant fourni (Email strict ou Téléphone strict).
     * Refuse strictement les numéros de téléphone contenant des lettres.
     */
    private function resolveUserByIdentifiant(string $identifiant, ?string &$error = null, ?string &$channel = null): ?User
    {
        $identifiant = trim($identifiant);

        if (str_contains($identifiant, '@')) {
            $channel = 'email';

            if (! filter_var($identifiant, FILTER_VALIDATE_EMAIL)) {
                $error = 'L\'adresse email saisie est invalide.';
                return null;
            }

            $user = User::where('email', strtolower($identifiant))->first();
            if (! $user) {
                $error = 'Aucun compte TakaPay n\'a été trouvé avec cette adresse email.';
                return null;
            }

            return $user;
        }

        // Sinon, c'est un numéro de téléphone : refus strict si présence de lettres
        $channel = 'sms';

        if (preg_match('/[a-zA-Z]/', $identifiant)) {
            $error = 'Le numéro de téléphone ne doit pas comporter de lettres. Veuillez saisir uniquement des chiffres.';
            return null;
        }

        $cleanPhone = preg_replace('/[^\d+]/', '', $identifiant);
        $digitsOnly = preg_replace('/\D/', '', $cleanPhone);

        if (strlen($digitsOnly) < 8) {
            $error = 'Le numéro de téléphone doit comporter au moins 8 chiffres.';
            return null;
        }

        $user = User::where('telephone', $cleanPhone)
            ->orWhere('telephone', $identifiant)
            ->orWhere('telephone', 'like', "%{$digitsOnly}%")
            ->first();

        if (! $user) {
            $error = 'Aucun compte TakaPay n\'a été trouvé avec ce numéro de téléphone.';
            return null;
        }

        return $user;
    }

    /**
     * Demande d'envoi d'un code de réinitialisation de PIN (Email automatique si email, SMS si téléphone)
     */
    public function forgotPin(Request $request): JsonResponse
    {
        $request->validate([
            'identifiant' => ['required', 'string'],
        ]);

        $error = null;
        $channel = null;
        $user = $this->resolveUserByIdentifiant($request->identifiant, $error, $channel);

        if (! $user) {
            return response()->json([
                'message' => $error ?: 'Aucun compte TakaPay n\'a été trouvé avec cet identifiant.',
            ], 422);
        }

        // Génération d'un code OTP aléatoire à 6 chiffres
        $code = str_pad((string) mt_rand(100000, 999999), 6, '0', STR_PAD_LEFT);

        // Sauvegarde dans le cache pendant 15 minutes
        Cache::put('pin_reset_'.$user->id, [
            'code' => $code,
            'user_id' => $user->id,
            'channel' => $channel,
            'created_at' => now(),
        ], now()->addMinutes(15));

        // Sauvegarde dans la table password_reset_tokens
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            [
                'token' => Hash::make($code),
                'created_at' => now(),
            ]
        );

        if ($channel === 'sms') {
            $cleanPhone = preg_replace('/[^\d+]/', '', $request->identifiant);
            $destPhone = ! empty($user->telephone) ? $user->telephone : $cleanPhone;
            $this->sendOtpSms($destPhone, $code);

            $len = strlen($destPhone);
            $masked = $len > 6
                ? substr($destPhone, 0, 4).'****'.substr($destPhone, -2)
                : $destPhone;

            return response()->json([
                'message' => "Un code de vérification à 6 chiffres a été envoyé par SMS au {$masked}.",
                'channel' => 'sms',
                'destination' => $masked,
                'user_id' => $user->id,
            ]);
        }

        // Envoi par email
        try {
            Mail::to($user->email)->send(new ResetPinMail($user, $code));
        } catch (\Throwable $e) {
            Log::error("Erreur lors de l'envoi d'email de réinitialisation : ".$e->getMessage());
        }

        $parts = explode('@', $user->email);
        $namePart = $parts[0];
        $domainPart = $parts[1] ?? '';
        $maskedName = strlen($namePart) > 2 ? substr($namePart, 0, 2).'***' : $namePart.'***';
        $destination = $maskedName.'@'.$domainPart;

        return response()->json([
            'message' => "Un code de vérification à 6 chiffres a été envoyé à l'adresse email {$destination}.",
            'channel' => 'email',
            'destination' => $destination,
            'user_id' => $user->id,
        ]);
    }

    /**
     * Vérification préalable du code secret reçu avant la saisie du nouveau PIN
     */
    public function verifyPinCode(Request $request): JsonResponse
    {
        $request->validate([
            'identifiant' => ['required', 'string'],
            'code' => ['required', 'string', 'size:6'],
        ]);

        $error = null;
        $channel = null;
        $user = $this->resolveUserByIdentifiant($request->identifiant, $error, $channel);

        if (! $user) {
            return response()->json([
                'message' => $error ?: 'Utilisateur introuvable.',
            ], 422);
        }

        $cacheData = Cache::get('pin_reset_'.$user->id);
        $codeValid = false;

        if ($cacheData && isset($cacheData['code']) && $cacheData['code'] === $request->code) {
            $codeValid = true;
        } else {
            $tokenRecord = DB::table('password_reset_tokens')->where('email', $user->email)->first();
            if ($tokenRecord && Hash::check($request->code, $tokenRecord->token)) {
                $createdAt = \Carbon\Carbon::parse($tokenRecord->created_at);
                if ($createdAt->addMinutes(15)->isFuture()) {
                    $codeValid = true;
                }
            }
        }

        if (! $codeValid) {
            return response()->json([
                'message' => 'Le code de vérification saisi est incorrect ou a expiré.',
            ], 422);
        }

        return response()->json([
            'valid' => true,
            'message' => 'Code vérifié avec succès.',
        ]);
    }

    /**
     * Validation du code et enregistrement du nouveau code PIN
     */
    public function resetPin(Request $request): JsonResponse
    {
        $request->validate([
            'identifiant' => ['required', 'string'],
            'code' => ['required', 'string', 'size:6'],
            'new_pin' => ['required', 'string', 'size:6'],
            'confirm_pin' => ['required', 'string', 'same:new_pin'],
        ]);

        $error = null;
        $channel = null;
        $user = $this->resolveUserByIdentifiant($request->identifiant, $error, $channel);

        if (! $user) {
            return response()->json([
                'message' => $error ?: 'Utilisateur introuvable.',
            ], 422);
        }

        $cacheData = Cache::get('pin_reset_'.$user->id);
        $codeValid = false;

        if ($cacheData && isset($cacheData['code']) && $cacheData['code'] === $request->code) {
            $codeValid = true;
        } else {
            $tokenRecord = DB::table('password_reset_tokens')->where('email', $user->email)->first();
            if ($tokenRecord && Hash::check($request->code, $tokenRecord->token)) {
                $createdAt = \Carbon\Carbon::parse($tokenRecord->created_at);
                if ($createdAt->addMinutes(15)->isFuture()) {
                    $codeValid = true;
                }
            }
        }

        if (! $codeValid) {
            return response()->json([
                'message' => 'Le code de vérification saisi est incorrect ou a expiré.',
            ], 422);
        }

        // Mise à jour du code PIN
        $user->password = $request->new_pin;
        $user->save();

        Cache::forget('pin_reset_'.$user->id);
        DB::table('password_reset_tokens')->where('email', $user->email)->delete();

        // Révoquer les anciens jetons pour sécurité (la connexion ne sera pas automatique)
        $user->tokens()->delete();

        // Notification in-app et email si renseigné
        $this->notifyPinChanged($user);

        return response()->json([
            'message' => 'Votre code PIN a été modifié avec succès ! Veuillez vous connecter avec votre nouveau code PIN.',
            'identifiant' => $request->identifiant,
        ]);
    }

    /**
     * Crée une notification in-app et envoie un e-mail si l'utilisateur possède une adresse e-mail valide
     */
    private function notifyPinChanged(User $user): void
    {
        // 1. Notification in-app systématique
        try {
            Notification::create([
                'utilisateur_id' => $user->id,
                'cagnotte_id' => null,
                'titre' => 'Code PIN modifié avec succès',
                'message' => 'Votre code PIN de sécurité a été modifié avec succès. Si vous n’êtes pas à l’origine de cette action, veuillez contacter immédiatement l’assistance TakaPay.',
                'type' => 'securite',
                'statut' => 'non_lu',
            ]);
        } catch (\Throwable $e) {
            Log::warning('Impossible d\'enregistrer la notification in-app de code PIN modifié : ' . $e->getMessage());
        }

        // 2. Envoi d'un e-mail si l'utilisateur a renseigné un véritable e-mail
        $email = $user->email ?? null;
        $hasRealEmail = ! empty($email)
            && filter_var($email, FILTER_VALIDATE_EMAIL)
            && ! str_ends_with(strtolower($email), '@client.takapay.bj');

        if ($hasRealEmail) {
            try {
                Mail::to($email)->send(new PinChangedMail($user));
            } catch (\Throwable $e) {
                Log::warning("Impossible d'envoyer l'e-mail de confirmation de PIN modifié à {$email} : " . $e->getMessage());
            }
        }
    }
}
