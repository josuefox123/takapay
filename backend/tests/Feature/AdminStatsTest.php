<?php

namespace Tests\Feature;

use App\Models\Commande;
use App\Models\Transaction;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminStatsTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_monthly_stats_exclude_previous_month_and_list_pending_payment_attempts(): void
    {
        Carbon::setTestNow('2026-11-02 12:00:00');
        $admin = User::factory()->admin()->create();

        Transaction::create([
            'reference_externe' => 'october-payment',
            'date' => '2026-10-31 12:00:00',
            'statut' => 'succes',
            'montant' => 9000,
            'prestataire' => 'FEEXPAY',
            'type' => 'commande_cash',
            'moyen_paiement' => 'MTN',
            'devise' => 'XOF',
        ]);
        Transaction::create([
            'reference_externe' => 'november-payment',
            'date' => '2026-11-01 12:00:00',
            'statut' => 'succes',
            'montant' => 1000,
            'prestataire' => 'FEEXPAY',
            'type' => 'commande_cash',
            'moyen_paiement' => 'MTN',
            'devise' => 'XOF',
        ]);
        Transaction::create([
            'reference_externe' => 'pending-payment',
            'date' => '2026-11-02 11:00:00',
            'statut' => 'en_attente',
            'montant' => 500,
            'prestataire' => 'FEEXPAY',
            'type' => 'commande_cagnotte',
            'moyen_paiement' => 'MTN',
            'devise' => 'XOF',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/stats')
            ->assertOk();

        $response->assertJsonPath('kpis.encaisse_ce_mois', 1000);
        $response->assertJsonPath('recouvrement.total_mois', 1000);
        $response->assertJsonPath('recouvrement.semaines.0.periode', '01/11 au 01/11');
        $response->assertJsonPath('derniers_versements.0.statut', 'en_attente');

        $this->assertSame('pending-payment', $response->json('derniers_versements.0.commande_reference'));
    }

    public function test_dashboard_lists_pending_orders_without_a_transaction(): void
    {
        Carbon::setTestNow('2026-11-02 12:00:00');
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();
        Commande::create([
            'utilisateur_id' => $user->id,
            'reference' => 'CMD_PENDING',
            'statut' => 'en_attente',
            'type_commande' => 'libre',
            'prix_total' => 1000,
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/stats')
            ->assertOk();

        $response->assertJsonPath('derniers_versements.0.commande_reference', 'CMD_PENDING');
        $response->assertJsonPath('derniers_versements.0.statut', 'en_attente');
        $response->assertJsonPath('kpis.encaisse_ce_mois', 0);
        $response->assertJsonPath('kpis.cagnottes_actives', 0);
    }
}
