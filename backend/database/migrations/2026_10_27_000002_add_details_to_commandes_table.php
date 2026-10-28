<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commandes', function (Blueprint $table) {
            $table->string('type_commande')->default('libre')->after('statut'); // 'cash' ou 'libre'
            $table->string('mode_paiement')->nullable()->after('type_commande'); // 'livraison', 'feexpay', etc.
            $table->string('statut_reception')->default('non_recu')->after('mode_paiement'); // 'non_recu', 'recu'
            $table->string('adresse_livraison')->nullable()->after('statut_reception');
            $table->string('telephone_livraison')->nullable()->after('adresse_livraison');
            $table->text('note_livraison')->nullable()->after('telephone_livraison');
            $table->string('coordonnees_gps')->nullable()->after('note_livraison');
        });
    }

    public function down(): void
    {
        Schema::table('commandes', function (Blueprint $table) {
            $table->dropColumn([
                'type_commande',
                'mode_paiement',
                'statut_reception',
                'adresse_livraison',
                'telephone_livraison',
                'note_livraison',
                'coordonnees_gps',
            ]);
        });
    }
};
