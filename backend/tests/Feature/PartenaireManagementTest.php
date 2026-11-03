<?php

namespace Tests\Feature;

use App\Models\Partenaire;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PartenaireManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_list_only_includes_active_partners_and_admin_list_requires_admin_access(): void
    {
        Partenaire::create([
            'nom' => 'Partenaire visible',
            'logo' => 'partenaires/visible.png',
            'ordre' => 2,
            'actif' => true,
        ]);
        Partenaire::create([
            'nom' => 'Partenaire masqué',
            'logo' => 'partenaires/masque.png',
            'ordre' => 1,
            'actif' => false,
        ]);

        $this->getJson('/api/partenaires')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.nom', 'Partenaire visible');

        $this->getJson('/api/admin/partenaires')->assertUnauthorized();

        $admin = User::factory()->admin()->create();
        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/partenaires')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_admin_can_create_update_and_delete_a_partner_logo(): void
    {
        Storage::fake('public');
        $admin = User::factory()->admin()->create();

        $created = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/partenaires', [
                'nom' => 'Partenaire test',
                'logo' => UploadedFile::fake()->image('logo.png'),
                'lien' => 'https://example.com',
                'ordre' => 3,
                'actif' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('data.nom', 'Partenaire test')
            ->json('data');

        $logoPath = $created['logo'];
        Storage::disk('public')->assertExists($logoPath);

        $this->putJson('/api/admin/partenaires/'.$created['id'], [
            'nom' => 'Partenaire modifié',
            'actif' => false,
        ])
            ->assertOk()
            ->assertJsonPath('data.nom', 'Partenaire modifié')
            ->assertJsonPath('data.actif', false);

        $this->deleteJson('/api/admin/partenaires/'.$created['id'])
            ->assertOk();

        $this->assertDatabaseMissing('partenaires', ['id' => $created['id']]);
        Storage::disk('public')->assertMissing($logoPath);
    }
}
