<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLivraisonRequest extends FormRequest
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
            'adresse_id' => ['sometimes', 'required', 'exists:adresses,id'],
            'livreur_id' => ['sometimes', 'nullable', 'exists:livreurs,id'],
            'statut' => ['sometimes', 'required', 'string', 'max:255'],
            'reference_suivi' => ['sometimes', 'nullable', 'string', 'max:255'],
            'frais_livraison' => ['sometimes', 'required', 'numeric', 'min:0'],
            'date_demande' => ['sometimes', 'required', 'date'],
            'date_prevue' => ['sometimes', 'nullable', 'date'],
            'date_livraison' => ['sometimes', 'nullable', 'date'],
        ];
    }
}
