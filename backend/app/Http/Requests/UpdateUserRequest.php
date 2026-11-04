<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    /**
     * Seule l'administration peut modifier un compte.
     */
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
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
        $user = $this->route('user');
        $userId = is_object($user) ? $user->id : $user;

        // Seul un super_admin peut attribuer ou conserver un rôle super_admin
        $allowedRoles = ($this->user()?->role ?? '') === 'super_admin'
            ? 'in:client,livreur,admin,super_admin'
            : 'in:client,livreur,admin';

        return [
            'nom' => ['sometimes', 'required', 'string', 'min:2', 'max:100', 'regex:/^[\p{L}\s\-\'\.]+$/u'],
            'prenom' => ['sometimes', 'nullable', 'string', 'max:100', 'regex:/^[\p{L}\s\-\'\.]+$/u'],
            'email' => [
                'sometimes',
                'required',
                'email:rfc',
                'max:255',
                Rule::unique('users', 'email')->ignore($userId),
                function (string $attribute, mixed $value, \Closure $fail) {
                    $domain = substr(strrchr((string) $value, '@'), 1);
                    if ($domain && $domain !== 'client.takapay.bj' && $domain !== 'example.com' && $domain !== 'example.org') {
                        if (! checkdnsrr($domain, 'MX') && ! checkdnsrr($domain, 'A')) {
                            $fail("Le domaine de l'adresse e-mail (« {$domain} ») n'existe pas.");
                        }
                    }
                },
            ],
            'telephone' => ['sometimes', 'nullable', 'string', 'regex:/^\+?[0-9]{8,15}$/', Rule::unique('users', 'telephone')->ignore($userId)],
            'password' => ['sometimes', 'nullable', 'string', 'min:6'],
            'must_change_password' => ['sometimes', 'boolean'],
            'photo_profil' => ['sometimes', 'nullable', 'string', 'max:255'],
            'role' => ['sometimes', 'required', 'string', $allowedRoles],
            'latitude' => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
            'statut_compte' => ['sometimes', 'required', 'string', Rule::in(['actif', 'inactif', 'suspendu'])],
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
        ];
    }
}
