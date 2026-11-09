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
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Hash factuel exécuté quand l'utilisateur n'existe pas,
     * afin d'égaler le temps de réponse et d'éviter l'énumération de comptes.
     */
    private const DUMMY_HASH = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

    private const PIN_RESET_MAX_ATTEMPTS = 4;

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
     * Connexion ou création directe via Google (avec vérification stricte de l'id_token auprès de Google)
     */
    public function googleAuth(Request $request): JsonResponse
    {
        $googleClientId = config('services.google.client_id');
        if (empty($googleClientId)) {
            return response()->json([
                'message' => "La connexion via Google n'est pas activée sur cette plateforme.",
            ], 503);
        }

        $request->validate([
            'id_token' => ['required', 'string'],
        ]);

        try {
            $googleRes = Http::timeout(10)->get('https://oauth2.googleapis.com/tokeninfo', [
                'id_token' => $request->input('id_token'),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Impossible de vérifier le jeton Google.',
            ], 401);
        }

        if (! $googleRes->successful()) {
            return response()->json([
                'message' => 'Jeton Google invalide ou expiré.',
            ], 401);
        }

        $payload = $googleRes->json();
        $aud = $payload['aud'] ?? null;
        $emailVerified = filter_var($payload['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $verifiedEmail = isset($payload['email']) ? strtolower(trim((string) $payload['email'])) : null;

        if ($aud !== $googleClientId || ! $emailVerified || empty($verifiedEmail)) {
            return response()->json([
                'message' => 'Le jeton Google ne correspond pas à cette application ou l’adresse e-mail n’est pas vérifiée.',
            ], 401);
        }

        $user = User::where('email', $verifiedEmail)->first();

        if ($user && in_array($user->role, ['admin', 'super_admin'], true)) {
            return response()->json([
                'message' => 'Identifiant invalide.',
            ], 401);
        }

        if ($user && $user->statut_compte !== 'actif') {
            return response()->json([
                'message' => 'Votre compte est suspendu ou inactif.',
            ], 403);
        }

        $nom = trim(strip_tags((string) ($payload['family_name'] ?? $payload['name'] ?? 'Client')));
        $prenom = trim(strip_tags((string) ($payload['given_name'] ?? '')));
        $picture = isset($payload['picture']) && is_string($payload['picture']) ? $payload['picture'] : null;

        $isNewUser = false;
        if (! $user) {
            $isNewUser = true;
            $user = User::create([
                'nom' => $nom !== '' ? $nom : 'Client',
                'prenom' => $prenom !== '' ? $prenom : null,
                'email' => $verifiedEmail,
                'photo_profil' => $picture,
                'password' => Hash::make(Str::random(24)),
                'role' => 'client',
                'statut_compte' => 'actif',
            ]);
        } else {
            $user->update(array_filter([
                'nom' => $user->nom ?: ($nom !== '' ? $nom : null),
                'prenom' => $user->prenom ?: ($prenom !== '' ? $prenom : null),
                'photo_profil' => $user->photo_profil ?: $picture,
            ]));
        }

        $user->tokens()->delete();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => $isNewUser ? 'Compte créé avec succès via Google !' : 'Connexion réussie via Google.',
            'created' => $isNewUser,
            'user' => new UserResource($user),
            'access_token' => $token,
            'token_type' => 'Bearer',
        ]);
    }

    private function loginAttemptKey(Request $request, string $identifiant, ?User $user = null): string
    {
        $principal = $user
            ? 'user:'.$user->getKey()
            : 'identifier:'.hash('sha256', mb_strtolower(trim($identifiant)));
        $ip = $request->ip() ?: 'unknown';

        return 'auth-login:'.hash_hmac('sha256', $principal.'|'.$ip, (string) config('app.key'));
    }

    private function loginLockoutResponse(array $state): JsonResponse
    {
        $retryAfter = max(1, (int) ($state['locked_until'] ?? 0) - now()->timestamp);

        return response()->json([
            'message' => 'Trop de tentatives incorrectes. Réessayez après le décompte ou utilisez « Code oublié ? ».',
            'locked' => true,
            'retry_after' => $retryAfter,
            'locked_until' => now()->addSeconds($retryAfter)->toIso8601String(),
        ], 429)->header('Retry-After', (string) $retryAfter);
    }

    private function recordFailedLogin(string $key, bool $knownUser): JsonResponse
    {
        return Cache::lock($key.':mutex', 10)->block(5, function () use ($key, $knownUser) {
            $state = Cache::get($key, [
                'failures' => 0,
                'lockouts' => 0,
                'locked_until' => 0,
            ]);

            if (($state['locked_until'] ?? 0) > now()->timestamp) {
                return $this->loginLockoutResponse($state);
            }

            $state['locked_until'] = 0;
            $state['failures'] = (int) ($state['failures'] ?? 0) + 1;

            if ($state['failures'] >= 3) {
                $state['lockouts'] = (int) ($state['lockouts'] ?? 0) + 1;
                $lockoutMinutes = $state['lockouts'] >= 3 ? 45 : 15;
                $state['failures'] = 0;
                $state['locked_until'] = now()->addMinutes($lockoutMinutes)->timestamp;
                if ($knownUser) {
                    Cache::forever($key, $state);
                } else {
                    Cache::put($key, $state, now()->addDay());
                }

                return $this->loginLockoutResponse($state);
            }

            if ($knownUser) {
                Cache::forever($key, $state);
            } else {
                Cache::put($key, $state, now()->addDay());
            }

            return response()->json([
                'message' => 'Les identifiants ou le code PIN fournis sont incorrects.',
                'attempts_remaining' => 3 - $state['failures'],
            ], 422);
        });
    }

    private function clearLoginAttempts(string $key): void
    {
        Cache::lock($key.':mutex', 10)->block(5, fn () => Cache::forget($key));
    }

    /**
     * Connexion d'un utilisateur existant (par identifiant et mot de passe ou code PIN)
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $identifiant = trim($request->identifiant);
        $rawPassword = trim((string) $request->password);

        if (str_contains($identifiant, '@')) {
            $user = User::where('email', strtolower($identifiant))
                ->orWhere('email', $identifiant)
                ->first();
        } else {
            $cleanPhone = preg_replace('/[^\d+]/', '', $identifiant);
            $digitsOnly = preg_replace('/\D/', '', $cleanPhone);

            $user = User::where('telephone', $identifiant)
                ->when(! empty($cleanPhone), function ($query) use ($cleanPhone) {
                    $query->orWhere('telephone', $cleanPhone);
                })
                ->when(strlen($digitsOnly) >= 8, function ($query) use ($digitsOnly) {
                    $query->orWhere('telephone', 'like', "%{$digitsOnly}%");
                })
                ->first();
        }

        $loginAttemptKey = $this->loginAttemptKey($request, $identifiant, $user);
        $loginState = Cache::get($loginAttemptKey, []);
        if (($loginState['locked_until'] ?? 0) > now()->timestamp) {
            return $this->loginLockoutResponse($loginState);
        }

        $storedPasswordHash = $user?->password ?? self::DUMMY_HASH;
        $passwordValid = Hash::check($rawPassword, $storedPasswordHash)
            || Hash::check($request->password, $storedPasswordHash);

        if (! $user || ! $passwordValid) {
            return $this->recordFailedLogin($loginAttemptKey, $user !== null);
        }

        $this->clearLoginAttempts($loginAttemptKey);

        if ($user->statut_compte !== 'actif') {
            return response()->json([
                'message' => 'Votre compte est suspendu ou inactif.',
            ], 403);
        }

        $portal = $request->input('portal');
        if ($portal === 'client' && in_array($user->role, ['admin', 'super_admin'], true)) {
            return response()->json([
                'message' => 'Identifiant invalide.',
            ], 401);
        }

        if ($portal === 'admin' && ! in_array($user->role, ['admin', 'super_admin'], true)) {
            return response()->json([
                'message' => 'Identifiant invalide.',
            ], 401);
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
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Non authentifié. Veuillez vous connecter.'], 401);
        }

        if ($request->has('nom') && is_string($request->nom)) {
            $request->merge(['nom' => trim(strip_tags($request->nom))]);
        }
        if ($request->has('prenom') && is_string($request->prenom)) {
            $request->merge(['prenom' => trim(strip_tags($request->prenom))]);
        }
        if ($request->has('telephone') && is_string($request->telephone)) {
            $cleanedPhone = preg_replace('/[\s\-\.]+/', '', trim($request->telephone));
            $request->merge(['telephone' => $cleanedPhone !== '' ? $cleanedPhone : null]);
        }

        $request->validate([
            'nom' => ['nullable', 'string', 'min:2', 'max:100', 'regex:/^[\p{L}\s\-\'\.]+$/u'],
            'prenom' => ['nullable', 'string', 'max:100', 'regex:/^[\p{L}\s\-\'\.]+$/u'],
            'telephone' => ['nullable', 'string', 'regex:/^\+?[0-9]{8,15}$/', 'unique:users,telephone,'.$user->id],
            'email' => [
                'nullable',
                'email:rfc',
                'max:255',
                'unique:users,email,'.$user->id,
                function (string $attribute, mixed $value, \Closure $fail) {
                    $domain = substr(strrchr((string) $value, '@'), 1);
                    if ($domain && $domain !== 'client.takapay.bj' && $domain !== 'example.com' && $domain !== 'example.org') {
                        if (! checkdnsrr($domain, 'MX') && ! checkdnsrr($domain, 'A')) {
                            $fail("Le domaine de l'adresse e-mail (« {$domain} ») n'existe pas.");
                        }
                    }
                },
            ],
        ], [
            'nom.regex' => 'Le nom ne doit contenir que des lettres.',
            'prenom.regex' => 'Le prénom ne doit contenir que des lettres.',
            'telephone.regex' => 'Veuillez saisir un numéro de téléphone valide (8 à 15 chiffres).',
            'telephone.unique' => 'Ce numéro de téléphone est déjà associé à un autre compte.',
            'email.unique' => 'Cette adresse e-mail est déjà associée à un autre compte.',
        ]);

        if ($request->has('nom')) {
            $user->nom = trim(strip_tags($request->nom));
        }
        if ($request->has('prenom')) {
            $user->prenom = trim(strip_tags($request->prenom));
        }
        if ($request->has('telephone')) {
            $user->telephone = $request->telephone ? trim($request->telephone) : null;
        }
        if ($request->has('email') && ! empty($request->email)) {
            $user->email = strtolower(trim($request->email));
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
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Non authentifié. Veuillez vous connecter.'], 401);
        }

        $request->validate([
            'current_pin' => ['required', 'string', 'size:6'],
            'new_pin' => ['required', 'string', 'size:6'],
            'confirm_pin' => ['required', 'string', 'same:new_pin'],
        ], [
            'current_pin.required' => 'Veuillez renseigner votre code PIN actuel.',
            'current_pin.size' => 'Le code PIN actuel doit comporter 6 chiffres.',
        ]);

        if (! empty($user->password) && ! Hash::check($request->current_pin, $user->password)) {
            throw ValidationException::withMessages([
                'current_pin' => ['Le code PIN actuel est incorrect.'],
            ]);
        }

        $user->password = $request->new_pin;
        $user->save();

        // Révoquer toutes les autres sessions actives du compte
        $currentTokenId = $user->currentAccessToken()?->id;
        if ($currentTokenId) {
            $user->tokens()->where('id', '!=', $currentTokenId)->delete();
        } else {
            $user->tokens()->delete();
        }

        // Notification in-app et email si renseigné
        $this->notifyPinChanged($user);

        return response()->json([
            'message' => 'Votre code PIN de sécurité a été modifié avec succès.',
        ]);
    }

    /**
     * Mettre à jour le mot de passe de l'utilisateur / administrateur.
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Non authentifié. Veuillez vous connecter.'], 401);
        }

        $request->validate([
            'current_password' => ['nullable', 'string'],
            'new_password' => ['required', 'string', 'min:8'],
            'confirm_password' => ['required', 'string', 'same:new_password'],
        ]);

        if (! $user->must_change_password) {
            if (! $request->filled('current_password')) {
                throw ValidationException::withMessages([
                    'current_password' => ['Veuillez renseigner votre mot de passe actuel.'],
                ]);
            }
            if (! Hash::check($request->current_password, $user->password)) {
                throw ValidationException::withMessages([
                    'current_password' => ['Le mot de passe actuel est incorrect.'],
                ]);
            }
        }

        $user->password = Hash::make($request->new_password);
        $user->must_change_password = false;
        $user->save();

        // Révoquer toutes les autres sessions actives du compte
        $currentTokenId = $user->currentAccessToken()?->id;
        if ($currentTokenId) {
            $user->tokens()->where('id', '!=', $currentTokenId)->delete();
        } else {
            $user->tokens()->delete();
        }

        return response()->json([
            'message' => 'Votre mot de passe a été défini avec succès.',
            'user' => new UserResource($user->fresh()),
        ]);
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

    private function pinResetAttemptKey(Request $request, string $identifiant, ?User $user, string $purpose): string
    {
        $principal = $user
            ? 'user:'.$user->getKey()
            : 'identifier:'.hash('sha256', mb_strtolower(trim($identifiant)));
        $ip = $request->ip() ?: 'unknown';

        return 'pin-reset-'.$purpose.':'.hash_hmac('sha256', $principal.'|'.$ip, (string) config('app.key'));
    }

    private function pinResetLimitResponse(string $key): JsonResponse
    {
        $retryAfter = max(1, RateLimiter::availableIn($key));

        return response()->json([
            'message' => 'Trop de tentatives. Réessayez plus tard.',
            'retry_after' => $retryAfter,
        ], 429)->header('Retry-After', (string) $retryAfter);
    }

    private function pinResetCodeValid(User $user, string $code): bool
    {
        $tokenRecord = DB::table('password_reset_tokens')
            ->where('email', $user->email)
            ->first();

        if (! $tokenRecord || ! $tokenRecord->created_at) {
            return false;
        }

        return Carbon::parse($tokenRecord->created_at)
            ->addMinutes(10)
            ->isFuture()
            && Hash::check($code, $tokenRecord->token);
    }

    private function invalidPinResetCode(string $key, ?User $user): JsonResponse
    {
        RateLimiter::hit($key, 15 * 60);

        if (RateLimiter::tooManyAttempts($key, self::PIN_RESET_MAX_ATTEMPTS)) {
            if ($user) {
                DB::table('password_reset_tokens')->where('email', $user->email)->delete();
            }

            return $this->pinResetLimitResponse($key);
        }

        return response()->json([
            'message' => 'Le code de vérification saisi est incorrect ou a expiré.',
        ], 422);
    }

    /**
     * Demande d'envoi d'un code de réinitialisation de PIN.
     */
    public function forgotPin(Request $request): JsonResponse
    {
        $request->validate([
            'identifiant' => ['required', 'string'],
        ]);

        $identifiant = trim($request->identifiant);

        if (! app()->environment('testing')
            && in_array(config('mail.default'), ['log', 'array'], true)) {
            return response()->json([
                'message' => 'L’envoi des e-mails de réinitialisation n’est pas configuré. Contactez l’assistance.',
            ], 503);
        }

        $error = null;
        $user = $this->resolveUserByIdentifiant($identifiant, $error);
        $limitKey = $this->pinResetAttemptKey($request, $identifiant, $user, 'send');

        if (RateLimiter::tooManyAttempts($limitKey, 3)) {
            return $this->pinResetLimitResponse($limitKey);
        }
        RateLimiter::hit($limitKey, 60 * 60);

        $genericMessage = 'Si un compte correspond à cet identifiant, un code de vérification a été envoyé.';
        if (! $user) {
            return response()->json(['message' => $genericMessage], 202);
        }

        $hasRealEmail = filter_var($user->email, FILTER_VALIDATE_EMAIL)
            && ! str_ends_with(strtolower($user->email), '@client.takapay.bj');
        if (! $hasRealEmail) {
            return response()->json(['message' => $genericMessage], 202);
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            ['token' => Hash::make($code), 'created_at' => now()]
        );

        try {
            Mail::to($user->email)->send(new ResetPinMail($user, $code));
        } catch (\Throwable $exception) {
            DB::table('password_reset_tokens')->where('email', $user->email)->delete();
            Log::warning('Échec de livraison du code de réinitialisation PIN.');

            return response()->json([
                'message' => 'Le code ne peut pas être envoyé pour le moment. Réessayez plus tard ou contactez l’assistance.',
            ], 503);
        }

        return response()->json(['message' => $genericMessage], 202);
    }

    /**
     * Vérification préalable du code secret reçu avant la saisie du nouveau PIN.
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
        $key = $this->pinResetAttemptKey($request, $request->identifiant, $user, 'verify');

        if (RateLimiter::tooManyAttempts($key, self::PIN_RESET_MAX_ATTEMPTS)) {
            return $this->pinResetLimitResponse($key);
        }

        if (! $user) {
            Hash::check($request->code, self::DUMMY_HASH);

            return $this->invalidPinResetCode($key, null);
        }

        if (! $this->pinResetCodeValid($user, $request->code)) {
            return $this->invalidPinResetCode($key, $user);
        }

        return response()->json([
            'valid' => true,
            'message' => 'Code vérifié avec succès.',
        ]);
    }

    /**
     * Validation atomique du code et enregistrement du nouveau code PIN.
     */
    public function resetPin(Request $request): JsonResponse
    {
        $request->validate([
            'identifiant' => ['required', 'string'],
            'code' => ['required', 'string', 'size:6'],
            'new_pin' => ['required', 'string', 'size:6', 'regex:/^\d{6}$/'],
            'confirm_pin' => ['required', 'string', 'same:new_pin'],
        ]);

        $error = null;
        $channel = null;
        $user = $this->resolveUserByIdentifiant($request->identifiant, $error, $channel);
        $key = $this->pinResetAttemptKey($request, $request->identifiant, $user, 'verify');

        if (RateLimiter::tooManyAttempts($key, self::PIN_RESET_MAX_ATTEMPTS)) {
            return $this->pinResetLimitResponse($key);
        }

        if (! $user) {
            Hash::check($request->code, self::DUMMY_HASH);

            return $this->invalidPinResetCode($key, null);
        }

        $resetSucceeded = DB::transaction(function () use ($request, $user) {
            $tokenRecord = DB::table('password_reset_tokens')
                ->where('email', $user->email)
                ->lockForUpdate()
                ->first();

            if (! $tokenRecord
                || ! $tokenRecord->created_at
                || ! Carbon::parse($tokenRecord->created_at)->addMinutes(10)->isFuture()
                || ! Hash::check($request->code, $tokenRecord->token)) {
                return false;
            }

            $user->password = $request->new_pin;
            $user->save();
            DB::table('password_reset_tokens')->where('email', $user->email)->delete();
            $user->tokens()->delete();

            return true;
        });

        if (! $resetSucceeded) {
            return $this->invalidPinResetCode($key, $user);
        }

        Cache::forget('pin_reset_'.$user->id);
        RateLimiter::clear($key);
        RateLimiter::clear($this->pinResetAttemptKey($request, $request->identifiant, $user, 'send'));
        $this->clearLoginAttempts($this->loginAttemptKey($request, $request->identifiant, $user));

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
            Log::warning('Impossible d\'enregistrer la notification in-app de code PIN modifié : '.$e->getMessage());
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
                Log::warning("Impossible d'envoyer l'e-mail de confirmation de PIN modifié à {$email} : ".$e->getMessage());
            }
        }
    }
}
