<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateParametreProduitRequest extends FormRequest
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
            'promotion_id' => ['sometimes', 'nullable', 'exists:promotions,id'],
            'reference' => ['sometimes', 'required', 'string', 'max:255'],
            'prix_minimum' => ['sometimes', 'required', 'numeric', 'min:0'],
            'prix_echelonne' => ['sometimes', 'required', 'numeric', 'min:0'],
            'prix_total' => ['sometimes', 'required', 'numeric', 'min:0'],
            'mode_paiement' => ['sometimes', 'required', 'string', 'max:100'],
            'date_echeance' => ['sometimes', 'nullable', 'date'],
            'frequence' => ['sometimes', 'nullable', 'string', 'max:100'],
            'seuil_livraison' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'prix_cash' => ['sometimes', 'required', 'numeric', 'min:0'],
        ];
    }
}
