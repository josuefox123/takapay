<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Compte Super Admin
        User::firstOrCreate(
            ['email' => 'admin@takapay.bj'],
            [
                'nom' => 'Super',
                'prenom' => 'Admin',
                'telephone' => '+22990000000',
                'password' => env('SUPER_ADMIN_PASSWORD', 'password123'),
                'role' => 'super_admin',
                'statut_compte' => 'actif',
            ]
        );

        // 2. Compte Admin Gestionnaire
        User::firstOrCreate(
            ['email' => 'manager@takapay.bj'],
            [
                'nom' => 'Manager',
                'prenom' => 'TakaPay',
                'telephone' => '+22990000001',
                'password' => env('ADMIN_PASSWORD', 'password123'),
                'role' => 'admin',
                'statut_compte' => 'actif',
            ]
        );

        // 3. Quelques comptes utilisateurs et livreurs de démonstration
        User::factory(5)->create(['role' => 'client']);
        User::factory(2)->create(['role' => 'livreur']);
    }
}
