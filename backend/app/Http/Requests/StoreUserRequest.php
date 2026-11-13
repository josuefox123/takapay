<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    /**
     * Seule l'administration peut créer des comptes.
     */
    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user) {
            return false;
        }

        // Seul le super_admin est autorisé à créer des comptes administrateurs ou super_admin
        if ($this->has('role') && in_array($this->role, ['admin', 'super_admin'], true)) {
            return $user->role === 'super_admin';
        }

        return $user->isAdmin();
    }

    protected function prepareForValidation(): void
    {
        $merge = [];
        if ($this->has('nom') && is_string($this->nom)) {
            $merge['nom'] = trim(strip_tags($this->nom));
        }
        if ($this->has('prenom') && is_string($this->prenom)) {
            $merge['prenom'] = trim(strip_tags($this->prenom));
        }
        if ($this->has('email') && is_string($this->email)) {
            $merge['email'] = strtolower(trim($this->email));
        }
        if ($this->has('telephone') && is_string($this->telephone)) {
            $cleanedPhone = preg_replace('/[\s\-\.]/', '', trim($this->telephone));
            $merge['telephone'] = $cleanedPhone !== '' ? $cleanedPhone : null;
        }
        if (! empty($merge)) {
            $this->merge($merge);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        // Seul un super_admin peut créer un admin ou super_admin
        $allowedRoles = ($this->user()?->role ?? '') === 'super_admin'
            ? 'in:client,livreur,admin,super_admin'
            : 'in:client,livreur';

        return [
            'nom' => ['required', 'string', 'min:2', 'max:100', 'regex:/^[\p{L}\s\-\'\.]+$/u'],
            'prenom' => ['nullable', 'string', 'max:100', 'regex:/^[\p{L}\s\-\'\.]+$/u'],
            'email' => [
                'required',
                'email:rfc',
                'max:255',
                'unique:users,email',
                function (string $attribute, mixed $value, \Closure $fail) {
                    $domain = substr(strrchr((string) $value, '@'), 1);
                    if ($domain && $domain !== 'client.takapay.bj' && $domain !== 'example.com' && $domain !== 'example.org') {
                        if (! checkdnsrr($domain, 'MX') && ! checkdnsrr($domain, 'A')) {
                            $fail("Le domaine de l'adresse e-mail (« {$domain} ») n'existe pas.");
                        }
                    }
                },
            ],
            'telephone' => ['nullable', 'string', 'regex:/^\+?[0-9]{8,15}$/', 'unique:users,telephone'],
            'password' => ['required', 'string', 'min:8', 'regex:/[A-Z]/', 'regex:/[0-9]/'],
            'photo_profil' => ['nullable', 'string', 'max:255'],
            'role' => ['nullable', 'string', $allowedRoles],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'statut_compte' => ['nullable', 'string', Rule::in(['actif', 'inactif', 'suspendu'])],
            'must_change_password' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'nom.regex' => 'Le nom ne doit contenir que des lettres.',
            'prenom.regex' => 'Le prénom ne doit contenir que des lettres.',
            'telephone.regex' => 'Veuillez saisir un numéro de téléphone valide (8 à 15 chiffres).',
            'telephone.unique' => 'Ce numéro de téléphone est déjà utilisé par un autre compte.',
            'email.unique' => 'Cette adresse e-mail est déjà utilisée par un autre compte.',
            'password.min' => 'Le mot de passe doit comporter au moins 8 caractères.',
            'password.regex' => 'Le mot de passe doit contenir au moins une lettre majuscule et un chiffre.',
        ];
    }
}
