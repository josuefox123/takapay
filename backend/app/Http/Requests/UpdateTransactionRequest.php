<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTransactionRequest extends FormRequest
{
    /**
     * Les transactions sont modifiables par l'administration uniquement.
     */
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $transaction = $this->route('transaction');
        $transactionId = is_object($transaction) ? $transaction->id : $transaction;

        return [
            'reference_externe' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('transactions', 'reference_externe')->ignore($transactionId),
            ],
            'date' => ['sometimes', 'required', 'date'],
            'statut' => ['sometimes', Rule::in(['succes', 'reussi', 'en_attente', 'echoue', 'rembourse'])],
            'montant' => ['sometimes', 'required', 'numeric', 'min:0.01'],
            'prestataire' => ['sometimes', 'required', 'string', 'max:255'],
            'type' => ['sometimes', 'required', 'string', 'max:255'],
            'moyen_paiement' => ['sometimes', 'required', 'string', 'max:255'],
            'devise' => ['sometimes', 'required', 'string', 'max:10'],
            'cagnotte_id' => ['sometimes', 'required', 'exists:cagnottes,id'],
            'echeance_id' => ['sometimes', 'nullable', 'exists:echeances,id'],
        ];
    }
}
