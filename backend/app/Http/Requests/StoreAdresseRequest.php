<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreAdresseRequest extends FormRequest
{
    /**
     * Tout utilisateur authentifié peut créer une adresse :
     * le propriétaire est forcé côté contrôleur.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'utilisateur_id' => $this->user()?->isAdmin()
                ? ['sometimes', 'exists:users,id']
                : ['prohibited'],
            'description' => 'required|string|max:255',
            'adresse' => 'required|string|max:255',
            'quartier' => 'required|string|max:255',
            'ville' => 'required|string|max:255',
            'pays' => 'required|string|max:255',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
        ];
    }
}
