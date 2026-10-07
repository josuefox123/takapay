<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateProduitRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
  public function rules(): array
{
    return [
        'nom' => ['sometimes', 'required', 'string', 'max:255'],
        'description' => ['sometimes', 'nullable', 'string'],
        'stock' => ['sometimes', 'required', 'integer', 'min:0'],
        'duree' => ['sometimes', 'required', 'integer', 'min:0'],
        'couleur' => ['sometimes', 'nullable', 'string', 'max:100'],
    ];
}
}
