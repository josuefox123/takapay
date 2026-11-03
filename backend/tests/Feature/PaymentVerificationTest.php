<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PaymentVerificationTest extends TestCase
{
    public function test_payment_initiation_fails_when_feexpay_is_not_configured(): void
    {
        config()->set('services.feexpay.shop_id', null);
        config()->set('services.feexpay.api_key', null);

        $this->postJson('/api/payment/initiate', [
            'type_paiement' => 'cagnotte',
        ])
            ->assertStatus(503)
            ->assertJsonPath('message', 'Le paiement FeexPay n’est pas configuré. Veuillez réessayer plus tard.');
    }

    public function test_client_success_claim_is_rejected_when_feexpay_says_payment_is_pending(): void
    {
        config()->set('services.feexpay.shop_id', 'shop-test');
        config()->set('services.feexpay.api_key', 'key-test');
        config()->set('services.feexpay.mode', 'SANDBOX');

        Http::fake([
            '*single/status/tx-test' => Http::response([
                'data' => [
                    'status' => 'PENDING',
                    'custom_id' => 'CMD_CAG_test',
                ],
            ]),
        ]);

        $this->postJson('/api/payment/confirm', [
            'reference' => 'CMD_CAG_test',
            'transaction_id' => 'tx-test',
            'status' => 'successful',
            'amount' => 100,
        ])
            ->assertStatus(422)
            ->assertJsonPath('status', 'pending');

        Http::assertSent(fn ($request) => str_contains($request->url(), '/single/status/tx-test'));
    }
}
