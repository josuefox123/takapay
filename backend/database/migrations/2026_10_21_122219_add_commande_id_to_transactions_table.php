<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('commande_id')
                ->nullable()
                ->after('cagnotte_id')
                ->constrained('commandes')
                ->nullOnDelete();

            $table->index('commande_id');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropForeign(['commande_id']);
            $table->dropIndex(['commande_id']);
            $table->dropColumn('commande_id');
        });
    }
};
