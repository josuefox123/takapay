<?php

namespace Tests\Feature;

use App\Models\Categorie;
use App\Models\Commande;
use App\Models\ParametreProduit;
use App\Models\Produit;
use App\Models\SousCategorie;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class SuccessfulCagnottePaymentTest extends TestCase
{
    use RefreshDatabase;

    public function test_payment_cannot_start_without_an_account_linked_to_the_order(): void
    {
        config()->set('services.feexpay.shop_id', 'shop-test');
        config()->set('services.feexpay.api_key', 'key-test');
        User::factory()->create();

        $category = Categorie::create(['nom' => 'Test']);
        $subcategory = SousCategorie::create([
            'nom' => 'Test',
            'categorie_id' => $category->id,
        ]);
        $product = Produit::create([
            'sous_categorie_id' => $subcategory->id,
            'nom' => 'Mini brume',
            'stock' => 1,
        ]);

        $this->postJson('/api/payment/initiate', [
            'amount' => 1000,
            'produit_id' => $product->id,
            'type_paiement' => 'cagnotte',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Connectez-vous à votre compte avant de démarrer une cagnotte.');

        $this->assertDatabaseCount('commandes', 0);
        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_confirmed_first_payment_promotes_the_pending_transaction_and_starts_the_cagnotte(): void
    {
        config()->set('services.feexpay.shop_id', 'shop-test');
        config()->set('services.feexpay.api_key', 'key-test');
        config()->set('services.feexpay.mode', 'SANDBOX');
        Mail::fake();

        $user = User::factory()->create();
        $category = Categorie::create(['nom' => 'Test']);
        $subcategory = SousCategorie::create([
            'nom' => 'Test',
            'categorie_id' => $category->id,
        ]);
        $product = Produit::create([
            'sous_categorie_id' => $subcategory->id,
            'nom' => 'Mini brume',
            'stock' => 1,
        ]);
        ParametreProduit::create([
            'produit_id' => $product->id,
            'prix_minimum' => 1000,
            'prix_total' => 10000,
            'prix_cash' => 10000,
            'mode_paiement' => 'libre',
        ]);

        $initiation = $this->postJson('/api/payment/initiate', [
            'amount' => 1000,
            'produit_id' => $product->id,
            'type_paiement' => 'cagnotte',
            'user_id' => $user->id,
            'moyen_paiement' => 'MTN',
        ])->assertOk()->json();

        $this->assertDatabaseHas('transactions', [
            'reference_externe' => $initiation['reference'],
            'commande_id' => $initiation['commande_id'],
            'statut' => 'en_attente',
            'montant' => 1000,
        ]);

        Http::fake([
            '*single/status/tx-mini-brume' => Http::response([
                'data' => [
                    'status' => 'SUCCESSFUL',
                    'reference' => 'tx-mini-brume',
                    'transref' => 'tx-mini-brume',
                    'amount' => 1000,
                    'shop' => 'shop-test',
                    'callback_info' => [
                        'email' => $user->email,
                        'phone' => $user->telephone,
                    ],
                ],
            ]),
        ]);

        $confirmation = [
            'reference' => $initiation['reference'],
            'transaction_id' => 'tx-mini-brume',
            'reseau' => 'MTN',
        ];

        $this->postJson('/api/payment/confirm', $confirmation)
            ->assertOk()
            ->assertJsonPath('status', 'success');

        $this->assertDatabaseHas('commandes', [
            'id' => $initiation['commande_id'],
            'statut' => 'payee',
        ]);
        $this->assertDatabaseHas('cagnottes', [
            'produit_id' => $product->id,
            'utilisateur_id' => $user->id,
            'montant_verse' => 1000,
            'statut' => 'en_cours',
        ]);
        $this->assertDatabaseHas('transactions', [
            'reference_externe' => 'tx-mini-brume',
            'commande_id' => $initiation['commande_id'],
            'statut' => 'succes',
            'montant' => 1000,
        ]);
        $this->assertDatabaseMissing('transactions', [
            'reference_externe' => $initiation['reference'],
        ]);

        $this->postJson('/api/payment/confirm', $confirmation)
            ->assertOk()
            ->assertJsonPath('status', 'success');

        $this->assertDatabaseCount('cagnottes', 1);
        $this->assertDatabaseCount('transactions', 1);

        $admin = User::factory()->admin()->create();
        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/stats')
            ->assertOk()
            ->assertJsonPath('kpis.encaisse_ce_mois', 1000)
            ->assertJsonPath('kpis.cagnottes_actives', 1)
            ->assertJsonPath('derniers_versements.0.article', 'Mini brume');
    }

    public function test_provider_payment_for_another_customer_is_not_applied_to_the_order(): void
    {
        config()->set('services.feexpay.shop_id', 'shop-test');
        config()->set('services.feexpay.api_key', 'key-test');
        config()->set('services.feexpay.mode', 'SANDBOX');

        $user = User::factory()->create();
        $category = Categorie::create(['nom' => 'Test']);
        $subcategory = SousCategorie::create([
            'nom' => 'Test',
            'categorie_id' => $category->id,
        ]);
        $product = Produit::create([
            'sous_categorie_id' => $subcategory->id,
            'nom' => 'Mini brume',
            'stock' => 1,
        ]);
        ParametreProduit::create([
            'produit_id' => $product->id,
            'prix_minimum' => 1000,
            'prix_total' => 10000,
            'prix_cash' => 10000,
            'mode_paiement' => 'libre',
        ]);

        $initiation = $this->postJson('/api/payment/initiate', [
            'amount' => 1000,
            'produit_id' => $product->id,
            'type_paiement' => 'cagnotte',
            'user_id' => $user->id,
            'moyen_paiement' => 'MTN',
        ])->assertOk()->json();

        Http::fake([
            '*single/status/tx-other-customer' => Http::response([
                'data' => [
                    'status' => 'SUCCESSFUL',
                    'reference' => 'tx-other-customer',
                    'amount' => 1000,
                    'shop' => 'shop-test',
                    'callback_info' => [
                        'email' => 'another-customer@example.test',
                        'phone' => '+22900000000',
                    ],
                ],
            ]),
        ]);

        $this->postJson('/api/payment/confirm', [
            'reference' => $initiation['reference'],
            'transaction_id' => 'tx-other-customer',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('status', 'unverified');

        $this->assertDatabaseHas('commandes', [
            'id' => $initiation['commande_id'],
            'statut' => 'en_attente',
        ]);
        $this->assertDatabaseCount('cagnottes', 0);
    }

    public function test_confirmed_cash_payment_completes_the_order_without_an_undefined_email_variable(): void
    {
        config()->set('services.feexpay.shop_id', 'shop-test');
        config()->set('services.feexpay.api_key', 'key-test');
        config()->set('services.feexpay.mode', 'SANDBOX');
        Mail::fake();

        $user = User::factory()->create();
        $category = Categorie::create(['nom' => 'Test']);
        $subcategory = SousCategorie::create([
            'nom' => 'Test',
            'categorie_id' => $category->id,
        ]);
        $product = Produit::create([
            'sous_categorie_id' => $subcategory->id,
            'nom' => 'Huile Johnson',
            'stock' => 1,
        ]);
        ParametreProduit::create([
            'produit_id' => $product->id,
            'prix_minimum' => 50,
            'prix_total' => 150,
            'prix_cash' => 125,
            'mode_paiement' => 'libre',
        ]);

        $initiation = $this->postJson('/api/payment/initiate', [
            'amount' => 125,
            'produit_id' => $product->id,
            'type_paiement' => 'cash',
            'user_id' => $user->id,
            'moyen_paiement' => 'MTN',
        ])->assertOk()->json();

        Http::fake([
            '*single/status/tx-cash' => Http::response([
                'data' => [
                    'status' => 'SUCCESSFUL',
                    'reference' => 'tx-cash',
                    'transref' => 'tx-cash',
                    'amount' => 125,
                    'shop' => 'shop-test',
                    'callback_info' => [
                        'email' => $user->email,
                        'phone' => $user->telephone,
                    ],
                ],
            ]),
        ]);

        $confirmation = [
            'reference' => $initiation['reference'],
            'transaction_id' => 'tx-cash',
            'client_email' => $user->email,
        ];

        $this->postJson('/api/payment/confirm', $confirmation)
            ->assertOk()
            ->assertJsonPath('status', 'success');

        $this->assertDatabaseHas('commandes', [
            'id' => $initiation['commande_id'],
            'statut' => 'payee',
        ]);
        $this->assertDatabaseHas('cagnottes', [
            'produit_id' => $product->id,
            'utilisateur_id' => $user->id,
            'prix_unitaire' => 125,
            'montant_verse' => 125,
            'statut' => 'terminee',
        ]);
        $this->assertDatabaseHas('transactions', [
            'reference_externe' => 'tx-cash',
            'statut' => 'succes',
            'montant' => 125,
            'type' => 'commande_cash',
        ]);

        $this->postJson('/api/payment/confirm', $confirmation)
            ->assertOk()
            ->assertJsonPath('status', 'success');

        $this->assertDatabaseCount('cagnottes', 1);
        $this->assertDatabaseCount('transactions', 1);

        $admin = User::factory()->admin()->create();
        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/stats')
            ->assertOk()
            ->assertJsonPath('kpis.encaisse_ce_mois', 125)
            ->assertJsonPath('kpis.cagnottes_actives', 1)
            ->assertJsonPath('derniers_versements.0.article', 'Huile Johnson')
            ->assertJsonPath('derniers_versements.0.statut', 'succes');

        Commande::whereKey($initiation['commande_id'])->update([
            'statut' => 'livree',
        ]);

        $this->getJson('/api/admin/stats')
            ->assertOk()
            ->assertJsonPath('kpis.cagnottes_actives', 0);
    }
}
