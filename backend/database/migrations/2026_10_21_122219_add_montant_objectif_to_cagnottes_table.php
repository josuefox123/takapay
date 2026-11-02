<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cagnottes', function (Blueprint $table) {
            $table->decimal('montant_objectif', 12, 2)
                ->nullable()
                ->after('montant_verse');
        });
    }

    public function down(): void
    {
        Schema::table('cagnottes', function (Blueprint $table) {
            $table->dropColumn('montant_objectif');
        });
    }
};
