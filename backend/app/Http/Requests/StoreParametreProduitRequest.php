<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreParametreProduitRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
          return [
            'produit_id' => ['required', 'exists:produits,id'],
            'promotion_id' => ['nullable', 'exists:promotions,id'],
            'reference' => ['required', 'string', 'max:255'],
            'prix_minimum' => ['required', 'numeric', 'min:0'],
            'prix_echelonne' => ['required', 'numeric', 'min:0'],
            'prix_total' => ['required', 'numeric', 'min:0'],
            'mode_paiement' => ['required', 'string', 'max:100'],
            'date_echeance' => ['nullable', 'date'],
            'frequence' => ['nullable', 'string', 'max:100'],
            'seuil_livraison' => ['nullable', 'numeric', 'min:0'],
            'prix_cash' => ['required', 'numeric', 'min:0'],
        ];
    }
}
