<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Empêche l'enregistrement deux fois d'un même paiement externe.
     * (Les valeurs NULL restent autorisées plusieurs fois.)
     */
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->unique('reference_externe');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropUnique(['reference_externe']);
        });
    }
};
