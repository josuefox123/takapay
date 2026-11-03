<?php

namespace Tests\Feature;

use App\Models\Cagnotte;
use App\Models\Categorie;
use App\Models\Produit;
use App\Models\SousCategorie;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CategoryArchiveTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_catalog_hides_archived_categories_and_subcategories(): void
    {
        $activeCategory = Categorie::create(['nom' => 'Électronique']);
        $archivedCategory = Categorie::create(['nom' => 'Mode', 'actif' => false]);
        SousCategorie::create(['nom' => 'Téléphones', 'categorie_id' => $activeCategory->id]);
        SousCategorie::create(['nom' => 'Vêtements', 'categorie_id' => $archivedCategory->id]);

        $this->getJson('/api/categories')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.nom', 'Électronique')
            ->assertJsonCount(1, 'data.0.sous_categories')
            ->assertJsonPath('data.0.sous_categories.0.nom', 'Téléphones');

        $this->getJson('/api/sous-categories')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.nom', 'Téléphones');
    }

    public function test_admin_catalog_includes_archived_categories_and_subcategories(): void
    {
        $category = Categorie::create(['nom' => 'Mode', 'actif' => false]);
        SousCategorie::create([
            'nom' => 'Vêtements',
            'categorie_id' => $category->id,
            'actif' => false,
        ]);
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/categories')
            ->assertOk()
            ->assertJsonPath('data.0.nom', 'Mode')
            ->assertJsonPath('data.0.actif', false)
            ->assertJsonPath('data.0.sous_categories.0.actif', false);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/sous-categories')
            ->assertOk()
            ->assertJsonPath('data.0.nom', 'Vêtements')
            ->assertJsonPath('data.0.actif', false);
    }

    public function test_archived_products_are_hidden_from_public_product_endpoints(): void
    {
        $activeCategory = Categorie::create(['nom' => 'Électronique']);
        $archivedCategory = Categorie::create(['nom' => 'Mode', 'actif' => false]);
        $activeSubCategory = SousCategorie::create([
            'nom' => 'Téléphones',
            'categorie_id' => $activeCategory->id,
        ]);
        $archivedSubCategory = SousCategorie::create([
            'nom' => 'Vêtements',
            'categorie_id' => $archivedCategory->id,
        ]);
        $activeProduct = Produit::create([
            'nom' => 'Téléphone test',
            'sous_categorie_id' => $activeSubCategory->id,
        ]);
        $archivedProduct = Produit::create([
            'nom' => 'Sac test',
            'sous_categorie_id' => $archivedSubCategory->id,
        ]);
        $archivedProductWithCagnotte = Produit::create([
            'nom' => 'Article avec cagnotte',
            'sous_categorie_id' => $archivedSubCategory->id,
        ]);
        Cagnotte::create([
            'produit_id' => $archivedProductWithCagnotte->id,
            'prix_unitaire' => 100,
        ]);
        $admin = User::factory()->admin()->create();

        $this->getJson('/api/produits')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment(['id' => $activeProduct->id])
            ->assertJsonFragment(['id' => $archivedProductWithCagnotte->id]);

        $this->getJson('/api/produits/'.$archivedProduct->id)
            ->assertNotFound();

        $this->getJson('/api/produits/'.$archivedProductWithCagnotte->id)
            ->assertOk()
            ->assertJsonPath('data.id', $archivedProductWithCagnotte->id);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/produits')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_admin_can_update_category_and_subcategory_names_and_images(): void
    {
        Storage::fake('public');
        $category = Categorie::create(['nom' => 'Électronique', 'image' => 'categories/old.png']);
        $newParent = Categorie::create(['nom' => 'Jouets']);
        $subCategory = SousCategorie::create([
            'nom' => 'Téléphones',
            'categorie_id' => $category->id,
            'image' => 'sous_categories/old.png',
        ]);
        Storage::disk('public')->put('categories/old.png', 'old image');
        Storage::disk('public')->put('sous_categories/old.png', 'old image');
        $admin = User::factory()->admin()->create();
        $image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/r9sAAAAASUVORK5CYII=';

        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/categories/'.$category->id, [
                'nom' => 'Électronique mise à jour',
                'image' => $image,
                'nom_fichier' => 'nouvelle-categorie.png',
            ])
            ->assertOk()
            ->assertJsonPath('data.nom', 'Électronique mise à jour');

        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/sous-categories/'.$subCategory->id, [
                'nom' => 'Smartphones mis à jour',
                'categorie_id' => $newParent->id,
                'image' => $image,
                'nom_fichier' => 'nouvelle-sous-categorie.png',
            ])
            ->assertOk()
            ->assertJsonPath('data.nom', 'Smartphones mis à jour')
            ->assertJsonPath('data.categorie_id', $newParent->id);

        $this->assertDatabaseHas('categories', [
            'id' => $category->id,
            'nom' => 'Électronique mise à jour',
            'image' => 'categories/nouvelle-categorie.png',
        ]);
        $this->assertDatabaseHas('sous_categories', [
            'id' => $subCategory->id,
            'nom' => 'Smartphones mis à jour',
            'categorie_id' => $newParent->id,
            'image' => 'sous_categories/nouvelle-sous-categorie.png',
        ]);
        Storage::disk('public')->assertExists('categories/nouvelle-categorie.png');
        Storage::disk('public')->assertExists('sous_categories/nouvelle-sous-categorie.png');
        Storage::disk('public')->assertMissing('categories/old.png');
        Storage::disk('public')->assertMissing('sous_categories/old.png');
    }
}
