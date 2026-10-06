<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreDocumentRequest extends FormRequest
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
            //
            'utilisateur_id' => 'required|exists:users,id',
            'type' => 'required|string|max:100',
            'chemin' => 'required|string|max:255',
            'nom_origine' => 'required|string|max:255',
            'type_fichier' => 'required|string|max:100',
            'taille' => 'required|integer|min:0',
            'statut' => 'required|string|max:50',
            'date_modification' => 'nullable|date',
            'verifier_par' => 'nullable|exists:users,id',
            'motif' => 'nullable|string',
        ];
    }
}
