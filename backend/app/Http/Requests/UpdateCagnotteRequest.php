<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCagnotteRequest extends FormRequest
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
            'produit_id' => ['sometimes', 'required', 'exists:produits,id'],
            'prix_unitaire' => ['sometimes', 'required', 'numeric', 'min:0'],
            'montant_versé' => ['sometimes', 'required', 'numeric', 'min:0'],
            'moyen_paiement' => ['sometimes', 'required', 'string', 'max:255'],
            'statut' => ['sometimes', 'required', 'string', 'max:255'],
        ];
    }
}
