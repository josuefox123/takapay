<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEcheanceRequest extends FormRequest
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
            'cagnotte_id' => ['required', 'exists:cagnottes,id'],
            'numero' => ['required', 'integer', 'min:1'],
            'date_prevue' => ['required', 'date'],
            'montant_attendu' => ['required', 'numeric', 'min:0'],
            'statut' => ['required', 'string', 'max:255'],
        ];
    }
}
