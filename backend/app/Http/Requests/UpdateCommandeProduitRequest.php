<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCommandeProduitRequest extends FormRequest
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
            'commande_id' => ['sometimes', 'required', 'exists:commandes,id'],
            'produit_id' => ['sometimes', 'required', 'exists:produits,id'],
            'quantite' => ['sometimes', 'required', 'integer', 'min:1'],
            'prix_unitaire' => ['sometimes', 'required', 'numeric', 'min:0'],
            'total' => ['sometimes', 'required', 'numeric', 'min:0'],
        ];
    }
}
