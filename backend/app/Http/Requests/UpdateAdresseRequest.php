<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateAdresseRequest extends FormRequest
{
    /**
     * Seul le propriétaire de l'adresse ou un administrateur peut la modifier.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        if (! $user) {
            return false;
        }

        if ($user->isAdmin()) {
            return true;
        }

        $adresse = $this->route('adresse');

        return $adresse !== null && (int) $adresse->utilisateur_id === (int) $user->id;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // Une adresse ne peut pas être réaffectée à un autre utilisateur
            'utilisateur_id' => 'prohibited',
            'description' => 'sometimes|string|max:255',
            'adresse' => 'sometimes|string|max:255',
            'quartier' => 'sometimes|string|max:255',
            'ville' => 'sometimes|string|max:255',
            'pays' => 'sometimes|string|max:255',
            'latitude' => 'sometimes|nullable|numeric|between:-90,90',
            'longitude' => 'sometimes|nullable|numeric|between:-180,180',
        ];
    }
}
