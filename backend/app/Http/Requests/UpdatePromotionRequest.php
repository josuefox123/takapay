<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdatePromotionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    protected function prepareForValidation(): void
    {
        $merge = [];
        if ($this->has('titre') && is_string($this->titre)) {
            $merge['titre'] = trim(strip_tags($this->titre));
        }
        if ($this->has('description') && is_string($this->description)) {
            $merge['description'] = trim(strip_tags($this->description));
        }
        if (! empty($merge)) {
            $this->merge($merge);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'titre' => ['sometimes', 'nullable', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'image_popup' => ['sometimes', 'nullable'],
            'afficher_popup' => ['sometimes', 'nullable', 'boolean'],
            'produit_id' => ['sometimes', 'nullable', 'exists:produits,id'],
            'pourcentage_promo' => ['sometimes', 'required', 'numeric', 'min:0', 'max:100'],
            'date_debut' => ['sometimes', 'required', 'date'],
            'date_fin' => ['sometimes', 'required', 'date', 'after_or_equal:date_debut'],
            'statut' => ['sometimes', 'required', 'string', 'max:50'],
        ];
    }
}
