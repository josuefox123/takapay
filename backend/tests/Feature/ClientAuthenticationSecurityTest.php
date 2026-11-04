<?php

namespace Tests\Feature;

use App\Mail\ResetPinMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ClientAuthenticationSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_lockout_escalates_after_each_three_failed_attempts(): void
    {
        $user = User::factory()->create(['password' => '123456']);

        for ($attempt = 1; $attempt <= 3; $attempt++) {
            $response = $this->postJson('/api/login', [
                'identifiant' => $user->email,
                'password' => '000000',
            ]);
        }

        $response->assertStatus(429)
            ->assertJsonPath('locked', true)
            ->assertJsonPath('retry_after', 900);

        $this->travel(15)->minutes();
        for ($attempt = 1; $attempt <= 3; $attempt++) {
            $response = $this->postJson('/api/login', [
                'identifiant' => $user->email,
                'password' => '000000',
            ]);
        }
        $response->assertStatus(429)->assertJsonPath('retry_after', 900);

        $this->travel(2)->days();
        for ($attempt = 1; $attempt <= 3; $attempt++) {
            $response = $this->postJson('/api/login', [
                'identifiant' => $user->email,
                'password' => '000000',
            ]);
        }
        $response->assertStatus(429)->assertJsonPath('retry_after', 2700);
    }

    public function test_successful_login_clears_the_failed_attempt_counter(): void
    {
        $user = User::factory()->create(['password' => '123456']);

        $this->postJson('/api/login', [
            'identifiant' => $user->email,
            'password' => '000000',
        ])->assertUnprocessable();

        $this->postJson('/api/login', [
            'identifiant' => $user->email,
            'password' => '123456',
        ])->assertOk();

        $this->postJson('/api/login', [
            'identifiant' => $user->email,
            'password' => '000000',
        ])->assertUnprocessable();
    }

    public function test_login_lockout_is_scoped_to_the_account_and_ip_pair(): void
    {
        $user = User::factory()->create(['password' => '123456']);

        for ($attempt = 1; $attempt <= 3; $attempt++) {
            $response = $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.10'])
                ->postJson('/api/login', [
                    'identifiant' => $user->email,
                    'password' => '000000',
                ]);
        }
        $response->assertStatus(429);

        $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.11'])
            ->postJson('/api/login', [
                'identifiant' => $user->email,
                'password' => '123456',
            ])
            ->assertOk();
    }

    public function test_pin_reset_sends_an_otp_stores_only_its_hash_and_consumes_it_once(): void
    {
        Mail::fake();
        $user = User::factory()->create(['password' => '123456']);

        $this->postJson('/api/forgot-pin', ['identifiant' => $user->telephone])
            ->assertStatus(202)
            ->assertJsonMissingPath('user_id');

        $code = null;
        Mail::assertSent(ResetPinMail::class, function (ResetPinMail $mail) use ($user, &$code): bool {
            $code = $mail->code;

            return $mail->user->is($user);
        });

        $token = DB::table('password_reset_tokens')->where('email', $user->email)->first();
        $this->assertNotNull($token);
        $this->assertNotSame($code, $token->token);
        $this->assertTrue(Hash::check($code, $token->token));
        $this->assertNull(Cache::get('pin_reset_'.$user->id));

        $this->postJson('/api/verify-pin-code', [
            'identifiant' => $user->telephone,
            'code' => $code,
        ])->assertOk()->assertJsonPath('valid', true);

        $this->postJson('/api/reset-pin', [
            'identifiant' => $user->telephone,
            'code' => $code,
            'new_pin' => '654321',
            'confirm_pin' => '654321',
        ])->assertOk();

        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $user->email]);
        $this->postJson('/api/reset-pin', [
            'identifiant' => $user->email,
            'code' => $code,
            'new_pin' => '111111',
            'confirm_pin' => '111111',
        ])->assertUnprocessable();

        $this->postJson('/api/login', [
            'identifiant' => $user->email,
            'password' => '654321',
        ])->assertOk();
    }

    public function test_phone_based_pin_reset_requires_a_real_email_and_never_uses_sms(): void
    {
        Mail::fake();
        $user = User::factory()->create(['email' => '12345678@client.takapay.bj']);

        $this->postJson('/api/forgot-pin', ['identifiant' => $user->telephone])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Aucune adresse e-mail personnelle n’est associée à ce compte. Contactez l’assistance pour récupérer votre accès.');

        Mail::assertNothingSent();
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $user->email]);
    }

    public function test_pin_reset_code_is_invalidated_after_four_failed_verifications(): void
    {
        Mail::fake();
        $user = User::factory()->create();
        $this->postJson('/api/forgot-pin', ['identifiant' => $user->email])->assertStatus(202);

        $actualCode = null;
        Mail::assertSent(ResetPinMail::class, function (ResetPinMail $mail) use (&$actualCode): bool {
            $actualCode = $mail->code;

            return true;
        });
        $wrongCode = $actualCode === '000000' ? '000001' : '000000';

        for ($attempt = 1; $attempt <= 4; $attempt++) {
            $response = $this->postJson('/api/verify-pin-code', [
                'identifiant' => $user->email,
                'code' => $wrongCode,
            ]);

            if ($attempt < 4) {
                $response->assertUnprocessable();
            }
        }

        $response->assertStatus(429)
            ->assertJsonPath('message', 'Trop de tentatives. Réessayez plus tard.');
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $user->email]);
    }
}
