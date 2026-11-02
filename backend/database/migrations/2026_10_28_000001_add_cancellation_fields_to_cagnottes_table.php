<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cagnottes', function (Blueprint $table) {
            $table->decimal('montant_remboursement', 12, 2)->nullable()->after('coordonnees_gps');
            $table->decimal('frais_annulation', 12, 2)->nullable()->after('montant_remboursement');
            $table->string('telephone_remboursement')->nullable()->after('frais_annulation');
            $table->timestamp('date_demande_annulation')->nullable()->after('telephone_remboursement');
        });
    }

    public function down(): void
    {
        Schema::table('cagnottes', function (Blueprint $table) {
            $table->dropColumn([
                'montant_remboursement',
                'frais_annulation',
                'telephone_remboursement',
                'date_demande_annulation',
            ]);
        });
    }
};
