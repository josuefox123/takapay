<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Catégories et sous-catégories
        $this->call(CategorySeeder::class);

        // 2. Compte Super Admin (mot de passe obligatoire en production, aléatoire sinon)
        $superAdminPassword = env('SUPER_ADMIN_PASSWORD') ?: Str::random(16);
        if (! env('SUPER_ADMIN_PASSWORD')) {
            $this->command->warn("SUPER_ADMIN_PASSWORD non défini — mot de passe généré : {$superAdminPassword}");
        }

        User::firstOrCreate(
            ['email' => 'admin@takapay.bj'],
            [
                'nom' => 'Super',
                'prenom' => 'Admin',
                'telephone' => '+22990000000',
                'password' => $superAdminPassword,
                'role' => 'super_admin',
                'statut_compte' => 'actif',
            ]
        );

        // 3. Compte Admin Gestionnaire
        $adminPassword = env('ADMIN_PASSWORD') ?: Str::random(16);
        if (! env('ADMIN_PASSWORD')) {
            $this->command->warn("ADMIN_PASSWORD non défini — mot de passe généré : {$adminPassword}");
        }

        User::firstOrCreate(
            ['email' => 'manager@takapay.bj'],
            [
                'nom' => 'Manager',
                'prenom' => 'TakaPay',
                'telephone' => '+22990000001',
                'password' => $adminPassword,
                'role' => 'admin',
                'statut_compte' => 'actif',
            ]
        );
    }
}
