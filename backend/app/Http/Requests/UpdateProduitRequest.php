<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateProduitRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'nom' => ['sometimes', 'required', 'string', 'max:255'],
            'sous_categorie_id' => ['sometimes', 'nullable', 'exists:sous_categories,id'],
            'description' => ['sometimes', 'nullable', 'string'],
            'stock' => ['sometimes', 'required', 'integer', 'min:0'],
            'duree' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'couleur' => ['sometimes', 'nullable', 'string'],
            'reference' => ['sometimes', 'nullable', 'string', 'max:255'],
            'prix_total' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'prix_minimum' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'prix_echelonne' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'prix_cash' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'mode_paiement' => ['sometimes', 'nullable', 'string', 'max:100'],
            'frequence' => ['sometimes', 'nullable', 'string', 'max:100'],
            'seuil_livraison' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'promotion_id' => ['sometimes', 'nullable', 'exists:promotions,id'],
            'images' => ['sometimes', 'nullable', 'array'],
        ];
    }
}
