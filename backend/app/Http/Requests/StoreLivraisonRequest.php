<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLivraisonRequest extends FormRequest
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
            'adresse_id' => ['required', 'exists:adresses,id'],
            'livreur_id' => ['nullable', 'exists:livreurs,id'],
            'statut' => ['required', 'string', 'max:255'],
            'reference_suivi' => ['nullable', 'string', 'max:255'],
            'frais_livraison' => ['required', 'numeric', 'min:0'],
            'date_demande' => ['required', 'date'],
            'date_prevue' => ['nullable', 'date'],
            'date_livraison' => ['nullable', 'date'],
        ];
    }
}
