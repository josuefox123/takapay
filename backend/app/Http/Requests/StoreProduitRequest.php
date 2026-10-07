<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreProduitRequest extends FormRequest
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
        'sous_categorie_id' => ['required', 'exists:sous_categories,id'],
        'nom' => ['required', 'string', 'max:255'],
        'description' => ['nullable', 'string'],
        'stock' => ['required', 'integer', 'min:0'],
        'duree' => ['required', 'integer', 'min:0'],
        'couleur' => ['nullable', 'string', 'max:100'],
    ];
    }
}
