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
            'nom' => ['sometimes', 'required', 'string', 'max:255'],
            'prenom' => ['sometimes', 'nullable', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
            'telephone' => ['sometimes', 'nullable', 'string', 'max:20', Rule::unique('users', 'telephone')->ignore($userId)],
            'password' => ['sometimes', 'required', 'string', 'min:8'],
            'photo_profil' => ['sometimes', 'nullable', 'string', 'max:255'],
            'role' => ['sometimes', 'required', 'string', $allowedRoles],
            'latitude' => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
            'statut_compte' => ['sometimes', 'required', 'string', Rule::in(['actif', 'inactif', 'suspendu'])],
        ];
    }
}
