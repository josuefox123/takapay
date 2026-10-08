<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTransactionRequest extends FormRequest
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
            'reference_externe' => ['required', 'string', 'max:255'],
            'date' => ['required', 'date'],
            'statut' => ['required', 'string', 'max:255'],
            'montant' => ['required', 'numeric', 'min:0'],
            'prestataire' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'max:255'],
            'moyen_paiement' => ['required', 'string', 'max:255'],
            'devise' => ['required', 'string', 'max:10'],
            'cagnotte_id' => ['required', 'exists:cagnottes,id'],
            'echeance_id' => ['nullable', 'exists:echeances,id'],
        ];
    }
}
