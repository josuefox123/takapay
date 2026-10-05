<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'nom' => ['required', 'string', 'max:255'],
            'prenom' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'telephone' => ['nullable', 'string', 'max:20', 'unique:users,telephone'],
            'password' => ['required', 'string', 'min:8'],
            'photo_profil' => ['nullable', 'string', 'max:255'],
            'role' => ['nullable', 'string', 'in:client,livreur,admin'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'statut_compte' => ['nullable', 'string', 'in:actif,inactif,suspendu'],
        ];
    }
}
