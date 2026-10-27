<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    public function rules(): array
    {
        return [
            'reference_externe' => ['required', 'string', 'max:255', 'unique:transactions,reference_externe'],
            'date'              => ['required', 'date'],
            'statut'            => ['required', Rule::in(['succes', 'reussi', 'en_attente', 'echoue', 'rembourse'])],
            'montant'           => ['required', 'numeric', 'min:0.01'],
            'prestataire'       => ['required', 'string', 'max:255'],
            'type'              => ['required', 'string', 'max:255'],
            'moyen_paiement'    => ['required', 'string', 'max:255'],
            'devise'            => ['required', 'string', 'max:10'],
            'cagnotte_id'       => ['required', 'exists:cagnottes,id'],
            'commande_id'       => ['nullable', 'exists:commandes,id'],
            'echeance_id'       => ['nullable', 'exists:echeances,id'],
        ];
    }
}
