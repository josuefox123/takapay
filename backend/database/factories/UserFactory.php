<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'nom' => fake()->lastName(),
            'prenom' => fake()->firstName(),
            'email' => fake()->unique()->safeEmail(),
            'telephone' => '+229' . fake()->numerify('9#######'),
            'email_verified_at' => now(),
            'password' => 'password123', // haché automatiquement via 'password' => 'hashed' sur User model
            'photo_profil' => null,
            'role' => 'client',
            'latitude' => fake()->latitude(6.3, 6.5),
            'longitude' => fake()->longitude(2.3, 2.5),
            'statut_compte' => 'actif',
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * State pour les comptes d'administration
     */
    public function superAdmin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'super_admin',
        ]);
    }

    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'admin',
        ]);
    }

    public function livreur(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'livreur',
        ]);
    }
}
