<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTransactionRequest extends FormRequest
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
            'reference_externe' => ['sometimes', 'required', 'string', 'max:255'],
            'date' => ['sometimes', 'required', 'date'],
            'statut' => ['sometimes', 'required', 'string', 'max:255'],
            'montant' => ['sometimes', 'required', 'numeric', 'min:0'],
            'prestataire' => ['sometimes', 'required', 'string', 'max:255'],
            'type' => ['sometimes', 'required', 'string', 'max:255'],
            'moyen_paiement' => ['sometimes', 'required', 'string', 'max:255'],
            'devise' => ['sometimes', 'required', 'string', 'max:10'],
            'cagnotte_id' => ['sometimes', 'required', 'exists:cagnottes,id'],
            'echeance_id' => ['sometimes', 'nullable', 'exists:echeances,id'],
        ];
    }
}
