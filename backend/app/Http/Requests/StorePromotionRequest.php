<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StorePromotionRequest extends FormRequest
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
            'titre' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'image_popup' => ['nullable'],
            'afficher_popup' => ['nullable', 'boolean'],
            'produit_id' => ['nullable', 'exists:produits,id'],
            'pourcentage_promo' => ['required', 'numeric', 'min:0', 'max:100'],
            'date_debut' => ['required', 'date'],
            'date_fin' => ['required', 'date', 'after_or_equal:date_debut'],
            'statut' => ['required', 'string', 'max:50'],
        ];
    }
}
