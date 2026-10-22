<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateSousCategorieRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nom' => ['sometimes', 'required', 'string', 'max:255'],
            'categorie_id' => ['sometimes', 'required', 'exists:categories,id'],
            'image' => ['nullable'],
            'nom_fichier' => ['nullable', 'string', 'max:255'],
        ];
    }
}
