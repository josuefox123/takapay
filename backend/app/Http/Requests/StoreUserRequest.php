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
        return $this->user()?->isAdmin() ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        // Seul un super_admin peut créer un super_admin
        $allowedRoles = ($this->user()?->role ?? '') === 'super_admin'
            ? 'in:client,livreur,admin,super_admin'
            : 'in:client,livreur,admin';

        return [
            'nom' => ['required', 'string', 'max:255'],
            'prenom' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'telephone' => ['nullable', 'string', 'max:20', 'unique:users,telephone'],
            'password' => ['required', 'string', 'min:8'],
            'photo_profil' => ['nullable', 'string', 'max:255'],
            'role' => ['nullable', 'string', $allowedRoles],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'statut_compte' => ['nullable', 'string', Rule::in(['actif', 'inactif', 'suspendu'])],
        ];
    }
}
