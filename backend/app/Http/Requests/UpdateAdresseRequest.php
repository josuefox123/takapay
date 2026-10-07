<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateAdresseRequest extends FormRequest
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
            'utilisateur_id' => 'sometimes|exist:users,id' ,
            'description' => 'sometimes|string|max:255' ,
            'adresse' => 'sometimes|string|max:255',
            'quartier' => 'sometimes|string|max:255',
            'ville' => 'sometimes|string|max:255',
            'pays' => 'sometimes|string|max:255',
            'latitude' => 'sometimes|nullable|numeric|between:-90,90',
            'longitude' => 'sometimes|nullable|numeric|between:-180,180',

        ];
    }
}
