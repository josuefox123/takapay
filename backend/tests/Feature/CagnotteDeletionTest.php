<?php

namespace Tests\Feature;

use Tests\TestCase;

class CagnotteDeletionTest extends TestCase
{
    public function test_deleting_an_unpaid_cagnotte_requires_authentication(): void
    {
        $this->deleteJson('/api/cagnottes/1/non-payee')
            ->assertUnauthorized();
    }
}
