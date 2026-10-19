<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreNotificationRequest extends FormRequest
{
    /**
     * Seule l'administration peut envoyer une notification.
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
        return [
            'utilisateur_id' => 'required|exists:users,id',
            'cagnotte_id' => 'nullable|exists:cagnottes,id',
            'titre' => 'required|string|max:255',
            'message' => 'required|string',
            'type' => 'required|string|max:100',
            'statut' => ['sometimes', Rule::in(['non_lue', 'lue'])],
        ];
    }
}
