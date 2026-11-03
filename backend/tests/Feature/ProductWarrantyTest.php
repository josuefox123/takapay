<?php

namespace Tests\Feature;

use App\Models\Categorie;
use App\Models\SousCategorie;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductWarrantyTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_and_update_a_product_warranty(): void
    {
        $admin = User::factory()->admin()->create();
        $category = Categorie::create(['nom' => 'Électronique']);
        $subcategory = SousCategorie::create([
            'nom' => 'Téléphones',
            'categorie_id' => $category->id,
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/produits', [
                'nom' => 'Téléphone test',
                'sous_categorie_id' => $subcategory->id,
                'description' => 'Téléphone de test',
                'stock' => 5,
                'duree' => 6,
                'garantie_duree' => 12,
                'garantie_unite' => 'mois',
                'prix_total' => 100000,
            ])
            ->assertCreated()
            ->assertJsonPath('data.garantie_duree', 12)
            ->assertJsonPath('data.garantie_unite', 'mois');

        $productId = $response->json('data.id');
        $this->assertDatabaseHas('produits', [
            'id' => $productId,
            'garantie_duree' => 12,
            'garantie_unite' => 'mois',
        ]);

        $this->putJson("/api/produits/{$productId}", [
            'garantie_duree' => 2,
            'garantie_unite' => 'ans',
        ])
            ->assertOk()
            ->assertJsonPath('data.garantie_duree', 2)
            ->assertJsonPath('data.garantie_unite', 'ans');

        $this->assertDatabaseHas('produits', [
            'id' => $productId,
            'garantie_duree' => 2,
            'garantie_unite' => 'ans',
        ]);
    }

    public function test_product_can_have_no_specific_warranty(): void
    {
        $admin = User::factory()->admin()->create();
        $category = Categorie::create(['nom' => 'Maison']);
        $subcategory = SousCategorie::create([
            'nom' => 'Décoration',
            'categorie_id' => $category->id,
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/produits', [
                'nom' => 'Objet sans garantie',
                'sous_categorie_id' => $subcategory->id,
                'stock' => 1,
                'duree' => 6,
                'prix_total' => 1000,
            ])
            ->assertCreated()
            ->assertJsonPath('data.garantie_duree', null)
            ->assertJsonPath('data.garantie_unite', null);

        $this->assertDatabaseHas('produits', [
            'id' => $response->json('data.id'),
            'garantie_duree' => null,
            'garantie_unite' => null,
        ]);
    }
}
