<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCagnotteRequest extends FormRequest
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
            'produit_id' => ['required', 'exists:produits,id'],
            'prix_unitaire' => ['required', 'numeric', 'min:0'],
            'montant_verse' => ['required', 'numeric', 'min:0'],
            'moyen_paiement' => ['required', 'string', 'max:255'],
            'statut' => ['required', 'string', 'max:255'],
        ];
    }
}
