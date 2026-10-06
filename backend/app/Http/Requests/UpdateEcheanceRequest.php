<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateEcheanceRequest extends FormRequest
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
            'cagnotte_id' => ['sometimes', 'required', 'exists:cagnottes,id'],
            'numero' => ['sometimes', 'required', 'integer', 'min:1'],
            'date_prevue' => ['sometimes', 'required', 'date'],
            'montant_attendu' => ['sometimes', 'required', 'numeric', 'min:0'],
            'statut' => ['sometimes', 'required', 'string', 'max:255'],
        ];
    }
}
